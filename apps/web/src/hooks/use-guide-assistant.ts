"use client";

import { useMutation } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type {
  AssistantActionChatRequest,
  AssistantActionChatResponse,
  AssistantUndoResponse,
} from "@promptbase/shared";

export function useGuideAssistant(orgId: string) {
  return useMutation({
    mutationFn: (payload: AssistantActionChatRequest) =>
      request<AssistantActionChatResponse>(`/orgs/${orgId}/assistant/actions/chat`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

export function useUndoGuideAssistant(orgId: string) {
  return useMutation({
    mutationFn: (payload: { sessionId?: string }) =>
      request<AssistantUndoResponse>(`/orgs/${orgId}/assistant/actions/undo`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}
