import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Prompt, UUID } from "@promptbase/shared";

export function usePins(orgId: UUID) {
  return useQuery({
    queryKey: ["pins", orgId],
    queryFn: () => request<Prompt[]>(`/orgs/${orgId}/pins`),
    enabled: !!orgId,
  });
}

export function useTogglePin(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promptId: UUID) =>
      request(`/orgs/${orgId}/prompts/${promptId}/pin`, { method: "POST" }),
    onSuccess: (_, promptId) => {
      queryClient.invalidateQueries({ queryKey: ["pins", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prompts", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prompt", orgId, promptId] });
    },
  });
}

export function useReorderPins(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promptIds: UUID[]) =>
      request(`/orgs/${orgId}/pins/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ promptIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pins", orgId] });
    },
  });
}
