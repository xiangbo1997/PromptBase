import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { type Prisma, TestRunStatus } from '@prisma/client';
import type { ModelProviderProtocol } from '@promptbase/shared';
import { Job } from 'bullmq';
import { ModelProviderService } from '../model-provider/model-provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterFactory } from './adapters/adapter.factory';
import type { ChatMessage, ModelInvocationMetrics } from './adapters/model-adapter';
import { TestRunService } from './test-run.service';
import { TEST_RUN_QUEUE } from './test-run.constants';

export { TEST_RUN_QUEUE };

@Injectable()
@Processor(TEST_RUN_QUEUE, { concurrency: 3 })
export class TestRunProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelProviderService: ModelProviderService,
    private readonly adapterFactory: AdapterFactory,
    private readonly testRunService: TestRunService,
  ) {
    super();
  }

  async process(job: Job<{ orgId: string; testRunId: string }>) {
    const run = await this.prisma.testRun.findFirst({
      where: { id: job.data.testRunId, orgId: job.data.orgId },
      include: { promptVersion: true },
    });

    if (!run) throw new Error('Test run not found');

    await this.prisma.testRun.update({
      where: { id: run.id },
      data: { status: TestRunStatus.RUNNING, startedAt: new Date(), errorMessage: null },
    });
    await this.testRunService.publish(run.id, 'status', { status: 'RUNNING' });

    try {
      const provider = await this.resolveProvider(run.orgId, run.input, run.provider, run.model);
      const adapter = this.adapterFactory.getAdapter(provider.provider);
      const renderedPrompt = this.getRenderedPrompt(run.input, run.promptVersion.content);
      const messages: ChatMessage[] = [{ role: 'user', content: renderedPrompt }];

      const iterator = adapter.chat(messages, {
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl ?? undefined,
        model: run.model,
      });

      let output = '';
      let metrics: ModelInvocationMetrics = { latencyMs: 0 };

      while (true) {
        const next = await iterator.next();
        if (next.done) {
          metrics = next.value;
          break;
        }
        if (next.value.length > 0) {
          output += next.value;
          await this.testRunService.publish(run.id, 'chunk', { content: next.value });
        }
      }

      await this.prisma.testRun.update({
        where: { id: run.id },
        data: {
          status: TestRunStatus.SUCCEEDED,
          output: { text: output } as Prisma.InputJsonValue,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      await this.testRunService.publish(run.id, 'completed', {
        status: 'SUCCEEDED',
        output: { text: output },
        metrics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown model execution error';

      await this.prisma.testRun.update({
        where: { id: run.id },
        data: { status: TestRunStatus.FAILED, errorMessage: message, completedAt: new Date() },
      });
      await this.testRunService.publish(run.id, 'failed', { status: 'FAILED', errorMessage: message });
    }
  }

  private getRenderedPrompt(input: unknown, fallbackContent: string): string {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      const rendered = (input as Record<string, unknown>).renderedPrompt;
      if (typeof rendered === 'string' && rendered.length > 0) return rendered;
    }
    return fallbackContent;
  }

  private async resolveProvider(orgId: string, input: unknown, fallbackProvider: string, model: string) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      const providerId = (input as Record<string, unknown>).providerId;
      if (typeof providerId === 'string' && providerId.length > 0) {
        return this.modelProviderService.resolveActiveProviderById(orgId, providerId, model);
      }
    }

    return this.modelProviderService.resolveActiveProvider(
      orgId,
      fallbackProvider as ModelProviderProtocol,
      model,
    );
  }
}
