import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OrgMemberStatus, Prisma, type Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtTokenPayload } from './auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

type UserWithMemberships = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        role: true;
        organization: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.passwordHash) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const orgSlug = this.buildUniqueSlug(dto.displayName ?? email.split('@')[0] ?? 'workspace');
    const orgName = dto.displayName ? `${dto.displayName} Workspace` : 'My Workspace';

    const user = await this.prisma.$transaction(async (tx) => {
      const persistedUser = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              displayName: dto.displayName ?? existingUser.displayName,
              passwordHash,
              isActive: true,
            },
          })
        : await tx.user.create({
            data: {
              email,
              displayName: dto.displayName,
              passwordHash,
            },
          });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: `${orgSlug}-${randomUUID().slice(0, 8)}`,
          createdById: persistedUser.id,
        },
      });

      const ownerRole = await this.getOrCreateRole(tx, organization.id, 'owner');

      await tx.orgMember.create({
        data: {
          orgId: organization.id,
          userId: persistedUser.id,
          roleId: ownerRole.id,
          status: OrgMemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      return persistedUser;
    });

    return this.buildAuthResponse(user.id);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user.id);
  }

  async refresh(dto: RefreshDto) {
    const payload = await this.verifyToken(dto.refreshToken, 'refresh');
    return this.buildAuthResponse(payload.sub);
  }

  private async buildAuthResponse(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            role: true,
            organization: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.issueTokens(user);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        organizations: user.memberships.filter((m) => m.status === OrgMemberStatus.ACTIVE).map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          roleKey: m.role.key,
          roleName: m.role.name,
        })),
        tokens,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  private async issueTokens(user: Pick<UserWithMemberships, 'id' | 'email' | 'displayName'>) {
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, displayName: user.displayName, type: 'access' } satisfies JwtTokenPayload,
      { expiresIn: accessExpiresIn as any },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, displayName: user.displayName, type: 'refresh' } satisfies JwtTokenPayload,
      { expiresIn: refreshExpiresIn as any },
    );

    return { accessToken, refreshToken, accessExpiresIn, refreshExpiresIn };
  }

  private async verifyToken(token: string, expectedType: JwtTokenPayload['type']) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtTokenPayload>(token);
      if (payload.type !== expectedType) {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });

      if (!user?.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private buildUniqueSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'workspace';
  }

  private async getOrCreateRole(tx: Prisma.TransactionClient, orgId: string, roleKey: string): Promise<Role> {
    const existing = await tx.role.findUnique({
      where: { orgId_key: { orgId, key: roleKey } },
    });

    if (existing) return existing;

    return tx.role.create({
      data: {
        orgId,
        key: roleKey,
        name: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
        permissions: this.getDefaultPermissions(roleKey),
        isSystem: true,
      },
    });
  }

  private getDefaultPermissions(roleKey: string): Record<string, boolean> {
    const base: Record<string, boolean> = { 'org.read': true };
    if (roleKey === 'owner') return { ...base, 'org.manage': true, 'member.invite': true, 'prompt.manage': true, 'folder.manage': true, 'tag.manage': true };
    if (roleKey === 'admin') return { ...base, 'member.invite': true, 'prompt.manage': true, 'folder.manage': true, 'tag.manage': true };
    if (roleKey === 'editor') return { ...base, 'prompt.manage': true, 'folder.manage': true, 'tag.manage': true };
    return base;
  }
}
