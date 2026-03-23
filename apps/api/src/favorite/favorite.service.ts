import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string, userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { orgId, userId },
      include: {
        prompt: {
          include: {
            folder: true,
            currentVersion: true,
            tagRelations: { include: { tag: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = favorites
      .filter((f) => !f.prompt.isArchived)
      .map((f) => ({ ...f.prompt, isFavorite: true }));

    return { success: true, data, meta: { timestamp: new Date().toISOString() } };
  }

  async toggle(orgId: string, userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, orgId, isArchived: false },
      select: { id: true },
    });
    if (!prompt) throw new NotFoundException('Prompt not found');

    const existing = await this.prisma.favorite.findUnique({
      where: { orgId_userId_promptId: { orgId, userId, promptId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { success: true, data: { favorited: false }, meta: { timestamp: new Date().toISOString() } };
    }

    await this.prisma.favorite.create({ data: { orgId, userId, promptId } });
    return { success: true, data: { favorited: true }, meta: { timestamp: new Date().toISOString() } };
  }

  async remove(orgId: string, userId: string, promptId: string) {
    const result = await this.prisma.favorite.deleteMany({
      where: { orgId, userId, promptId },
    });
    return {
      success: true,
      data: { favorited: false, removed: result.count > 0 },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
