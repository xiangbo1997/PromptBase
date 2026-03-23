import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';
import { ImportExportStorageService } from './import-export.storage';
import { ExportProcessor, EXPORT_QUEUE } from './processors/export.processor';
import { ImportProcessor, IMPORT_QUEUE } from './processors/import.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: IMPORT_QUEUE, defaultJobOptions: { removeOnComplete: 50, removeOnFail: 50 } },
      { name: EXPORT_QUEUE, defaultJobOptions: { removeOnComplete: 50, removeOnFail: 50 } },
    ),
    PrismaModule,
    AuthModule,
    OrgModule,
  ],
  controllers: [ImportExportController],
  providers: [ImportExportService, ImportExportStorageService, ImportProcessor, ExportProcessor],
  exports: [ImportExportService],
})
export class ImportExportModule {}
