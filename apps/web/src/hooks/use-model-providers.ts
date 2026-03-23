import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { ModelProvider, ModelProviderProtocol, UUID } from "@promptbase/shared";

export function useModelProviders(orgId: UUID) {
  return useQuery({
    queryKey: ["model-providers", orgId],
    queryFn: () => request<ModelProvider[]>(`/orgs/${orgId}/model-providers`),
    enabled: !!orgId,
  });
}

export function useCreateModelProvider(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; provider: ModelProviderProtocol; apiKey?: string; baseUrl?: string; models: string[]; isActive?: boolean }) =>
      request<ModelProvider>(`/orgs/${orgId}/model-providers`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-providers", orgId] });
    },
  });
}

export function useUpdateModelProvider(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: UUID;
      name?: string;
      provider?: ModelProviderProtocol;
      apiKey?: string;
      baseUrl?: string;
      models?: string[];
      isActive?: boolean;
    }) =>
      request<ModelProvider>(`/orgs/${orgId}/model-providers/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
          provider: data.provider,
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          models: data.models,
          isActive: data.isActive,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-providers", orgId] });
    },
  });
}

export function useDeleteModelProvider(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      request(`/orgs/${orgId}/model-providers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-providers", orgId] });
    },
  });
}
