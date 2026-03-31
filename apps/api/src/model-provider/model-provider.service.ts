import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ModelProviderProtocol } from '@promptbase/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModelProviderDto } from './dto/create-model-provider.dto';
import { UpdateModelProviderDto } from './dto/update-model-provider.dto';
import { ModelProviderCryptoService } from './model-provider.crypto';

export interface ResolvedModelProvider {
  id: string;
  orgId: string;
  name: string;
  provider: ModelProviderProtocol;
  apiKey: string;
  baseUrl: string | null;
  models: string[];
  isActive: boolean;
}

@Injectable()
export class ModelProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: ModelProviderCryptoService,
  ) {}

  async create(orgId: string, dto: CreateModelProviderDto) {
    const created = await this.prisma.modelProvider.create({
      data: {
        orgId,
        name: dto.name,
        provider: dto.provider,
        apiKey: this.crypto.encrypt(dto.apiKey ?? ''),
        baseUrl: dto.baseUrl?.trim() || null,
        models: dto.models,
        isActive: dto.isActive ?? true,
      },
    });

    return this.serialize(created);
  }

  async findAll(orgId: string) {
    const items = await this.prisma.modelProvider.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
    });

    return items.map((item) => this.serialize(item));
  }

  async findOne(orgId: string, id: string) {
    const provider = await this.findProviderOrThrow(orgId, id);
    return this.serialize(provider);
  }

  async update(orgId: string, id: string, dto: UpdateModelProviderDto) {
    const existing = await this.findProviderOrThrow(orgId, id);

    const updated = await this.prisma.modelProvider.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.provider !== undefined ? { provider: dto.provider } : {}),
        ...(dto.apiKey !== undefined ? { apiKey: this.crypto.encrypt(dto.apiKey) } : {}),
        ...(dto.baseUrl !== undefined ? { baseUrl: dto.baseUrl.trim() || null } : {}),
        ...(dto.models !== undefined ? { models: dto.models } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.serialize(updated);
  }

  async remove(orgId: string, id: string) {
    const existing = await this.findProviderOrThrow(orgId, id);
    await this.prisma.modelProvider.delete({ where: { id: existing.id } });
    return { id: existing.id, deleted: true };
  }

  async resolveActiveProvider(orgId: string, provider: ModelProviderProtocol, model: string): Promise<ResolvedModelProvider> {
    const providers = await this.prisma.modelProvider.findMany({
      where: { orgId, provider, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const matched = providers.find((item) => {
      const models = this.extractModels(item.models);
      return models.length === 0 || models.includes(model);
    });

    if (!matched) {
      throw new NotFoundException(`No active model provider found for ${provider}:${model}`);
    }

    return this.toResolvedProvider(matched);
  }

  async resolveActiveProviderById(orgId: string, id: string, model: string): Promise<ResolvedModelProvider> {
    const matched = await this.prisma.modelProvider.findFirst({
      where: { id, orgId, isActive: true },
    });

    if (!matched) {
      throw new NotFoundException('Model provider not found or inactive');
    }

    const models = this.extractModels(matched.models);
    if (models.length > 0 && !models.includes(model)) {
      throw new NotFoundException(`Model ${model} is not enabled for provider ${matched.name}`);
    }

    return this.toResolvedProvider(matched);
  }

  async findPreferredAssistantProvider(orgId: string): Promise<ResolvedModelProvider | null> {
    const providers = await this.prisma.modelProvider.findMany({
      where: { orgId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const matched = providers.find((item) => this.extractModels(item.models).length > 0);
    return matched ? this.toResolvedProvider(matched) : null;
  }

  private async findProviderOrThrow(orgId: string, id: string) {
    const provider = await this.prisma.modelProvider.findFirst({ where: { id, orgId } });
    if (!provider) throw new NotFoundException('Model provider not found');
    return provider;
  }

  private extractModels(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private toResolvedProvider(provider: {
    apiKey: string;
    models: Prisma.JsonValue;
    id: string;
    orgId: string;
    name: string;
    provider: string;
    baseUrl: string | null;
    isActive: boolean;
  }): ResolvedModelProvider {
    return {
      id: provider.id,
      orgId: provider.orgId,
      name: provider.name,
      provider: provider.provider as ModelProviderProtocol,
      apiKey: this.crypto.decrypt(provider.apiKey),
      baseUrl: provider.baseUrl,
      models: this.extractModels(provider.models),
      isActive: provider.isActive,
    };
  }

  private serialize(provider: {
    apiKey: string;
    models: Prisma.JsonValue;
    id: string;
    orgId: string;
    name: string;
    provider: string;
    baseUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { apiKey, models, ...rest } = provider;
    return {
      ...rest,
      provider: rest.provider as ModelProviderProtocol,
      models: this.extractModels(models),
      hasApiKey: apiKey.length > 0,
    };
  }
}
