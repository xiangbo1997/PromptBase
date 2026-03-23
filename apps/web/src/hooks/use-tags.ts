import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Tag, UUID } from "@promptbase/shared";

interface TagInput {
  name: string;
  color?: string;
  description?: string;
}

export function useTags(orgId: UUID) {
  return useQuery({
    queryKey: ["tags", orgId],
    queryFn: () => request<Tag[]>(`/orgs/${orgId}/tags`),
    enabled: !!orgId,
  });
}

export function useCreateTag(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TagInput) =>
      request<Tag>(`/orgs/${orgId}/tags`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", orgId] });
    },
  });
}

export function useUpdateTag(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TagInput & { id: UUID }) =>
      request<Tag>(`/orgs/${orgId}/tags/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", orgId] });
    },
  });
}

export function useDeleteTag(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      request<{ id: UUID; deleted: boolean }>(`/orgs/${orgId}/tags/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", orgId] });
    },
  });
}
