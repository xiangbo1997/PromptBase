import { Inject, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  MODEL_PROVIDER_PROTOCOLS,
  type AssistantActionChatResponse,
  type AssistantDraftSummary,
  type AssistantExecutedAction,
  type AssistantIntent,
  type AssistantPendingField,
  type AssistantPendingFieldKey,
  type AssistantSessionState,
  type AssistantSessionStatus,
  type AssistantUndoResponse,
  type GuideAssistantResponse,
  type GuideCitation,
  type ModelProviderProtocol,
} from '@promptbase/shared';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { AuditLogService } from '../audit-log/audit-log.service';
import { FolderService } from '../folder/folder.service';
import { ModelProviderService } from '../model-provider/model-provider.service';
import { PromptService } from '../prompt/prompt.service';
import { TagService } from '../tag/tag.service';
import { AdapterFactory } from '../test-run/adapters/adapter.factory';
import type { ChatMessage } from '../test-run/adapters/model-adapter';
import { AssistantActionChatDto } from './dto/assistant-action-chat.dto';
import { AssistantUndoDto } from './dto/assistant-undo.dto';
import { GuideAssistantDto } from './dto/guide-assistant.dto';
import { DocKnowledgeService, type KnowledgeChunk } from './doc-knowledge.service';

type AssistantRuntime = {
  source: 'organization' | 'platform';
  provider: ModelProviderProtocol;
  providerName: string;
  model: string;
  baseUrl?: string;
  apiKey: string;
};

type AssistantModelPayload = {
  answer: string;
  citationNumbers: number[];
  inferenceNotes: string[];
};

type UndoOperation = {
  type: 'prompt' | 'tag' | 'folder';
  id: string;
  name: string;
  href?: string;
};

type PendingResourceConfirmation = {
  folders: string[];
  tags: string[];
};

type AssistantActionSessionRecord = {
  sessionId: string;
  orgId: string;
  userId: string;
  locale: string;
  pathname?: string;
  intent: AssistantIntent;
  status: AssistantSessionStatus;
  draft: {
    title?: string;
    content?: string;
    description?: string;
    folderName?: string;
    folderId?: string;
    tagNames: string[];
    tagIds: string[];
    isTemplate?: boolean;
    name?: string;
    color?: string;
    parentFolderName?: string;
    parentFolderId?: string;
  };
  pendingFields: AssistantPendingFieldKey[];
  pendingResourceConfirmation?: PendingResourceConfirmation;
  undoStack: UndoOperation[];
  executedActions: AssistantExecutedAction[];
  updatedAt: string;
};

