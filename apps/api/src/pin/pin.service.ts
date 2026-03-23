import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PinService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string, userId: string) {
    const pins = await this.prisma.pin.findMany({
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
      orderBy: { orderIndex: 'asc' },
    });

    const data = pins
      .filter((p) => !p.prompt.isArchived)
      .map((p) => ({ ...p.prompt, isPinned: true }));

    return { success: true, data, meta: { timestamp: new Date().toISOString() } };
  }

  async toggle(orgId: string, userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, orgId, isArchived: false },
      select: { id: true },
    });
    if (!prompt) throw new NotFoundException('Prompt not found');

    const existing = await this.prisma.pin.findUnique({
      where: { orgId_userId_promptId: { orgId, userId, promptId } },
    });

    if (existing) {
      await this.prisma.pin.delete({ where: { id: existing.id } });
      return { success: true, data: { pinned: false }, meta: { timestamp: new Date().toISOString() } };
    }

    const maxOrder = await this.prisma.pin.aggregate({
      where: { orgId, userId },
      _max: { orderIndex: true },
    });

    await this.prisma.pin.create({
      data: { orgId, userId, promptId, orderIndex: (maxOrder._max.orderIndex ?? -1) + 1 },
    });

    return { success: true, data: { pinned: true }, meta: { timestamp: new Date().toISOString() } };
  }

  async reorder(orgId: string, userId: string, promptIds: string[]) {
    const pins = await this.prisma.pin.findMany({
      where: { orgId, userId },
      select: { id: true, promptId: true },
    });
    const pinByPromptId = new Map(pins.map((pin) => [pin.promptId, pin.id]));

    for (const promptId of promptIds) {
      if (!pinByPromptId.has(promptId)) {
        throw new BadRequestException(`Pinned prompt not found: ${promptId}`);
      }
    }

    await this.prisma.$transaction(
      promptIds.map((promptId, index) =>
        this.prisma.pin.update({
          where: { id: pinByPromptId.get(promptId)! },
          data: { orderIndex: index },
        }),
      ),
    );

    return { success: true, data: { reordered: true }, meta: { timestamp: new Date().toISOString() } };
  }

  async remove(orgId: string, userId: string, promptId: string) {
    const result = await this.prisma.pin.deleteMany({
      where: { orgId, userId, promptId },
    });
    return {
      success: true,
      data: { pinned: false, removed: result.count > 0 },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
