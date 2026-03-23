import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { OrgMemberStatus, type OrgMember, type Organization, type Role } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

export type MembershipWithRelations = OrgMember & {
  role: Role;
  organization: Organization;
};

export type OrgRequest = AuthenticatedRequest & {
  membership: MembershipWithRelations;
};

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & Partial<OrgRequest>>();
    const orgId = (request.params as Record<string, string | undefined>)?.orgId;
    const userId = request.user?.id;

    if (!orgId || !userId) {
      throw new ForbiddenException('Organization membership is required');
    }

    const membership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      include: { role: true, organization: true },
    });

    if (!membership || membership.status !== OrgMemberStatus.ACTIVE) {
      throw new ForbiddenException('You are not an active member of this organization');
    }

    request.membership = membership;
    return true;
  }
}
