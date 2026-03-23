import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
  } satisfies Prisma.UserSelect;

  async log(
    orgId: string,
    actorId: string | null | undefined,
    entityType: string,
    entityId: string,
    action: string,
    before?: unknown,
    after?: unknown,
    metadata?: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        orgId,
        actorId: actorId ?? null,
        entityType,
        entityId,
        action,
        before: before === undefined ? undefined : (before as Prisma.InputJsonValue),
        after: after === undefined ? undefined : (after as Prisma.InputJsonValue),
        metadata: metadata === undefined ? undefined : (metadata as Prisma.InputJsonValue),
      },
    });
  }

  async findAll(orgId: string, dto: QueryAuditLogDto) {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 20, 100);
    const where: Prisma.AuditLogWhereInput = {
      orgId,
      ...(dto.entityType ? { entityType: dto.entityType } : {}),
      ...(dto.action ? { action: dto.action } : {}),
      ...((dto.from || dto.to)
        ? {
            createdAt: {
              ...(dto.from ? { gte: new Date(dto.from) } : {}),
              ...(dto.to ? { lte: new Date(dto.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: this.safeUserSelect } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total },
      meta: { timestamp: new Date().toISOString(), pagination: { page, pageSize, total } },
    };
  }
}
