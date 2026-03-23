import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateTagDto) {
    const slug = await this.generateUniqueSlug(orgId, dto.name);
    const tag = await this.prisma.tag.create({
      data: { orgId, name: dto.name, slug, color: dto.color, description: dto.description },
    });
    return { success: true, data: tag, meta: { timestamp: new Date().toISOString() } };
  }

  async findAll(orgId: string) {
    const tags = await this.prisma.tag.findMany({ where: { orgId }, orderBy: { name: 'asc' } });
    return { success: true, data: tags, meta: { timestamp: new Date().toISOString() } };
  }

  async findOne(orgId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { orgId, id } });
    if (!tag) throw new NotFoundException('Tag not found');
    return { success: true, data: tag, meta: { timestamp: new Date().toISOString() } };
  }

  async update(orgId: string, id: string, dto: UpdateTagDto) {
    const existing = await this.prisma.tag.findFirst({ where: { orgId, id } });
    if (!existing) throw new NotFoundException('Tag not found');

    const slug = dto.name ? await this.generateUniqueSlug(orgId, dto.name, id) : existing.slug;
    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        slug,
      },
    });
    return { success: true, data: tag, meta: { timestamp: new Date().toISOString() } };
  }

  async remove(orgId: string, id: string) {
    const existing = await this.prisma.tag.findFirst({ where: { orgId, id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Tag not found');

    await this.prisma.tag.delete({ where: { id } });
    return { success: true, data: { id, deleted: true }, meta: { timestamp: new Date().toISOString() } };
  }

  private async generateUniqueSlug(orgId: string, name: string, ignoreId?: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let suffix = 1;

    while (await this.prisma.tag.findFirst({
      where: { orgId, slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    })) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugify(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tag';
  }
}
