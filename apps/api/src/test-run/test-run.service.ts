import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { PromptStatus, type Prisma } from '@prisma/client';
import { ModelProviderService } from '../model-provider/model-provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { TEST_RUN_QUEUE } from './test-run.constants';

@Injectable()
export class TestRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelProviderService: ModelProviderService,
    @InjectQueue(TEST_RUN_QUEUE) private readonly queue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(orgId: string, requestedById: string, dto: CreateTestRunDto) {
    const promptVersion = await this.resolvePromptVersion(orgId, requestedById, dto);

    const provider = await this.modelProviderService.resolveActiveProviderById(orgId, dto.providerId, dto.model);

    const renderedPrompt = this.renderTemplate(promptVersion.content, dto.variables ?? {});
    const run = await this.prisma.testRun.create({
      data: {
        orgId,
        promptId: promptVersion.promptId,
        promptVersionId: promptVersion.id,
        requestedById,
        provider: provider.provider,
        model: dto.model,
        input: {
          providerId: provider.id,
          providerName: provider.name,
          variables: dto.variables ?? {},
          renderedPrompt,
          messages: [{ role: 'user', content: renderedPrompt }],
        },
      },
    });

    await this.queue.add('execute', { orgId, testRunId: run.id });
    await this.publish(run.id, 'status', { status: 'QUEUED' });

    return run;
  }

  private async resolvePromptVersion(orgId: string, requestedById: string, dto: CreateTestRunDto) {
    if (dto.promptId && dto.promptVersionId) {
      const promptVersion = await this.prisma.promptVersion.findFirst({
        where: { id: dto.promptVersionId, orgId, promptId: dto.promptId },
        select: { id: true, content: true, promptId: true },
      });

      if (!promptVersion) {
        throw new NotFoundException('Prompt version not found');
      }

      return promptVersion;
    }

    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Prompt content is required when prompt version is not provided');
    }

    return this.createPlaygroundPromptVersion(orgId, requestedById, content);
  }

  private async createPlaygroundPromptVersion(orgId: string, requestedById: string, content: string) {
    const title = this.buildPlaygroundTitle(content);

    // Playground 运行需要落一条隐藏版本记录，既复用现有队列链路，也避免向前端暴露伪造 UUID。
    return this.prisma.$transaction(async (tx) => {
      const prompt = await tx.prompt.create({
        data: {
          orgId,
          title,
          description: 'Temporary prompt generated from playground',
          status: PromptStatus.ARCHIVED,
          isArchived: true,
          createdById: requestedById,
          updatedById: requestedById,
        },
        select: { id: true, title: true },
      });

      const promptVersion = await tx.promptVersion.create({
        data: {
          orgId,
          promptId: prompt.id,
          versionNumber: 1,
          title: prompt.title,
          content,
          snapshot: {
            title: prompt.title,
            content,
            description: 'Temporary prompt generated from playground',
            folderId: null,
            tagIds: [],
            isTemplate: false,
            variables: [],
          } as Prisma.InputJsonValue,
          variables: [] as Prisma.InputJsonValue,
          changeSummary: 'Playground temporary execution',
          createdById: requestedById,
        },
        select: { id: true, content: true, promptId: true },
      });

      await tx.prompt.update({
        where: { id: prompt.id },
        data: { currentVersionId: promptVersion.id },
      });

      return promptVersion;
    });
  }

  async findOne(orgId: string, id: string) {
    return this.findRunOrThrow(orgId, id);
  }

  async stream(orgId: string, id: string, reply: FastifyReply) {
    const run = await this.findRunOrThrow(orgId, id);
    const subscriber = this.redis.duplicate();
    const channel = this.getChannel(id);
    let closed = false;

    const cleanup = async () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      try { await subscriber.unsubscribe(channel); } catch { /* ignore */ }
      subscriber.disconnect();
    };

    const write = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    reply.hijack();
    const originHeader = reply.request.headers.origin;
    const corsHeaders =
      typeof originHeader === 'string' && originHeader.length > 0
        ? {
            // hijack 后需要手动补 CORS 头，否则浏览器会拦截 SSE 流。
            'Access-Control-Allow-Origin': originHeader,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
          }
        : {};

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders,
    });

    write('status', {
      status: run.status,
      output: run.output,
      metrics: run.metrics,
      errorMessage: run.errorMessage,
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(': ping\n\n');
    }, 15_000);

    subscriber.on('message', async (_ch, message) => {
      const payload = JSON.parse(message) as { event: string; data: unknown };
      write(payload.event, payload.data);

      if (payload.event === 'completed' || payload.event === 'failed') {
        await cleanup();
        reply.raw.end();
      }
    });

    reply.raw.on('close', () => { void cleanup(); });
    await subscriber.subscribe(channel);
  }

  async publish(runId: string, event: string, data: unknown) {
    await this.redis.publish(this.getChannel(runId), JSON.stringify({ event, data }));
  }

  private async findRunOrThrow(orgId: string, id: string) {
    const run = await this.prisma.testRun.findFirst({
      where: { id, orgId },
      include: {
        requestedBy: { select: { id: true, email: true, displayName: true } },
      },
    });

    if (!run) throw new NotFoundException('Test run not found');
    return run;
  }

  private getChannel(id: string) {
    return `test-run:${id}`;
  }

  private renderTemplate(content: string, variables: Record<string, string>) {
    let rendered = content;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(
        new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*}}`, 'g'),
        value,
      );
    }
    return rendered;
  }

  private buildPlaygroundTitle(content: string) {
    const firstLine = content.split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? 'Untitled';
    return `Playground Draft: ${firstLine.slice(0, 60)}`;
  }
}
