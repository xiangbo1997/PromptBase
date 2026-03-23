import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgMemberStatus, type Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MembershipWithRelations } from './org.guard';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrg(orgId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return { success: true, data: organization, meta: { timestamp: new Date().toISOString() } };
  }

  private readonly safeUserSelect = {
    id: true, email: true, displayName: true, avatarUrl: true, isActive: true,
  } as const;

  async getMembers(orgId: string) {
    const members = await this.prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: this.safeUserSelect }, role: true },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: members, meta: { timestamp: new Date().toISOString() } };
  }

  async inviteMember(orgId: string, dto: InviteMemberDto, actorMembership: MembershipWithRelations) {
    if (!this.canInvite(actorMembership.role.key)) {
      throw new ForbiddenException('Only owners or admins can invite members');
    }

    const email = dto.email.trim().toLowerCase();
    const role = await this.getOrCreateRole(orgId, dto.roleKey ?? 'viewer');
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, displayName: dto.displayName ?? email.split('@')[0] },
      });
    }

    const existingMembership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: user.id } },
      include: { user: { select: this.safeUserSelect }, role: true },
    });

    if (existingMembership) {
      return { success: true, data: existingMembership, meta: { timestamp: new Date().toISOString() } };
    }

    const membership = await this.prisma.orgMember.create({
      data: {
        orgId,
        userId: user.id,
        roleId: role.id,
        status: user.passwordHash ? OrgMemberStatus.ACTIVE : OrgMemberStatus.INVITED,
        joinedAt: user.passwordHash ? new Date() : null,
      },
      include: { user: { select: this.safeUserSelect }, role: true },
    });

    return { success: true, data: membership, meta: { timestamp: new Date().toISOString() } };
  }

  private canInvite(roleKey: string): boolean {
    return roleKey === 'owner' || roleKey === 'admin';
  }

  private async getOrCreateRole(orgId: string, roleKey: string): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: { orgId_key: { orgId, key: roleKey } },
    });
    if (existing) return existing;

    const permissions: Record<string, boolean> = { 'org.read': true };
    if (roleKey === 'owner' || roleKey === 'admin') Object.assign(permissions, { 'member.invite': true, 'prompt.manage': true, 'folder.manage': true, 'tag.manage': true });
    if (roleKey === 'owner') permissions['org.manage'] = true;
    if (roleKey === 'editor') Object.assign(permissions, { 'prompt.manage': true, 'folder.manage': true, 'tag.manage': true });

    return this.prisma.role.create({
      data: { orgId, key: roleKey, name: roleKey.charAt(0).toUpperCase() + roleKey.slice(1), permissions, isSystem: true },
    });
  }
}
