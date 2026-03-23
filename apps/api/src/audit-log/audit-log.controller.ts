import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgMemberGuard } from '../org/org.guard';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditLogService } from './audit-log.service';

@Controller('orgs/:orgId/audit-logs')
@UseGuards(AuthGuard, OrgMemberGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(@Param('orgId') orgId: string, @Query() dto: QueryAuditLogDto) {
    return this.auditLogService.findAll(orgId, dto);
  }
}
