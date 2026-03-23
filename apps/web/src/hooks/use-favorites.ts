import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Prompt, UUID } from "@promptbase/shared";

export function useFavorites(orgId: UUID) {
  return useQuery({
    queryKey: ["favorites", orgId],
    queryFn: () => request<Prompt[]>(`/orgs/${orgId}/favorites`),
    enabled: !!orgId,
  });
}

export function useToggleFavorite(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promptId: UUID) =>
      request(`/orgs/${orgId}/prompts/${promptId}/favorite`, { method: "POST" }),
    onSuccess: (_, promptId) => {
      queryClient.invalidateQueries({ queryKey: ["favorites", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prompts", orgId] });
      queryClient.invalidateQueries({ queryKey: ["prompt", orgId, promptId] });
    },
  });
}
