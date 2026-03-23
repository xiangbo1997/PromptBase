import { IsEnum } from 'class-validator';
import { ImportExportFormat } from '@prisma/client';

export class CreateImportJobDto {
  @IsEnum(ImportExportFormat)
  format!: ImportExportFormat;
}
