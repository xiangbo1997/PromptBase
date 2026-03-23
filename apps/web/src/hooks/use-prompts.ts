import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Prompt, UUID } from "@promptbase/shared";

interface CreatePromptInput {
  title: string;
  content: string;
  description?: string;
  folderId?: UUID;
  tagIds?: UUID[];
  isTemplate?: boolean;
}

interface UpdatePromptInput {
  title?: string;
  content?: string;
  description?: string;
  folderId?: UUID;
  tagIds?: UUID[];
  isTemplate?: boolean;
}

export interface PromptListFilters {
  folderId?: UUID;
  tagId?: UUID;
  search?: string;
  isTemplate?: boolean;
}

export function usePrompts(orgId: UUID, filters?: PromptListFilters) {
  return useQuery({
    queryKey: ["prompts", orgId, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.folderId) params.set("folderId", filters.folderId);
      if (filters?.tagId) params.set("tagId", filters.tagId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.isTemplate !== undefined) params.set("isTemplate", String(filters.isTemplate));

      const query = params.toString();
      return request<Prompt[]>(`/orgs/${orgId}/prompts${query ? `?${query}` : ""}`);
    },
    enabled: !!orgId,
  });
}

export function usePrompt(orgId: UUID, id: UUID) {
  return useQuery({
    queryKey: ["prompt", orgId, id],
    queryFn: () => request<Prompt>(`/orgs/${orgId}/prompts/${id}`),
    enabled: !!orgId && !!id,
  });
}

export function useCreatePrompt(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePromptInput) =>
      request<Prompt>(`/orgs/${orgId}/prompts`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", orgId] });
    },
  });
}

export function useUpdatePrompt(orgId: UUID, id: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePromptInput) =>
      request<Prompt>(`/orgs/${orgId}/prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prompt", orgId, id] });
    },
  });
}

export function useDeletePrompt(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      request(`/orgs/${orgId}/prompts/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["prompts", orgId] });
      queryClient.invalidateQueries({ queryKey: ["favorites", orgId] });
      queryClient.invalidateQueries({ queryKey: ["pins", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prompt", orgId, id] });
    },
  });
}
