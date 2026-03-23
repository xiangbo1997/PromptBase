import { ImportExportFormat } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateExportJobDto {
  @IsEnum(ImportExportFormat)
  format!: ImportExportFormat;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
