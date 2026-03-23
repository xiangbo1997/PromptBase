import type { MultipartFile } from '@fastify/multipart';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ImportExportJobType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateExportJobDto } from './dto/create-export-job.dto';
import type { CreateImportJobDto } from './dto/create-import-job.dto';
import { ImportExportStorageService } from './import-export.storage';
import { EXPORT_QUEUE } from './processors/export.processor';
import { IMPORT_QUEUE } from './processors/import.processor';

const IMPORT_BUCKET = 'promptbase-imports';
const EXPORT_BUCKET = 'promptbase-exports';

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImportExportStorageService,
    @InjectQueue(IMPORT_QUEUE) private readonly importQueue: Queue,
    @InjectQueue(EXPORT_QUEUE) private readonly exportQueue: Queue,
  ) {}

  private readonly safeUserSelect = { id: true, email: true, displayName: true } as const;

  async createImportJob(orgId: string, requestedById: string, dto: CreateImportJobDto, file: MultipartFile) {
    const job = await this.prisma.importExportJob.create({
      data: {
        orgId,
        requestedById,
        type: ImportExportJobType.IMPORT,
        format: dto.format,
        options: { originalFilename: file.filename, mimeType: file.mimetype },
      },
    });

    try {
      const extension = dto.format === 'JSON' ? 'json' : dto.format === 'CSV' ? 'csv' : 'md';
      const sourceUri = await this.storage.uploadObject(
        IMPORT_BUCKET,
        `${orgId}/${job.id}/source.${extension}`,
        await file.toBuffer(),
        file.mimetype || 'application/octet-stream',
      );

      await this.prisma.importExportJob.update({ where: { id: job.id }, data: { sourceUri } });
      await this.importQueue.add('execute-import', { orgId, jobId: job.id });
      return this.buildResponse({ ...job, sourceUri });
    } catch (error) {
      await this.prisma.importExportJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Failed to upload import source', completedAt: new Date() },
      });
      throw error;
    }
  }

  async createExportJob(orgId: string, requestedById: string, dto: CreateExportJobDto) {
    const job = await this.prisma.importExportJob.create({
      data: {
        orgId,
        requestedById,
        type: ImportExportJobType.EXPORT,
        format: dto.format,
        options: { folderId: dto.folderId ?? null, tagId: dto.tagId ?? null, search: dto.search ?? null, targetBucket: EXPORT_BUCKET },
      },
    });

    await this.exportQueue.add('execute-export', { orgId, jobId: job.id });
    return this.buildResponse(job);
  }

  async findJob(orgId: string, jobId: string) {
    const job = await this.prisma.importExportJob.findFirst({
      where: { id: jobId, orgId },
      include: { requestedBy: { select: this.safeUserSelect } },
    });
    if (!job) throw new NotFoundException('Import/export job not found');
    return this.buildResponse(job);
  }

  private buildResponse<T>(data: T) {
    return { success: true, data, meta: { timestamp: new Date().toISOString() } };
  }
}
