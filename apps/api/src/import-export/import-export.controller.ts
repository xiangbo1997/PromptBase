import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { CreateExportJobDto } from './dto/create-export-job.dto';
import { CreateImportJobDto } from './dto/create-import-job.dto';
import { ImportExportService } from './import-export.service';

@Controller('orgs/:orgId')
@UseGuards(AuthGuard, OrgMemberGuard)
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Post('import-jobs')
  async createImportJob(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: FastifyRequest,
  ) {
    const file = await (request as FastifyRequest & { file: () => Promise<MultipartFile | undefined> }).file();
    if (!file) throw new BadRequestException('Import file is required');

    const formatField = file.fields.format as { value?: string } | Array<{ value?: string }> | undefined;
    const formatValue = Array.isArray(formatField) ? formatField[0]?.value : formatField?.value;
    const dto = plainToInstance(CreateImportJobDto, { format: formatValue });
    const errors = await validate(dto);
    if (errors.length > 0) throw new BadRequestException(errors);

    return this.importExportService.createImportJob(orgId, user.id, dto, file);
  }

  @Post('export-jobs')
  createExportJob(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExportJobDto,
  ) {
    return this.importExportService.createExportJob(orgId, user.id, dto);
  }

  @Get('jobs/:jobId')
  findJob(@Param('orgId') orgId: string, @Param('jobId') jobId: string) {
    return this.importExportService.findJob(orgId, jobId);
  }
}
