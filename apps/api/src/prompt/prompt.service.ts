import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PromptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

interface FindAllParams {
  page: number;
  pageSize: number;
  folderId?: string;
  search?: string;
  tagId?: string;
  isTemplate?: boolean;
}

interface TemplateVariableDefinition {
  name: string;
  type: string;
  defaultValue: string | null;
  description: string | null;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
}

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
  } satisfies Prisma.UserSelect;

  private getPromptInclude(userId?: string): Prisma.PromptInclude {
    return {
      folder: true,
      currentVersion: true,
      tagRelations: { include: { tag: true } },
      ...(userId
        ? {
            favorites: { where: { userId }, select: { id: true } },
            pins: { where: { userId }, select: { id: true } },
          }
        : {}),
    };
  }

  private getVersionInclude(): Prisma.PromptVersionInclude {
    return { createdBy: { select: this.safeUserSelect } };
  }

  private serializePrompt(prompt: Record<string, unknown>) {
    const { favorites, pins, ...rest } = prompt as Record<string, unknown> & {
      favorites?: Array<{ id: string }>;
      pins?: Array<{ id: string }>;
    };
    return {
      ...rest,
      isFavorite: Array.isArray(favorites) ? favorites.length > 0 : false,
      isPinned: Array.isArray(pins) ? pins.length > 0 : false,
    };
  }

  // ─── Version APIs ──────────────────────────────────────────

  async listVersions(orgId: string, promptId: string, pageInput: number, pageSizeInput: number) {
    await this.ensurePromptExists(orgId, promptId);

    const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;
    const pageSize = Number.isFinite(pageSizeInput) && pageSizeInput > 0 ? Math.min(pageSizeInput, 100) : 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.promptVersion.findMany({
        where: { orgId, promptId },
        include: this.getVersionInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.promptVersion.count({ where: { orgId, promptId } }),
    ]);

    return {
      success: true,
      data: items,
      meta: { timestamp: new Date().toISOString(), pagination: { page, pageSize, total } },
    };
  }

  async findVersion(orgId: string, promptId: string, versionId: string) {
    const version = await this.findVersionOrThrow(orgId, promptId, versionId);
    return { success: true, data: version, meta: { timestamp: new Date().toISOString() } };
  }

  async diffVersions(orgId: string, promptId: string, versionId: string, compareWith?: string) {
    if (!compareWith) throw new BadRequestException('compareWith is required');

    const [target, base] = await Promise.all([
      this.findVersionOrThrow(orgId, promptId, versionId),
      this.findVersionOrThrow(orgId, promptId, compareWith),
    ]);

    const diff = this.buildLineDiff(base.content, target.content);

    return {
      success: true,
      data: {
        targetVersion: { id: target.id, versionNumber: target.versionNumber, createdAt: target.createdAt, createdBy: target.createdBy },
        compareWithVersion: { id: base.id, versionNumber: base.versionNumber, createdAt: base.createdAt, createdBy: base.createdBy },
        summary: diff.summary,
        changes: diff.changes,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  async restoreVersion(orgId: string, promptId: string, versionId: string, userId: string) {
    await this.ensurePromptExists(orgId, promptId);
    const source = await this.findVersionOrThrow(orgId, promptId, versionId);
    const snapshot = this.parseSnapshot(source.snapshot, source.title, source.content);

    await this.validateFolder(orgId, snapshot.folderId ?? undefined);
    const tagIds = await this.validateTagIds(orgId, snapshot.tagIds);
    const variables = snapshot.variables.length > 0 ? snapshot.variables : this.extractVariables(snapshot.content);

    const prompt = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.promptVersion.findFirst({
        where: { promptId },
        orderBy: { versionNumber: 'desc' },
      });

      const restored = await tx.promptVersion.create({
        data: {
          orgId,
          promptId,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          title: snapshot.title,
          content: snapshot.content,
          snapshot: this.buildSnapshot(snapshot.title, snapshot.content, snapshot.description, snapshot.folderId, tagIds, snapshot.isTemplate, variables),
          variables: this.toJson(variables),
          changeSummary: `Restored from version ${source.versionNumber}`,
          createdById: userId,
        },
      });

      await tx.promptTagRelation.deleteMany({ where: { promptId } });
      if (tagIds.length > 0) {
        await tx.promptTagRelation.createMany({
          data: tagIds.map((tagId) => ({ orgId, promptId, tagId })),
          skipDuplicates: true,
        });
      }

      return tx.prompt.update({
        where: { id: promptId },
        data: {
          title: snapshot.title,
          description: snapshot.description,
          folderId: snapshot.folderId,
          isTemplate: snapshot.isTemplate,
          variables: this.toJson(variables),
          updatedById: userId,
          currentVersionId: restored.id,
        },
        include: this.getPromptInclude(),
      });
    });

    return { success: true, data: prompt, meta: { timestamp: new Date().toISOString() } };
  }

  // ─── CRUD ──────────────────────────────────────────────────

  async create(orgId: string, userId: string, dto: CreatePromptDto) {
    await this.validateFolder(orgId, dto.folderId);
    const tagIds = await this.validateTagIds(orgId, dto.tagIds);
    const variables = this.extractVariables(dto.content);

    const prompt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.prompt.create({
        data: {
          orgId,
          title: dto.title,
          description: dto.description,
          folderId: dto.folderId,
          isTemplate: dto.isTemplate ?? false,
          variables: this.toJson(variables),
          createdById: userId,
          updatedById: userId,
        },
      });

      const version = await tx.promptVersion.create({
        data: {
          orgId,
          promptId: created.id,
          versionNumber: 1,
          title: dto.title,
          content: dto.content,
          snapshot: this.buildSnapshot(dto.title, dto.content, dto.description ?? null, dto.folderId ?? null, tagIds, dto.isTemplate ?? false, variables),
          variables: this.toJson(variables),
          createdById: userId,
        },
      });

      if (tagIds.length > 0) {
        await tx.promptTagRelation.createMany({
          data: tagIds.map((tagId) => ({ orgId, promptId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      return tx.prompt.update({
        where: { id: created.id },
        data: { currentVersionId: version.id },
        include: this.getPromptInclude(),
      });
    });

    return { success: true, data: prompt, meta: { timestamp: new Date().toISOString() } };
  }

  async findAll(orgId: string, userId: string, params: FindAllParams) {
    const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1;
    const pageSize = Number.isFinite(params.pageSize) && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;

    const where: Prisma.PromptWhereInput = {
      orgId,
      isArchived: false,
      ...(params.folderId ? { folderId: params.folderId } : {}),
      ...(params.tagId ? { tagRelations: { some: { tagId: params.tagId } } } : {}),
      ...(params.isTemplate !== undefined ? { isTemplate: params.isTemplate } : {}),
      ...(params.search ? {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { currentVersion: { is: { content: { contains: params.search, mode: 'insensitive' } } } },
        ],
      } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.prompt.findMany({
        where,
        include: this.getPromptInclude(userId),
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.prompt.count({ where }),
    ]);

    return {
      success: true,
      data: items.map((item) => this.serializePrompt(item as unknown as Record<string, unknown>)),
      meta: { timestamp: new Date().toISOString(), pagination: { page, pageSize, total } },
    };
  }

  async findOne(orgId: string, id: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, orgId, isArchived: false },
      include: this.getPromptInclude(),
    });

    if (!prompt) throw new NotFoundException('Prompt not found');
    return { success: true, data: prompt, meta: { timestamp: new Date().toISOString() } };
  }

  async update(orgId: string, id: string, userId: string, dto: UpdatePromptDto) {
    const existing = await this.prisma.prompt.findFirst({
      where: { id, orgId, isArchived: false },
      include: { currentVersion: true, tagRelations: true },
    });

    if (!existing || !existing.currentVersion) throw new NotFoundException('Prompt not found');

    const title = dto.title ?? existing.title;
    const content = dto.content ?? existing.currentVersion.content;
    const description = dto.description ?? existing.description;
    const folderId = dto.folderId ?? existing.folderId;
    const isTemplate = dto.isTemplate ?? existing.isTemplate;
    const tagIds = dto.tagIds ? await this.validateTagIds(orgId, dto.tagIds) : existing.tagRelations.map((r) => r.tagId);
    await this.validateFolder(orgId, folderId ?? undefined);
    const variables = this.extractVariables(content);

    const prompt = await this.prisma.$transaction(async (tx) => {
      const latestVersion = await tx.promptVersion.findFirst({
        where: { promptId: id },
        orderBy: { versionNumber: 'desc' },
      });

      const version = await tx.promptVersion.create({
        data: {
          orgId,
          promptId: id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          title,
          content,
          snapshot: this.buildSnapshot(title, content, description ?? null, folderId ?? null, tagIds, isTemplate, variables),
          variables: this.toJson(variables),
          createdById: userId,
        },
      });

      if (dto.tagIds) {
        await tx.promptTagRelation.deleteMany({ where: { promptId: id } });
        if (tagIds.length > 0) {
          await tx.promptTagRelation.createMany({
            data: tagIds.map((tagId) => ({ orgId, promptId: id, tagId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.prompt.update({
        where: { id },
        data: { title, description, folderId, isTemplate, variables: this.toJson(variables), updatedById: userId, currentVersionId: version.id },
        include: this.getPromptInclude(),
      });
    });

    return { success: true, data: prompt, meta: { timestamp: new Date().toISOString() } };
  }

  async remove(orgId: string, id: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, orgId, isArchived: false },
      select: { id: true },
    });

    if (!prompt) throw new NotFoundException('Prompt not found');

    await this.prisma.prompt.update({
      where: { id },
      data: { isArchived: true, status: PromptStatus.ARCHIVED },
    });

    return { success: true, data: { id, deleted: true }, meta: { timestamp: new Date().toISOString() } };
  }

  // ─── Private helpers ───────────────────────────────────────

  private async ensurePromptExists(orgId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, orgId },
      select: { id: true },
    });
    if (!prompt) throw new NotFoundException('Prompt not found');
  }

  private async findVersionOrThrow(orgId: string, promptId: string, versionId: string) {
    const version = await this.prisma.promptVersion.findFirst({
      where: { id: versionId, orgId, promptId },
      include: this.getVersionInclude(),
    });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  private async validateFolder(orgId: string, folderId?: string) {
    if (!folderId) return;
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, orgId }, select: { id: true } });
    if (!folder) throw new BadRequestException('Folder does not belong to this organization');
  }

  private async validateTagIds(orgId: string, tagIds?: string[]) {
    if (!tagIds || tagIds.length === 0) return [];
    const unique = Array.from(new Set(tagIds));
    const count = await this.prisma.tag.count({ where: { orgId, id: { in: unique } } });
    if (count !== unique.length) throw new BadRequestException('One or more tags do not belong to this organization');
    return unique;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as unknown as Prisma.InputJsonValue;
  }

  private buildSnapshot(
    title: string, content: string, description: string | null, folderId: string | null,
    tagIds: string[], isTemplate: boolean, variables: TemplateVariableDefinition[],
  ): Prisma.InputJsonValue {
    return this.toJson({ title, content, description, folderId, tagIds, isTemplate, variables });
  }

  private parseSnapshot(snapshot: Prisma.JsonValue, fallbackTitle: string, fallbackContent: string) {
    const raw = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? (snapshot as Record<string, unknown>)
      : {};

    const content = typeof raw.content === 'string' ? raw.content : fallbackContent;

    return {
      title: typeof raw.title === 'string' ? raw.title : fallbackTitle,
      content,
      description: typeof raw.description === 'string' ? raw.description : null,
      folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
      tagIds: Array.isArray(raw.tagIds) ? raw.tagIds.filter((t): t is string => typeof t === 'string') : [],
      isTemplate: typeof raw.isTemplate === 'boolean' ? raw.isTemplate : false,
      variables: this.normalizeVariables(raw.variables) ?? this.extractVariables(content),
    };
  }

  private normalizeVariables(value: unknown): TemplateVariableDefinition[] {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          name: typeof item.name === 'string' ? item.name : '',
          type: typeof item.type === 'string' ? item.type : 'text',
          defaultValue: typeof item.defaultValue === 'string' ? item.defaultValue : null,
          description: typeof item.description === 'string' ? item.description : null,
        }))
        .filter((item) => item.name.length > 0);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>).map(([name, defaultValue]) => ({
        name,
        type: 'text',
        defaultValue: typeof defaultValue === 'string' ? defaultValue : null,
        description: null,
      }));
    }
    return [];
  }

  private extractVariables(content: string): TemplateVariableDefinition[] {
    const defs = new Map<string, TemplateVariableDefinition>();
    const matches = content.matchAll(/{{\s*([^{}]+?)\s*}}/g);

    for (const match of matches) {
      const raw = match[1]?.trim();
      if (!raw) continue;

      const segments = raw.split(':').map((s) => s.trim()).filter((s) => s.length > 0);
      const name = segments[0] ?? '';
      if (!name || !/^[a-zA-Z0-9_.-]+$/.test(name)) continue;

      const def: TemplateVariableDefinition = { name, type: 'text', defaultValue: null, description: null };

      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i] ?? '';
        const eqIdx = segment.indexOf('=');
        if (eqIdx > 0) {
          const k = segment.slice(0, eqIdx).trim().toLowerCase();
          const val = segment.slice(eqIdx + 1).trim();
          if (k === 'type') def.type = val || 'text';
          else if (k === 'default') def.defaultValue = val || null;
          else if (k === 'description') def.description = val || null;
        }
      }

      const existing = defs.get(name);
      if (existing) {
        defs.set(name, {
          name,
          type: def.type !== 'text' ? def.type : existing.type,
          defaultValue: def.defaultValue ?? existing.defaultValue,
          description: def.description ?? existing.description,
        });
      } else {
        defs.set(name, def);
      }
    }

    return Array.from(defs.values());
  }

  private buildLineDiff(left: string, right: string) {
    const leftLines = left.length === 0 ? [] : left.split(/\r?\n/);
    const rightLines = right.length === 0 ? [] : right.split(/\r?\n/);

    const matrix = Array.from({ length: leftLines.length + 1 }, () =>
      Array<number>(rightLines.length + 1).fill(0),
    );

    for (let i = leftLines.length - 1; i >= 0; i--) {
      for (let j = rightLines.length - 1; j >= 0; j--) {
        matrix[i]![j] = leftLines[i] === rightLines[j]
          ? (matrix[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(matrix[i + 1]?.[j] ?? 0, matrix[i]?.[j + 1] ?? 0);
      }
    }

    const changes: DiffLine[] = [];
    let li = 0, ri = 0, added = 0, removed = 0, unchanged = 0;

    while (li < leftLines.length && ri < rightLines.length) {
      if (leftLines[li] === rightLines[ri]) {
        changes.push({ type: 'unchanged', content: leftLines[li]!, leftLineNumber: li + 1, rightLineNumber: ri + 1 });
        unchanged++; li++; ri++;
      } else if ((matrix[li + 1]?.[ri] ?? 0) >= (matrix[li]?.[ri + 1] ?? 0)) {
        changes.push({ type: 'removed', content: leftLines[li]!, leftLineNumber: li + 1, rightLineNumber: null });
        removed++; li++;
      } else {
        changes.push({ type: 'added', content: rightLines[ri]!, leftLineNumber: null, rightLineNumber: ri + 1 });
        added++; ri++;
      }
    }

    while (li < leftLines.length) {
      changes.push({ type: 'removed', content: leftLines[li]!, leftLineNumber: li + 1, rightLineNumber: null });
      removed++; li++;
    }
    while (ri < rightLines.length) {
      changes.push({ type: 'added', content: rightLines[ri]!, leftLineNumber: null, rightLineNumber: ri + 1 });
      added++; ri++;
    }

    return {
      summary: { added, removed, unchanged, totalLeftLines: leftLines.length, totalRightLines: rightLines.length },
      changes,
    };
  }
}