type ExecutionResult = {
  actions: AssistantExecutedAction[];
  undoStack: UndoOperation[];
  reply: string;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class AssistantService {
  constructor(
    private readonly configService: ConfigService,
    private readonly knowledgeService: DocKnowledgeService,
    private readonly modelProviderService: ModelProviderService,
    private readonly adapterFactory: AdapterFactory,
    private readonly prisma: PrismaService,
    private readonly promptService: PromptService,
    private readonly tagService: TagService,
    private readonly folderService: FolderService,
    private readonly auditLogService: AuditLogService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async answer(orgId: string, user: AuthenticatedUser, dto: GuideAssistantDto): Promise<GuideAssistantResponse> {
    const question = dto.question.trim();
    if (!question) {
      throw new BadRequestException('Question is required');
    }

    const runtime = await this.resolveRuntime(orgId);
    const chunks = await this.knowledgeService.search(question, dto.pathname, 6);
    const raw = await this.generateModelResponse(runtime, question, dto.locale ?? 'zh-CN', dto.pathname, user, chunks, dto.history ?? []);
    const parsed = this.parseModelPayload(raw, chunks.length);
    const citations = this.selectCitations(parsed.citationNumbers, chunks);

    return {
      answer: parsed.answer,
      citations,
      inferenceNotes: parsed.inferenceNotes,
      usedModel: {
        source: runtime.source,
        provider: runtime.provider,
        providerName: runtime.providerName,
        model: runtime.model,
      },
      fallbackMode: runtime.source,
    };
  }

  async chat(orgId: string, user: AuthenticatedUser, dto: AssistantActionChatDto): Promise<AssistantActionChatResponse> {
    const message = dto.message.trim();
    if (!message) {
      throw new BadRequestException('Message is required');
    }

    const session = await this.loadSession(orgId, user, dto);
    const lower = message.toLowerCase();

    if (this.isCancelMessage(lower)) {
      const reset = this.createSessionRecord(orgId, user.id, dto.locale ?? session.locale, dto.pathname ?? session.pathname);
      await this.saveSession(reset);
      return this.buildActionResponse(reset, this.getLocalizedText(reset.locale, '已取消当前操作，你可以重新告诉我想做什么。', 'The current action was canceled. Tell me what you want to do next.'), [], [], undefined);
    }

    const intent = this.resolveIntent(session, message);
    if (intent === 'guide') {
      const guide = await this.answer(orgId, user, {
        question: message,
        pathname: dto.pathname ?? session.pathname,
        locale: dto.locale ?? session.locale,
        history: [],
      });

      const updated = {
        ...session,
        intent: 'guide' as const,
        status: 'idle' as const,
        updatedAt: new Date().toISOString(),
      };
      await this.saveSession(updated);

      return {
        sessionId: updated.sessionId,
        mode: 'guide',
        reply: guide.answer,
        citations: guide.citations,
        inferenceNotes: guide.inferenceNotes,
        usedModel: guide.usedModel,
        session: this.serializeSession(updated),
        executedActions: [],
        canUndo: updated.undoStack.length > 0,
      };
    }

    const working: AssistantActionSessionRecord = {
      ...session,
      intent,
      status: 'collecting',
      pathname: dto.pathname ?? session.pathname,
      locale: dto.locale ?? session.locale,
      updatedAt: new Date().toISOString(),
    };

    if (working.pendingResourceConfirmation) {
      const decision = this.parseConfirmation(message);
      if (decision === 'yes') {
        await this.createPendingResources(orgId, user, working);
        working.pendingResourceConfirmation = undefined;
      } else if (decision === 'no') {
        working.draft.folderName = undefined;
        working.draft.folderId = undefined;
        working.draft.tagNames = working.draft.tagNames.filter((name) => !working.pendingResourceConfirmation?.tags.includes(name));
        working.draft.tagIds = (await this.resolveTagsByName(orgId, working.draft.tagNames)).map((tag) => tag.id);
        working.pendingResourceConfirmation = undefined;
      } else {
        const reply = this.getLocalizedText(working.locale, '我找到一些不存在的文件夹或标签。要不要我一起创建它们？请直接回复“是”或“否”。', 'I found folders or tags that do not exist yet. Should I create them too? Please reply with yes or no.');
        await this.saveSession(working);
        return this.buildActionResponse(working, reply, [], [], undefined);
      }
    } else {
      await this.absorbMessageIntoDraft(orgId, working, message);
    }

    await this.resolveDraftResources(orgId, working);

    if (working.pendingResourceConfirmation && !this.hasPendingRequiredFields(working)) {
      working.status = 'awaiting_confirmation';
      await this.saveSession(working);
      return this.buildActionResponse(working, this.buildMissingResourceReply(working), [], [], undefined);
    }

    working.pendingFields = this.computePendingFields(working);

    if (working.pendingFields.length > 0) {
      working.status = 'collecting';
      await this.saveSession(working);
      return this.buildActionResponse(working, this.buildCollectionReply(working), await this.getActionCitations(intent), [], undefined);
    }

    const execution = await this.executeIntent(orgId, user, working);
    working.status = 'executed';
    working.executedActions = execution.actions;
    working.undoStack = execution.undoStack;
    working.updatedAt = new Date().toISOString();
    await this.saveSession(working);

    return this.buildActionResponse(
      working,
      execution.reply,
      await this.getActionCitations(intent),
      execution.actions,
      undefined,
    );
  }

  async undo(orgId: string, user: AuthenticatedUser, dto: AssistantUndoDto): Promise<AssistantUndoResponse> {
    const session = await this.loadSession(orgId, user, {
      sessionId: dto.sessionId,
      locale: undefined,
      pathname: undefined,
      message: '',
    });

    if (session.undoStack.length === 0) {
      return {
        sessionId: session.sessionId,
        reply: this.getLocalizedText(session.locale, '当前没有可撤销的最近一步。', 'There is no recent assistant action to undo.'),
        undoneActions: [],
        session: this.serializeSession(session),
        canUndo: false,
      };
    }

    const undone: AssistantExecutedAction[] = [];

    for (const operation of [...session.undoStack].reverse()) {
      if (operation.type === 'prompt') {
        await this.promptService.remove(orgId, operation.id);
      } else if (operation.type === 'tag') {
        await this.tagService.remove(orgId, operation.id);
      } else if (operation.type === 'folder') {
        await this.folderService.remove(orgId, operation.id);
      }

      undone.push({
        type: operation.type,
        id: operation.id,
        name: operation.name,
        href: operation.href,
      });
    }

    await this.auditLogService.log(
      orgId,
      user.id,
      'assistant_session',
      session.sessionId,
      'assistant.undo',
      undefined,
      undefined,
      {
        channel: 'assistant',
        intent: session.intent,
        undoneActions: undone,
      },
    );

    session.undoStack = [];
    session.executedActions = [];
    session.status = 'idle';
    session.intent = 'guide';
    session.pendingFields = [];
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);

    return {
      sessionId: session.sessionId,
      reply: this.buildUndoReply(session.locale, undone),
      undoneActions: undone,
      session: this.serializeSession(session),
      canUndo: false,
    };
  }

  private async absorbMessageIntoDraft(orgId: string, session: AssistantActionSessionRecord, message: string) {
    if (session.intent === 'create_prompt') {
      this.applyPromptExtraction(session, message);
      if (!session.draft.title && session.pendingFields.includes('title') && !this.looksStructured(message)) {
        session.draft.title = message.trim().slice(0, 200);
      }
      if (!session.draft.content && session.pendingFields.includes('content') && !this.looksStructured(message)) {
        session.draft.content = message.trim();
      }
      return;
    }

    if (session.intent === 'create_tag') {
      this.applyTagExtraction(session, message);
      if (!session.draft.name && !this.looksStructured(message)) {
        session.draft.name = message.trim().slice(0, 80);
      }
      return;
    }

    if (session.intent === 'create_folder') {
      this.applyFolderExtraction(session, message);
      if (!session.draft.name && !this.looksStructured(message)) {
        session.draft.name = message.trim().slice(0, 120);
      }

      if (session.draft.parentFolderName) {
        const parent = await this.findFolderByName(orgId, session.draft.parentFolderName);
        session.draft.parentFolderId = parent?.id;
      }
    }
  }

  private applyPromptExtraction(session: AssistantActionSessionRecord, message: string) {
    const title = this.extractPattern(message, [
      /(?:标题|title)\s*(?:叫|是|为|[:：])\s*([^\n，。,；;]+)/i,
      /(?:新建|创建|添加).{0,8}(?:提示词|prompt)\s*(?:叫|是|为)\s*([^\n，。,；;]+)/i,
    ]);
    const content = this.extractPattern(message, [
      /(?:内容|正文|prompt内容|提示词内容)\s*(?:是|为|[:：])\s*([\s\S]+)/i,
    ]);
    const description = this.extractPattern(message, [
      /(?:描述|说明)\s*(?:是|为|[:：])\s*([^\n]+)/i,
    ]);
    const folder = this.extractPattern(message, [
      /(?:文件夹|目录|folder)\s*(?:是|为|叫|[:：]|放到|放在)\s*([^\n，。,；;]+)/i,
    ]);
    const tags = this.extractPattern(message, [
      /(?:标签|tags?)\s*(?:是|为|叫|[:：])\s*([^\n]+)/i,
    ]);

    if (title) session.draft.title = title.slice(0, 200);
    if (content) session.draft.content = content.trim();
    if (description) session.draft.description = description.slice(0, 1000);
    if (folder) session.draft.folderName = this.cleanResourceName(folder);
    if (tags) session.draft.tagNames = this.parseList(tags);

    if (!session.draft.title) {
      const quoted = this.extractQuotedValue(message);
      if (quoted && /提示词|prompt|标题|新建|创建/i.test(message)) {
        session.draft.title = quoted.slice(0, 200);
      }
    }

    if (/模板|template/i.test(message)) {
      session.draft.isTemplate = true;
    }
  }

  private applyTagExtraction(session: AssistantActionSessionRecord, message: string) {
    const name = this.extractPattern(message, [
      /(?:标签|tag)\s*(?:叫|是|为|[:：])\s*([^\n，。,；;]+)/i,
      /(?:新建|创建|添加).{0,6}(?:标签|tag)\s*(?:叫|是|为)\s*([^\n，。,；;]+)/i,
    ]);
    const color = this.extractPattern(message, [/(?:颜色|color)\s*(?:是|为|[:：])\s*([#a-zA-Z0-9-]+)/i]);
    const description = this.extractPattern(message, [/(?:描述|说明)\s*(?:是|为|[:：])\s*([^\n]+)/i]);

    if (name) session.draft.name = this.cleanResourceName(name).slice(0, 80);
    if (color) session.draft.color = color.slice(0, 32);
    if (description) session.draft.description = description.slice(0, 500);
  }

  private applyFolderExtraction(session: AssistantActionSessionRecord, message: string) {
    const name = this.extractPattern(message, [
      /(?:文件夹|目录|folder)\s*(?:叫|是|为|[:：])\s*([^\n，。,；;]+)/i,
      /(?:新建|创建|添加).{0,6}(?:文件夹|目录|folder)\s*(?:叫|是|为)\s*([^\n，。,；;]+)/i,
    ]);
    const description = this.extractPattern(message, [/(?:描述|说明)\s*(?:是|为|[:：])\s*([^\n]+)/i]);
    const parent = this.extractPattern(message, [/(?:父级|上级|parent)\s*(?:是|为|[:：]|放到|放在)\s*([^\n，。,；;]+)/i]);

    if (name) session.draft.name = this.cleanResourceName(name).slice(0, 120);
    if (description) session.draft.description = description.slice(0, 500);
    if (parent) session.draft.parentFolderName = this.cleanResourceName(parent);
  }

  private async resolveDraftResources(orgId: string, session: AssistantActionSessionRecord) {
    if (session.intent !== 'create_prompt') return;

    if (session.draft.folderName) {
      const folder = await this.findFolderByName(orgId, session.draft.folderName);
      session.draft.folderId = folder?.id;
    }

    const resolvedTags = await this.resolveTagsByName(orgId, session.draft.tagNames);
    session.draft.tagIds = resolvedTags.map((tag) => tag.id);

    const missingFolders = session.draft.folderName && !session.draft.folderId ? [session.draft.folderName] : [];
    const resolvedNames = new Set(resolvedTags.map((tag) => tag.name.toLowerCase()));
    const missingTags = session.draft.tagNames.filter((name) => !resolvedNames.has(name.toLowerCase()));

    const uniqueMissingTags = missingTags.filter((name, index) => missingTags.indexOf(name) === index);

    if ((missingFolders.length > 0 || uniqueMissingTags.length > 0) && !this.hasPendingRequiredFields(session)) {
      session.pendingResourceConfirmation = {
        folders: missingFolders,
        tags: uniqueMissingTags,
      };
      return;
    }

    session.pendingResourceConfirmation = undefined;
  }

  private async createPendingResources(orgId: string, user: AuthenticatedUser, session: AssistantActionSessionRecord) {
    const pending = session.pendingResourceConfirmation;
    if (!pending) return;

    const autoCreated: AssistantExecutedAction[] = [];
    const undo: UndoOperation[] = [...session.undoStack];

    for (const folderName of pending.folders) {
      const created = await this.folderService.create(orgId, user.id, { name: folderName });
      const folder = created.data;
      session.draft.folderName = folder.name;
      session.draft.folderId = folder.id;
      autoCreated.push({
        type: 'folder',
        id: folder.id,
        name: folder.name,
        href: '/settings/folders',
        autoCreated: true,
      });
      undo.push({ type: 'folder', id: folder.id, name: folder.name, href: '/settings/folders' });
      await this.logAssistantAction(orgId, user.id, 'folder', folder.id, 'assistant.auto_create_folder', folder, { sessionId: session.sessionId });
    }

    for (const tagName of pending.tags) {
      const created = await this.tagService.create(orgId, { name: tagName });
      const tag = created.data;
      session.draft.tagNames = Array.from(new Set([...session.draft.tagNames, tag.name]));
      session.draft.tagIds = Array.from(new Set([...session.draft.tagIds, tag.id]));
      autoCreated.push({
        type: 'tag',
        id: tag.id,
        name: tag.name,
        href: '/settings/tags',
        autoCreated: true,
      });
      undo.push({ type: 'tag', id: tag.id, name: tag.name, href: '/settings/tags' });
      await this.logAssistantAction(orgId, user.id, 'tag', tag.id, 'assistant.auto_create_tag', tag, { sessionId: session.sessionId });
    }

    session.executedActions = autoCreated;
    session.undoStack = undo;
  }

  private async executeIntent(orgId: string, user: AuthenticatedUser, session: AssistantActionSessionRecord): Promise<ExecutionResult> {
    if (session.intent === 'create_prompt') {
      const created = await this.promptService.create(orgId, user.id, {
        title: session.draft.title!,
        content: session.draft.content!,
        description: session.draft.description,
        folderId: session.draft.folderId,
        tagIds: session.draft.tagIds,
        isTemplate: session.draft.isTemplate,
      });

      const prompt = created.data as { id: string; title: string };
      const action: AssistantExecutedAction = {
        type: 'prompt',
        id: prompt.id,
        name: prompt.title,
        href: `/prompts/${prompt.id}`,
      };
      const actions = [...session.executedActions, action];
      const undoStack: UndoOperation[] = [
        ...session.undoStack,
        { type: 'prompt', id: prompt.id, name: prompt.title, href: `/prompts/${prompt.id}` },
      ];

      await this.logAssistantAction(orgId, user.id, 'prompt', prompt.id, 'assistant.create_prompt', prompt, {
        sessionId: session.sessionId,
        channel: 'assistant',
        autoCreatedDependencies: session.executedActions.filter((item) => item.autoCreated),
      });

      return {
        actions,
        undoStack,
        reply: this.buildExecutionReply(session.locale, action, session.executedActions),
      };
    }

    if (session.intent === 'create_tag') {
      const created = await this.tagService.create(orgId, {
        name: session.draft.name!,
        color: session.draft.color,
        description: session.draft.description,
      });
      const tag = created.data as { id: string; name: string };
      const action: AssistantExecutedAction = { type: 'tag', id: tag.id, name: tag.name, href: '/settings/tags' };
      await this.logAssistantAction(orgId, user.id, 'tag', tag.id, 'assistant.create_tag', tag, { sessionId: session.sessionId, channel: 'assistant' });

      return {
        actions: [action],
        undoStack: [{ type: 'tag', id: tag.id, name: tag.name, href: '/settings/tags' }],
        reply: this.buildExecutionReply(session.locale, action, []),
      };
    }

    const created = await this.folderService.create(orgId, user.id, {
      name: session.draft.name!,
      description: session.draft.description,
      parentId: session.draft.parentFolderId,
    });
    const folder = created.data as { id: string; name: string };
    const action: AssistantExecutedAction = { type: 'folder', id: folder.id, name: folder.name, href: '/settings/folders' };
    await this.logAssistantAction(orgId, user.id, 'folder', folder.id, 'assistant.create_folder', folder, { sessionId: session.sessionId, channel: 'assistant' });

    return {
      actions: [action],
      undoStack: [{ type: 'folder', id: folder.id, name: folder.name, href: '/settings/folders' }],
      reply: this.buildExecutionReply(session.locale, action, []),
    };
  }

  private async logAssistantAction(orgId: string, actorId: string, entityType: string, entityId: string, action: string, after?: unknown, metadata?: unknown) {
    await this.auditLogService.log(orgId, actorId, entityType, entityId, action, undefined, after, metadata);
  }

  private buildActionResponse(
    session: AssistantActionSessionRecord,
    reply: string,
    citations: GuideCitation[],
    executedActions: AssistantExecutedAction[],
    usedModel: GuideAssistantResponse['usedModel'] | undefined,
  ): AssistantActionChatResponse {
    return {
      sessionId: session.sessionId,
      mode: session.intent === 'guide' ? 'guide' : 'action',
      reply,
      citations,
      inferenceNotes: [],
      usedModel,
      session: this.serializeSession(session),
      executedActions,
      canUndo: session.undoStack.length > 0,
    };
  }

  private serializeSession(session: AssistantActionSessionRecord): AssistantSessionState {
    return {
      sessionId: session.sessionId,
      intent: session.intent,
      status: session.status,
      pendingFields: this.buildPendingFieldDescriptors(session.pendingFields, session.locale),
      draft: this.buildDraftSummary(session),
      canUndo: session.undoStack.length > 0,
    };
  }

  private buildDraftSummary(session: AssistantActionSessionRecord): AssistantDraftSummary {
    return {
      title: session.draft.title,
      contentPreview: session.draft.content ? this.truncate(session.draft.content, 120) : undefined,
      description: session.draft.description,
      folderName: session.draft.folderName,
      tagNames: session.draft.tagNames,
      name: session.draft.name,
      parentFolderName: session.draft.parentFolderName,
    };
  }

  private buildPendingFieldDescriptors(keys: AssistantPendingFieldKey[], locale: string): AssistantPendingField[] {
    return keys.map((key) => ({
      key,
      label: this.getFieldLabel(locale, key),
      required: ['title', 'content', 'name'].includes(key),
    }));
  }

  private computePendingFields(session: AssistantActionSessionRecord): AssistantPendingFieldKey[] {
    if (session.intent === 'create_prompt') {
      const pending: AssistantPendingFieldKey[] = [];
      if (!session.draft.title) pending.push('title');
      if (!session.draft.content) pending.push('content');
      return pending;
    }

    if (session.intent === 'create_tag' || session.intent === 'create_folder') {
      return session.draft.name ? [] : ['name'];
    }

    return [];
  }

  private hasPendingRequiredFields(session: AssistantActionSessionRecord) {
    return this.computePendingFields(session).length > 0;
  }

  private buildCollectionReply(session: AssistantActionSessionRecord) {
    const labels = this.buildPendingFieldDescriptors(session.pendingFields, session.locale).map((field) => field.label);

    if (session.intent === 'create_prompt') {
      return this.getLocalizedText(
        session.locale,
        `根据当前文档，新建提示词至少需要标题和内容。现在还缺：${labels.join('、')}。请直接把这些内容发给我，我会继续帮你创建。`,
        `Based on the current docs, creating a prompt requires at least a title and content. I still need: ${labels.join(', ')}. Send them to me directly and I will continue.`,
      );
    }

    if (session.intent === 'create_tag') {
      return this.getLocalizedText(
        session.locale,
        `我可以帮你创建标签。现在还缺：${labels.join('、')}。`,
        `I can create the tag for you. I still need: ${labels.join(', ')}.`,
      );
    }

    return this.getLocalizedText(
      session.locale,
      `我可以帮你创建文件夹。现在还缺：${labels.join('、')}。`,
      `I can create the folder for you. I still need: ${labels.join(', ')}.`,
    );
  }

  private buildMissingResourceReply(session: AssistantActionSessionRecord) {
    const pending = session.pendingResourceConfirmation;
    const parts: string[] = [];
    if (pending?.folders.length) {
      parts.push(this.getLocalizedText(session.locale, `文件夹：${pending.folders.join('、')}`, `folders: ${pending.folders.join(', ')}`));
    }
    if (pending?.tags.length) {
      parts.push(this.getLocalizedText(session.locale, `标签：${pending.tags.join('、')}`, `tags: ${pending.tags.join(', ')}`));
    }

    return this.getLocalizedText(
      session.locale,
      `我发现这些资源还不存在：${parts.join('；')}。要不要我一起创建？直接回复“是”或“否”。`,
      `I found resources that do not exist yet: ${parts.join('; ')}. Should I create them too? Reply with yes or no.`,
    );
  }

  private buildExecutionReply(locale: string, action: AssistantExecutedAction, autoCreated: AssistantExecutedAction[]) {
    const autoCreatedText = autoCreated.length > 0
      ? this.getLocalizedText(
          locale,
          `\n\n我还顺手创建了：${autoCreated.map((item) => item.name).join('、')}。`,
          `\n\nI also created: ${autoCreated.map((item) => item.name).join(', ')}.`,
        )
      : '';

    if (action.type === 'prompt') {
      return this.getLocalizedText(
        locale,
        `已经帮你创建提示词《${action.name}》。你可以直接打开继续编辑。${autoCreatedText}`,
        `I created the prompt "${action.name}" for you. You can open it and keep editing.${autoCreatedText}`,
      );
    }

    if (action.type === 'tag') {
      return this.getLocalizedText(
        locale,
        `已经帮你创建标签“${action.name}”。`,
        `I created the tag "${action.name}" for you.`,
      );
    }

    return this.getLocalizedText(
      locale,
      `已经帮你创建文件夹“${action.name}”。`,
      `I created the folder "${action.name}" for you.`,
    );
  }

  private buildUndoReply(locale: string, undone: AssistantExecutedAction[]) {
    return this.getLocalizedText(
      locale,
      `已撤销最近一步：${undone.map((item) => item.name).join('、')}。`,
      `The latest action was undone: ${undone.map((item) => item.name).join(', ')}.`,
    );
  }

  private resolveIntent(session: AssistantActionSessionRecord, message: string): AssistantIntent {
    if (session.intent !== 'guide' && session.status !== 'idle') {
      return session.intent;
    }

    const normalized = message.toLowerCase();
    if (/(创建|新建|添加|帮我建|帮我创建|create|add).*(提示词|prompt)|(提示词|prompt).*(创建|新建|添加|create|add)/i.test(normalized)) {
      return 'create_prompt';
    }
    if (/(创建|新建|添加|create|add).*(标签|tag)|(标签|tag).*(创建|新建|添加|create|add)/i.test(normalized)) {
      return 'create_tag';
    }
    if (/(创建|新建|添加|create|add).*(文件夹|目录|folder)|(文件夹|目录|folder).*(创建|新建|添加|create|add)/i.test(normalized)) {
      return 'create_folder';
    }
    return 'guide';
  }

  private parseConfirmation(message: string) {
    if (/^(是|好|可以|行|确认|yes|yep|sure|ok)/i.test(message.trim())) return 'yes';
    if (/^(否|不|不用|不要|no|nope|cancel)/i.test(message.trim())) return 'no';
    return 'unknown';
  }

  private isCancelMessage(message: string) {
    return /^(取消|算了|停止|cancel|stop)$/i.test(message.trim());
  }

  private createSessionRecord(orgId: string, userId: string, locale: string, pathname?: string): AssistantActionSessionRecord {
    return {
      sessionId: randomUUID(),
      orgId,
      userId,
      locale,
      pathname,
      intent: 'guide',
      status: 'idle',
      draft: {
        tagNames: [],
        tagIds: [],
      },
      pendingFields: [],
      undoStack: [],
      executedActions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  private async loadSession(orgId: string, user: AuthenticatedUser, dto: { sessionId?: string; locale?: string; pathname?: string; message: string }) {
    const locale = dto.locale ?? 'zh-CN';
    const pathname = dto.pathname;
    if (!dto.sessionId) {
      return this.createSessionRecord(orgId, user.id, locale, pathname);
    }

    const raw = await this.redis.get(this.getSessionKey(orgId, user.id, dto.sessionId));
    if (!raw) {
      return {
        ...this.createSessionRecord(orgId, user.id, locale, pathname),
        sessionId: dto.sessionId,
      };
    }

    const parsed = JSON.parse(raw) as AssistantActionSessionRecord;
      return {
        ...parsed,
        locale,
        pathname: pathname ?? parsed.pathname,
        draft: {
          ...parsed.draft,
          tagNames: parsed.draft.tagNames ?? [],
          tagIds: parsed.draft.tagIds ?? [],
        },
      };
  }

  private async saveSession(session: AssistantActionSessionRecord) {
    await this.redis.set(this.getSessionKey(session.orgId, session.userId, session.sessionId), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
  }

  private getSessionKey(orgId: string, userId: string, sessionId: string) {
    return `assistant:session:${orgId}:${userId}:${sessionId}`;
  }

  private async findFolderByName(orgId: string, name: string) {
    return this.prisma.folder.findFirst({
      where: {
        orgId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    });
  }

  private async resolveTagsByName(orgId: string, tagNames: string[]) {
    if (tagNames.length === 0) return [];
    const unique = Array.from(new Set(tagNames.map((item) => item.trim()).filter(Boolean)));
    const tags = await Promise.all(unique.map((name) =>
      this.prisma.tag.findFirst({
        where: { orgId, name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true },
      }),
    ));
    return tags.filter((tag): tag is { id: string; name: string } => Boolean(tag));
  }

  private extractPattern(message: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
      const match = message.match(pattern);
      const value = match?.[1]?.trim();
      if (value) return value;
    }
    return undefined;
  }

  private extractQuotedValue(message: string) {
    const match = message.match(/[“"']([^”"']+)[”"']/);
    return match?.[1]?.trim();
  }

  private parseList(raw: string) {
    return raw
      .split(/[、,，/]/)
      .map((item) => this.cleanResourceName(item))
      .filter(Boolean);
  }

  private cleanResourceName(value: string) {
    return value.trim().replace(/[。；;，,]+$/g, '');
  }

  private truncate(value: string, maxLength: number) {
    const compact = value.replace(/\s+/g, ' ').trim();
    return compact.length > maxLength ? `${compact.slice(0, maxLength - 3)}...` : compact;
  }

  private looksStructured(message: string) {
    return /[:：]/.test(message) || /标题|内容|描述|文件夹|标签|name|content|title|folder|tag/i.test(message);
  }

  private getFieldLabel(locale: string, key: AssistantPendingFieldKey) {
    const zh: Record<AssistantPendingFieldKey, string> = {
      title: '标题',
      content: '内容',
      description: '描述',
      folder: '文件夹',
      tags: '标签',
      name: '名称',
      parentFolder: '父级文件夹',
    };
    const en: Record<AssistantPendingFieldKey, string> = {
      title: 'title',
      content: 'content',
      description: 'description',
      folder: 'folder',
      tags: 'tags',
      name: 'name',
      parentFolder: 'parent folder',
    };

    return locale === 'en-US' ? en[key] : zh[key];
  }

  private getLocalizedText(locale: string, zh: string, en: string) {
    return locale === 'en-US' ? en : zh;
  }

  private async getActionCitations(intent: AssistantIntent) {
    const query = intent === 'create_prompt'
      ? 'how to create a prompt'
      : intent === 'create_tag'
        ? 'how to create a tag'
        : 'how to create a folder';
    const chunks = await this.knowledgeService.search(query, undefined, 2);
    return this.selectCitations([1, 2], chunks);
  }

  private async generateModelResponse(
    runtime: AssistantRuntime,
    question: string,
    locale: string,
    pathname: string | undefined,
    user: AuthenticatedUser,
    chunks: KnowledgeChunk[],
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) {
    const adapter = this.adapterFactory.getAdapter(runtime.provider);
    const prompt = this.buildSystemPrompt(locale);
    const messages: ChatMessage[] = [
      { role: 'system', content: prompt },
      ...history.slice(-6).map((item) => ({ role: item.role, content: item.content.slice(0, 2000) })),
      {
        role: 'user',
        content: [
          `Current route: ${pathname ?? '/'}`,
          `User: ${user.displayName ?? user.email}`,
          `Question: ${question}`,
          '',
          'Knowledge sources:',
          ...chunks.map(
            (chunk, index) =>
              `[${index + 1}] ${chunk.title} > ${chunk.section}\nPath: ${chunk.sourcePath}\n${chunk.content}`,
          ),
        ].join('\n'),
      },
    ];

    const stream = adapter.chat(messages, {
      apiKey: runtime.apiKey,
      model: runtime.model,
      baseUrl: runtime.baseUrl,
      temperature: 0.2,
      maxTokens: 900,
    });

    let text = '';
    while (true) {
      const { value, done } = await stream.next();
      if (done) break;
      text += value;
    }

    return text.trim();
  }

  private buildSystemPrompt(locale: string) {
    return [
      'You are PromptBase Guide Assistant.',
      'You only answer questions about using, operating, configuring, or understanding this PromptBase platform.',
      'Use only the provided knowledge sources as authoritative facts.',
      'If the answer is not directly stated in the sources, you may make a limited inference, but you must clearly list it under inferenceNotes.',
      'Never invent pages, APIs, permissions, or behaviors.',
      'Prefer concise, practical answers with steps.',
      `Reply in ${locale === 'en-US' ? 'English' : 'Simplified Chinese'}.`,
      'Return strict JSON only with this shape:',
      '{"answer":"markdown string","citationNumbers":[1,2],"inferenceNotes":["..."]}',
      'citationNumbers must only contain source indices that were provided.',
    ].join(' ');
  }

  private parseModelPayload(raw: string, sourceCount: number): AssistantModelPayload {
    const jsonText = this.extractJson(raw);

    try {
      const parsed = JSON.parse(jsonText) as Partial<AssistantModelPayload>;
      const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
      const citationNumbers = Array.isArray(parsed.citationNumbers)
        ? parsed.citationNumbers
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 1 && value <= sourceCount)
        : [];
      const inferenceNotes = Array.isArray(parsed.inferenceNotes)
        ? parsed.inferenceNotes.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

      if (!answer) {
        throw new Error('Missing answer');
      }

      return {
        answer,
        citationNumbers,
        inferenceNotes,
      };
    } catch {
      return {
        answer: raw.trim() || '助手暂时未能生成结构化回答，请稍后重试。',
        citationNumbers: sourceCount > 0 ? [1] : [],
        inferenceNotes: ['模型未返回结构化 JSON，本次结果按原文回退展示。'],
      };
    }
  }

  private extractJson(raw: string) {
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return raw.slice(start, end + 1);
    }

    return raw;
  }

  private selectCitations(citationNumbers: number[], chunks: KnowledgeChunk[]): GuideCitation[] {
    const selected = (citationNumbers.length > 0 ? citationNumbers : [1, 2])
      .map((value) => chunks[value - 1])
      .filter((chunk): chunk is KnowledgeChunk => Boolean(chunk));

    const unique = new Map<string, GuideCitation>();
    for (const chunk of selected) {
      unique.set(chunk.id, {
        id: chunk.id,
        title: chunk.title,
        section: chunk.section,
        sourcePath: chunk.sourcePath,
        excerpt: this.buildExcerpt(chunk.content),
      });
    }

    return [...unique.values()];
  }

  private buildExcerpt(content: string) {
    const compact = content.replace(/\s+/g, ' ').trim();
    return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
  }

  private async resolveRuntime(orgId: string): Promise<AssistantRuntime> {
    const preferred = await this.modelProviderService.findPreferredAssistantProvider(orgId);
    if (preferred) {
      const model = preferred.models[0];
      if (!model) {
        throw new ServiceUnavailableException('Guide assistant organization model is not configured');
      }

      return {
        source: 'organization',
        provider: preferred.provider,
        providerName: preferred.name,
        model,
        baseUrl: preferred.baseUrl ?? undefined,
        apiKey: preferred.apiKey,
      };
    }

    const provider = this.configService.get<string>('GUIDE_ASSISTANT_PROVIDER');
    const model = this.configService.get<string>('GUIDE_ASSISTANT_MODEL');
    const apiKey = this.configService.get<string>('GUIDE_ASSISTANT_API_KEY', '');
    const baseUrl = this.configService.get<string>('GUIDE_ASSISTANT_BASE_URL');

    if (!provider || !model || !MODEL_PROVIDER_PROTOCOLS.includes(provider as ModelProviderProtocol)) {
      throw new ServiceUnavailableException('Guide assistant is not configured');
    }

    return {
      source: 'platform',
      provider: provider as ModelProviderProtocol,
      providerName: 'Platform Default',
      model,
      baseUrl: baseUrl || undefined,
      apiKey,
    };
  }
}
