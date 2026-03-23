import type { UUID } from './auth';

export type PromptStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type PromptVisibility = 'PRIVATE' | 'ORG';
export const MODEL_PROVIDER_PROTOCOLS = ['openai', 'anthropic', 'gemini', 'ollama'] as const;
export type ModelProviderProtocol = (typeof MODEL_PROVIDER_PROTOCOLS)[number];

export const MODEL_PROVIDER_PROTOCOL_META: Record<
  ModelProviderProtocol,
  {
    label: string;
    description: string;
    defaultBaseUrl: string;
    placeholderModels: string[];
  }
> = {
  openai: {
    label: 'OpenAI 兼容协议',
    description: '适用于 OpenAI、DeepSeek、Moonshot、OpenRouter、Azure OpenAI 兼容网关等接口。',
    defaultBaseUrl: 'https://api.openai.com/v1',
    placeholderModels: ['gpt-4o', 'deepseek-chat'],
  },
  anthropic: {
    label: 'Anthropic Messages',
    description: '适用于 Claude 官方 Messages API 或兼容 Anthropic headers 的代理。',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    placeholderModels: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  },
  gemini: {
    label: 'Google Gemini',
    description: '适用于 Gemini Generative Language API 或其私有代理入口。',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    placeholderModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  },
  ollama: {
    label: 'Ollama',
    description: '适用于本地或远程 Ollama `/api/chat` 流式接口。',
    defaultBaseUrl: 'http://127.0.0.1:11434',
    placeholderModels: ['llama3.1', 'qwen2.5:14b'],
  },
};

export interface Folder {
  id: UUID;
  orgId: UUID;
  parentId?: UUID | null;
  name: string;
  description?: string | null;
  materializedPath: string;
  createdById?: UUID | null;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
}

export interface Tag {
  id: UUID;
  orgId: UUID;
  name: string;
  slug: string;
  color?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersionSnapshot {
  title: string;
  content: string;
  folderId?: UUID | null;
  tagIds: UUID[];
  variables?: Record<string, unknown>;
}

export interface PromptVersion {
  id: UUID;
  orgId: UUID;
  promptId: UUID;
  versionNumber: number;
  title: string;
  content: string;
  snapshot: PromptVersionSnapshot | Record<string, unknown>;
  variables?: Record<string, unknown> | null;
  checksum?: string | null;
  changeSummary?: string | null;
  createdById: UUID;
  createdAt: string;
}

export interface Prompt {
  id: UUID;
  orgId: UUID;
  folderId?: UUID | null;
  currentVersionId?: UUID | null;
  title: string;
  description?: string | null;
  summary?: string | null;
  status: PromptStatus;
  visibility: PromptVisibility;
  isTemplate: boolean;
  isArchived: boolean;
  isFavorite?: boolean;
  isPinned?: boolean;
  variables?: Record<string, unknown> | null;
  createdById: UUID;
  updatedById?: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export type TestRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

export interface TestRun {
  id: UUID;
  orgId: UUID;
  promptId: UUID;
  promptVersionId: UUID;
  provider: ModelProviderProtocol;
  model: string;
  status: TestRunStatus;
  input: Record<string, unknown>;
  output: { text: string } | null;
  metrics: {
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | null;
  errorMessage: string | null;
  requestedBy?: {
    id: UUID;
    email: string;
    displayName: string | null;
  };
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
export type ImportExportFormat = 'JSON' | 'CSV' | 'MARKDOWN';

export interface ImportExportJob {
  id: UUID;
  orgId: UUID;
  type: 'IMPORT' | 'EXPORT';
  format: ImportExportFormat;
  status: JobStatus;
  sourceUri?: string | null;
  targetUri?: string | null;
  errorMessage?: string | null;
  summary?: {
    importedCount?: number;
    exportedCount?: number;
  } | null;
  createdAt: string;
}

export interface AuditLog {
  id: UUID;
  orgId: UUID;
  actorId?: UUID | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: UUID;
    email: string;
    displayName: string | null;
  };
}

export interface ModelProvider {
  id: UUID;
  orgId: UUID;
  name: string;
  provider: ModelProviderProtocol;
  models: string[];
  hasApiKey: boolean;
  isActive: boolean;
  baseUrl?: string | null;
  createdAt: string;
}
