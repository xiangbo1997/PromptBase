import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchPromptsDto } from './dto/search-prompts.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(orgId: string, userId: string, dto: SearchPromptsDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const query = dto.q.trim();

    const where: Prisma.PromptWhereInput = {
      orgId,
      isArchived: false,
      ...(dto.folderId ? { folderId: dto.folderId } : {}),
      ...(dto.tagId ? { tagRelations: { some: { tagId: dto.tagId } } } : {}),
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { currentVersion: { is: { content: { contains: query, mode: 'insensitive' } } } },
      ],
    };

    const [prompts, total] = await this.prisma.$transaction([
      this.prisma.prompt.findMany({
        where,
        include: {
          folder: true,
          currentVersion: true,
          tagRelations: { include: { tag: true } },
          favorites: { where: { userId }, select: { id: true } },
          pins: { where: { userId }, select: { id: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.prompt.count({ where }),
    ]);

    const data = prompts.map((p) => ({
      ...p,
      isFavorite: p.favorites.length > 0,
      isPinned: p.pins.length > 0,
      favorites: undefined,
      pins: undefined,
    }));

    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), pagination: { page, pageSize, total } },
    };
  }
}
