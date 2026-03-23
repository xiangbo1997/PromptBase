import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

export interface FolderNode {
  id: string;
  orgId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  materializedPath: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: FolderNode[];
}

@Injectable()
export class FolderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: CreateFolderDto) {
    const parent = dto.parentId
      ? await this.prisma.folder.findFirst({ where: { id: dto.parentId, orgId } })
      : null;

    if (dto.parentId && !parent) {
      throw new BadRequestException('Parent folder not found in organization');
    }

    const id = randomUUID();
    const materializedPath = parent ? `${parent.materializedPath}/${id}` : `/${id}`;

    const folder = await this.prisma.folder.create({
      data: { id, orgId, parentId: parent?.id ?? null, name: dto.name, description: dto.description, materializedPath, createdById: userId },
    });

    return { success: true, data: folder, meta: { timestamp: new Date().toISOString() } };
  }

  async findAll(orgId: string) {
    const folders = await this.prisma.folder.findMany({
      where: { orgId },
      orderBy: { materializedPath: 'asc' },
    });

    const map = new Map<string, FolderNode>();
    const roots: FolderNode[] = [];

    for (const folder of folders) {
      map.set(folder.id, { ...folder, children: [] });
    }

    for (const folder of folders) {
      const node = map.get(folder.id)!;
      if (folder.parentId && map.has(folder.parentId)) {
        map.get(folder.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { success: true, data: roots, meta: { timestamp: new Date().toISOString() } };
  }

  async findOne(orgId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({ where: { orgId, id } });
    if (!folder) throw new NotFoundException('Folder not found');
    return { success: true, data: folder, meta: { timestamp: new Date().toISOString() } };
  }

  async update(orgId: string, id: string, dto: UpdateFolderDto) {
    const folder = await this.prisma.folder.findFirst({ where: { orgId, id }, select: { id: true } });
    if (!folder) throw new NotFoundException('Folder not found');

    const updated = await this.prisma.folder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    return { success: true, data: updated, meta: { timestamp: new Date().toISOString() } };
  }

  async remove(orgId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({ where: { orgId, id } });
    if (!folder) throw new NotFoundException('Folder not found');

    const [childCount, promptCount] = await this.prisma.$transaction([
      this.prisma.folder.count({ where: { orgId, parentId: id } }),
      this.prisma.prompt.count({ where: { orgId, folderId: id, isArchived: false } }),
    ]);

    if (childCount > 0 || promptCount > 0) {
      throw new BadRequestException('Folder must be empty before deletion');
    }

    await this.prisma.folder.delete({ where: { id } });
    return { success: true, data: { id, deleted: true }, meta: { timestamp: new Date().toISOString() } };
  }

  async move(orgId: string, id: string, parentId: string | null) {
    const folder = await this.prisma.folder.findFirst({ where: { orgId, id } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (parentId === id) throw new BadRequestException('Folder cannot be moved into itself');

    const parent = parentId
      ? await this.prisma.folder.findFirst({ where: { orgId, id: parentId } })
      : null;

    if (parentId && !parent) throw new BadRequestException('Target parent folder not found');
    if (parent && parent.materializedPath.startsWith(`${folder.materializedPath}/`)) {
      throw new BadRequestException('Folder cannot be moved into its descendant');
    }

    const oldPath = folder.materializedPath;
    const newPath = parent ? `${parent.materializedPath}/${folder.id}` : `/${folder.id}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const descendants = await tx.folder.findMany({
        where: { orgId, materializedPath: { startsWith: `${oldPath}/` } },
      });

      await tx.folder.update({ where: { id }, data: { parentId, materializedPath: newPath } });

      for (const desc of descendants) {
        await tx.folder.update({
          where: { id: desc.id },
          data: { materializedPath: desc.materializedPath.replace(oldPath, newPath) },
        });
      }

      return tx.folder.findUnique({ where: { id } });
    });

    return { success: true, data: updated, meta: { timestamp: new Date().toISOString() } };
  }
}
