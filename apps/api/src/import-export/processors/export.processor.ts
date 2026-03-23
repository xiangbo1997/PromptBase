import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma, type ImportExportJob } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportExportStorageService } from '../import-export.storage';
import { generateExportPayload, type PortablePromptRecord } from '../import-export.utils';

export const EXPORT_QUEUE = 'export-jobs';
const EXPORT_BUCKET = 'promptbase-exports';

@Injectable()
@Processor(EXPORT_QUEUE, { concurrency: 2 })
export class ExportProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImportExportStorageService,
  ) {
    super();
  }

  async process(job: Job<{ orgId: string; jobId: string }>) {
    const exportJob = await this.prisma.importExportJob.findFirst({
      where: { id: job.data.jobId, orgId: job.data.orgId, type: 'EXPORT' },
    });
    if (!exportJob) throw new Error('Export job not found');

    await this.prisma.importExportJob.update({
      where: { id: exportJob.id },
      data: { status: 'RUNNING', startedAt: new Date(), errorMessage: null },
    });

    try {
      const prompts = await this.queryPrompts(exportJob);
      const payload = generateExportPayload(exportJob.format, prompts);
      const targetUri = await this.storage.uploadObject(
        EXPORT_BUCKET,
        `${exportJob.orgId}/${exportJob.id}/export.${payload.extension}`,
        Buffer.from(payload.body, 'utf8'),
        payload.contentType,
      );

      await this.prisma.importExportJob.update({
        where: { id: exportJob.id },
        data: { status: 'SUCCEEDED', targetUri, summary: { exportedCount: prompts.length } as Prisma.InputJsonValue, completedAt: new Date() },
      });
    } catch (error) {
      await this.prisma.importExportJob.update({
        where: { id: exportJob.id },
        data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Export job failed', completedAt: new Date() },
      });
      throw error;
    }
  }

  private async queryPrompts(job: ImportExportJob): Promise<PortablePromptRecord[]> {
    const options = job.options && typeof job.options === 'object' && !Array.isArray(job.options)
      ? (job.options as Record<string, unknown>)
      : {};

    const folderId = typeof options.folderId === 'string' ? options.folderId : undefined;
    const tagId = typeof options.tagId === 'string' ? options.tagId : undefined;
    const search = typeof options.search === 'string' ? options.search : undefined;

    const prompts = await this.prisma.prompt.findMany({
      where: {
        orgId: job.orgId,
        isArchived: false,
        ...(folderId ? { folderId } : {}),
        ...(tagId ? { tagRelations: { some: { tagId } } } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
      include: { currentVersion: true, tagRelations: { include: { tag: true } }, folder: true },
      orderBy: { updatedAt: 'desc' },
    });

    return prompts
      .filter((p) => p.currentVersion)
      .map((p) => ({
        title: p.title,
        description: p.description,
        content: p.currentVersion!.content,
        tags: p.tagRelations.map((r) => r.tag.name),
        folder: p.folder?.name ?? null,
      }));
  }
}
