import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { PromptVersion, UUID } from "@promptbase/shared";

interface DiffResponse {
  targetVersion: { id: string; versionNumber: number; createdAt: string; createdBy: { id: string; email: string; displayName: string | null } };
  compareWithVersion: { id: string; versionNumber: number; createdAt: string; createdBy: { id: string; email: string; displayName: string | null } };
  summary: { added: number; removed: number; unchanged: number };
  changes: Array<{ type: "added" | "removed" | "unchanged"; content: string; leftLineNumber: number | null; rightLineNumber: number | null }>;
}

export function useVersions(orgId: UUID, promptId: UUID) {
  return useQuery({
    queryKey: ["versions", orgId, promptId],
    queryFn: () => request<PromptVersion[]>(`/orgs/${orgId}/prompts/${promptId}/versions`),
    enabled: !!orgId && !!promptId,
  });
}

export function useVersion(orgId: UUID, promptId: UUID, versionId: UUID | null) {
  return useQuery({
    queryKey: ["version", orgId, promptId, versionId],
    queryFn: () => request<PromptVersion>(`/orgs/${orgId}/prompts/${promptId}/versions/${versionId}`),
    enabled: !!orgId && !!promptId && !!versionId,
  });
}

export function useVersionDiff(orgId: UUID, promptId: UUID, versionId: string | null, compareWithId: string | null) {
  return useQuery({
    queryKey: ["version-diff", orgId, promptId, versionId, compareWithId],
    queryFn: () => request<DiffResponse>(`/orgs/${orgId}/prompts/${promptId}/versions/${versionId}/diff?compareWith=${compareWithId}`),
    enabled: !!orgId && !!promptId && !!versionId && !!compareWithId,
  });
}

export function useRestoreVersion(orgId: UUID, promptId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: UUID) =>
      request(`/orgs/${orgId}/prompts/${promptId}/restore/${versionId}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt", orgId, promptId] });
      queryClient.invalidateQueries({ queryKey: ["versions", orgId, promptId] });
      queryClient.invalidateQueries({ queryKey: ["prompts", orgId] });
    },
  });
}
