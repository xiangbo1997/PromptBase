"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, RotateCcw, SendHorizontal, Sparkles, X } from "lucide-react";
import { cn } from "@promptbase/ui";
import type {
  AssistantActionChatResponse,
  AssistantExecutedAction,
  AssistantPendingField,
  GuideCitation,
  GuideAssistantModelInfo,
} from "@promptbase/shared";
import { useGuideAssistant, useUndoGuideAssistant } from "@/hooks/use-guide-assistant";
import { useI18n } from "@/components/providers/i18n-provider";
import { useAuthStore } from "@/stores/auth";
import { MarkdownResult } from "@/components/prompt/markdown-result";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: GuideCitation[];
  inferenceNotes?: string[];
  usedModel?: GuideAssistantModelInfo;
  isError?: boolean;
  pendingFields?: AssistantPendingField[];
  executedActions?: AssistantExecutedAction[];
  canUndo?: boolean;
};

const STORAGE_KEY = "promptbase-guide-assistant";

function buildId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function GuideAssistant() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const orgId = useAuthStore((state) => state.orgId) ?? "";
  const { mutateAsync, isPending } = useGuideAssistant(orgId);
  const { mutateAsync: undoAsync, isPending: isUndoPending } = useUndoGuideAssistant(orgId);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { isOpen?: boolean; messages?: AssistantMessage[]; sessionId?: string };
      setIsOpen(Boolean(parsed.isOpen));
      setMessages(Array.isArray(parsed.messages) ? parsed.messages.slice(-20) : []);
      setSessionId(parsed.sessionId);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isOpen,
        sessionId,
        messages: messages.slice(-20),
      }),
    );
  }, [isOpen, messages, sessionId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isPending, isUndoPending]);

  const suggestions = useMemo(() => {
    if (pathname.startsWith("/prompts")) {
      return [
        t("guideAssistant.suggestionCreatePrompt"),
        t("guideAssistant.suggestionActionCreatePrompt"),
        t("guideAssistant.suggestionTemplateVariable"),
      ];
    }

    if (pathname.startsWith("/settings/tags")) {
      return [
        t("guideAssistant.suggestionActionCreateTag"),
        t("guideAssistant.suggestionImportExport"),
        t("guideAssistant.suggestionActionCreateFolder"),
      ];
    }

    return [
      t("guideAssistant.suggestionActionCreatePrompt"),
      t("guideAssistant.suggestionActionCreateTag"),
      t("guideAssistant.suggestionActionCreateFolder"),
    ];
  }, [pathname, t]);

  const getEntityLabel = (type: AssistantExecutedAction["type"]) => {
    if (type === "prompt") return t("guideAssistant.entityPrompt");
    if (type === "tag") return t("guideAssistant.entityTag");
    return t("guideAssistant.entityFolder");
  };

  if (!orgId) {
    return null;
  }

  const appendAssistantResponse = (response: AssistantActionChatResponse) => {
    setSessionId(response.sessionId);
    setMessages((current) => [
      ...current,
      {
        id: buildId("assistant"),
        role: "assistant",
        content: response.reply,
        citations: response.citations,
        inferenceNotes: response.inferenceNotes,
        usedModel: response.usedModel,
        pendingFields: response.session.pendingFields,
        executedActions: response.executedActions,
        canUndo: response.canUndo,
      },
    ]);
  };

  const handleSubmit = async () => {
    const message = input.trim();
    if (!message || !orgId || isPending || isUndoPending) return;

    const userMessage: AssistantMessage = {
      id: buildId("user"),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsOpen(true);

    try {
      const response = await mutateAsync({
        sessionId,
        message,
        pathname,
        locale,
      });
      appendAssistantResponse(response);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : t("guideAssistant.errorGeneric");
      setMessages((current) => [
        ...current,
        { id: buildId("assistant-error"), role: "assistant", content: messageText, isError: true },
      ]);
    }
  };

  const handleUndo = async () => {
    if (!sessionId || isUndoPending || isPending) return;

    try {
      const response = await undoAsync({ sessionId });
      setMessages((current) => [
        ...current,
        {
          id: buildId("assistant-undo"),
          role: "assistant",
          content: response.reply,
          executedActions: response.undoneActions,
          canUndo: response.canUndo,
        },
      ]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : t("guideAssistant.errorGeneric");
      setMessages((current) => [
        ...current,
        { id: buildId("assistant-undo-error"), role: "assistant", content: messageText, isError: true },
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {isOpen ? (
        <div className="flex h-[min(46rem,calc(100vh-7rem))] w-[26rem] max-w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl">
          <div className="flex items-start justify-between border-b bg-gradient-to-br from-primary/10 via-background to-background px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                {t("guideAssistant.badge")}
              </div>
              <h2 className="mt-1 text-lg font-bold">{t("guideAssistant.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("guideAssistant.subtitleAction")}</p>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
              aria-label={t("guideAssistant.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-4 rounded-2xl border border-dashed bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("guideAssistant.welcomeTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("guideAssistant.welcomeBodyAction")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("guideAssistant.suggestionsTitle")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        className="rounded-full border bg-background px-3 py-1.5 text-left text-xs transition-colors hover:border-primary hover:text-primary"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-2xl px-4 py-3",
                  message.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 border bg-background",
                )}
              >
                {message.role === "user" ? (
                  <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                ) : (
                  <div className="space-y-4">
                    <MarkdownResult
                      content={message.content}
                      isStreaming={false}
                      emptyText={t("guideAssistant.emptyAnswer")}
                      className={cn(message.isError && "text-destructive")}
                    />

                    {message.pendingFields && message.pendingFields.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {t("guideAssistant.pendingFields")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {message.pendingFields.map((field) => (
                            <span key={`${message.id}-${field.key}`} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                              {field.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.executedActions && message.executedActions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {t("guideAssistant.executedActions")}
                        </div>
                        <div className="space-y-2">
                          {message.executedActions.map((action) => (
                            <div key={`${message.id}-${action.type}-${action.id}`} className="rounded-2xl bg-muted/40 px-3 py-2 text-xs leading-5">
                              <div className="font-semibold text-foreground">{action.name}</div>
                              <div className="text-muted-foreground">{getEntityLabel(action.type)}</div>
                              {action.href ? (
                                <a href={action.href} className="mt-1 inline-block text-primary underline underline-offset-4">
                                  {t("guideAssistant.openResult")}
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {message.canUndo ? (
                          <button
                            type="button"
                            onClick={() => void handleUndo()}
                            disabled={isUndoPending || isPending}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                          >
                            {isUndoPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            {t("guideAssistant.undo")}
                          </button>
                        ) : null}
                      </div>
                    )}

                    {message.citations && message.citations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {t("guideAssistant.sources")}
                        </div>
                        <div className="space-y-2">
                          {message.citations.map((citation) => (
                            <div key={citation.id} className="rounded-2xl bg-muted/40 px-3 py-2 text-xs leading-5">
                              <div className="font-semibold text-foreground">
                                {citation.title} · {citation.section}
                              </div>
                              <div className="text-muted-foreground">{citation.sourcePath}</div>
                              <div className="mt-1 text-muted-foreground">{citation.excerpt}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.inferenceNotes && message.inferenceNotes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                          {t("guideAssistant.inferenceTitle")}
                        </div>
                        <div className="space-y-1">
                          {message.inferenceNotes.map((note, index) => (
                            <div key={`${message.id}-inference-${index}`} className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.usedModel && (
                      <div className="text-[11px] text-muted-foreground">
                        {t("guideAssistant.modelLabel", {
                          source: message.usedModel.source === "organization"
                            ? t("guideAssistant.modelSourceOrganization")
                            : t("guideAssistant.modelSourcePlatform"),
                          provider: message.usedModel.providerName,
                          model: message.usedModel.model,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {(isPending || isUndoPending) && (
              <div className="mr-8 rounded-2xl border bg-background px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUndoPending ? t("guideAssistant.undoing") : t("guideAssistant.thinking")}
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-background px-4 py-4">
            <div className="rounded-2xl border bg-muted/20 p-2">
              <textarea
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder={t("guideAssistant.inputPlaceholderAction")}
                className="min-h-[4.5rem] w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">{t("guideAssistant.inputHint")}</div>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!input.trim() || isPending || isUndoPending}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {(isPending || isUndoPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                  {t("guideAssistant.send")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group inline-flex items-center gap-3 rounded-full border bg-card px-4 py-3 text-sm font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
      >
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">{t("guideAssistant.open")}</span>
      </button>
    </div>
  );
}
