import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportExportStorageService } from '../import-export.storage';
import { extractVariables, parseImportPayload, type PortablePromptRecord } from '../import-export.utils';

export const IMPORT_QUEUE = 'import-jobs';

@Injectable()
@Processor(IMPORT_QUEUE, { concurrency: 2 })
export class ImportProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImportExportStorageService,
  ) {
    super();
  }

  async process(job: Job<{ orgId: string; jobId: string }>) {
    const importJob = await this.prisma.importExportJob.findFirst({
      where: { id: job.data.jobId, orgId: job.data.orgId, type: 'IMPORT' },
    });

    if (!importJob?.sourceUri) throw new Error('Import job source not found');

    await this.prisma.importExportJob.update({
      where: { id: importJob.id },
      data: { status: 'RUNNING', startedAt: new Date(), errorMessage: null },
    });

    try {
      const buffer = await this.storage.downloadObject(importJob.sourceUri);
      const records = parseImportPayload(importJob.format, buffer.toString('utf8'));
      let importedCount = 0;

      for (const record of records) {
        await this.prisma.$transaction(async (tx) => {
          await this.importPrompt(tx, importJob.orgId, importJob.requestedById, record);
        });
        importedCount += 1;
      }

      await this.prisma.importExportJob.update({
        where: { id: importJob.id },
        data: { status: 'SUCCEEDED', summary: { importedCount } as Prisma.InputJsonValue, completedAt: new Date() },
      });
    } catch (error) {
      await this.prisma.importExportJob.update({
        where: { id: importJob.id },
        data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Import job failed', completedAt: new Date() },
      });
      throw error;
    }
  }

  private async importPrompt(tx: Prisma.TransactionClient | PrismaClient, orgId: string, userId: string, record: PortablePromptRecord) {
    const folderId = await this.resolveFolder(tx, orgId, userId, record.folder);
    const tagIds = await this.resolveTags(tx, orgId, record.tags);
    const variables = extractVariables(record.content);

    const prompt = await tx.prompt.create({
      data: {
        orgId,
        title: record.title,
        description: record.description,
        folderId,
        isTemplate: false,
        variables: variables as Prisma.InputJsonValue,
        createdById: userId,
        updatedById: userId,
      },
    });

    const version = await tx.promptVersion.create({
      data: {
        orgId,
        promptId: prompt.id,
        versionNumber: 1,
        title: record.title,
        content: record.content,
        snapshot: { title: record.title, content: record.content, description: record.description, folderId, tagIds, isTemplate: false, variables } as Prisma.InputJsonValue,
        variables: variables as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    if (tagIds.length > 0) {
      await tx.promptTagRelation.createMany({
        data: tagIds.map((tagId) => ({ orgId, promptId: prompt.id, tagId })),
        skipDuplicates: true,
      });
    }

    await tx.prompt.update({ where: { id: prompt.id }, data: { currentVersionId: version.id } });
  }

  private async resolveFolder(tx: Prisma.TransactionClient | PrismaClient, orgId: string, userId: string, folderName: string | null) {
    if (!folderName) return null;
    const existing = await tx.folder.findFirst({ where: { orgId, name: folderName }, select: { id: true } });
    if (existing) return existing.id;
    const id = randomUUID();
    const created = await tx.folder.create({ data: { id, orgId, name: folderName, materializedPath: `/${id}`, createdById: userId } });
    return created.id;
  }

  private async resolveTags(tx: Prisma.TransactionClient | PrismaClient, orgId: string, tagNames: string[]) {
    const resolved: string[] = [];
    for (const tagName of tagNames) {
      const slug = tagName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tag';
      const existing = await tx.tag.findFirst({ where: { orgId, slug }, select: { id: true } });
      if (existing) { resolved.push(existing.id); }
      else {
        const created = await tx.tag.create({ data: { orgId, name: tagName, slug }, select: { id: true } });
        resolved.push(created.id);
      }
    }
    return resolved;
  }
}
