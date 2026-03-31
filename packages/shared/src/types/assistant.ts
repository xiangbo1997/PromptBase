import type { UUID } from "./auth";
import type { ModelProviderProtocol } from "./prompt";

export interface GuideAssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GuideAssistantRequest {
  question: string;
  pathname?: string;
  locale?: string;
  history?: GuideAssistantHistoryMessage[];
}

export interface GuideCitation {
  id: string;
  title: string;
  section: string;
  sourcePath: string;
  excerpt: string;
}

export interface GuideAssistantModelInfo {
  source: "organization" | "platform";
  provider: ModelProviderProtocol;
  providerName: string;
  model: string;
}

export interface GuideAssistantResponse {
  answer: string;
  citations: GuideCitation[];
  inferenceNotes: string[];
  usedModel: GuideAssistantModelInfo;
  fallbackMode: "organization" | "platform";
}

export type AssistantIntent =
  | "guide"
  | "create_prompt"
  | "create_tag"
  | "create_folder";

export type AssistantSessionStatus =
  | "idle"
  | "collecting"
  | "awaiting_confirmation"
  | "executed";

export type AssistantPendingFieldKey =
  | "title"
  | "content"
  | "description"
  | "folder"
  | "tags"
  | "name"
  | "parentFolder";

export type AssistantEntityType = "prompt" | "tag" | "folder";

export interface AssistantPendingField {
  key: AssistantPendingFieldKey;
  label: string;
  required: boolean;
}

export interface AssistantExecutedAction {
  type: AssistantEntityType;
  id: UUID | string;
  name: string;
  href?: string;
  autoCreated?: boolean;
}

export interface AssistantDraftSummary {
  title?: string;
  contentPreview?: string;
  description?: string;
  folderName?: string;
  tagNames?: string[];
  name?: string;
  parentFolderName?: string;
}

export interface AssistantSessionState {
  sessionId: string;
  intent: AssistantIntent;
  status: AssistantSessionStatus;
  pendingFields: AssistantPendingField[];
  draft: AssistantDraftSummary;
  canUndo: boolean;
}

export interface AssistantActionChatRequest {
  sessionId?: string;
  message: string;
  pathname?: string;
  locale?: string;
}

export interface AssistantActionChatResponse {
  sessionId: string;
  mode: "guide" | "action";
  reply: string;
  citations: GuideCitation[];
  inferenceNotes: string[];
  usedModel?: GuideAssistantModelInfo;
  session: AssistantSessionState;
  executedActions: AssistantExecutedAction[];
  canUndo: boolean;
}

export interface AssistantUndoResponse {
  sessionId: string;
  reply: string;
  undoneActions: AssistantExecutedAction[];
  session: AssistantSessionState;
  canUndo: boolean;
}
