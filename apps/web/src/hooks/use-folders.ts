import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Folder, UUID } from "@promptbase/shared";
import type { FolderTreeNode } from "@/lib/folder-tree";

interface FolderInput {
  name: string;
  description?: string;
  parentId?: UUID;
}

export function useFolders(orgId: UUID) {
  return useQuery({
    queryKey: ["folders", orgId],
    queryFn: () => request<FolderTreeNode[]>(`/orgs/${orgId}/folders`),
    enabled: !!orgId,
  });
}

export function useCreateFolder(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FolderInput) =>
      request<Folder>(`/orgs/${orgId}/folders`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", orgId] });
    },
  });
}

export function useUpdateFolder(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Omit<FolderInput, "parentId"> & { id: UUID }) =>
      request<Folder>(`/orgs/${orgId}/folders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", orgId] });
    },
  });
}

export function useDeleteFolder(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      request(`/orgs/${orgId}/folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", orgId] });
    },
  });
}

export function useMoveFolder(orgId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: UUID; parentId?: UUID | null }) =>
      request<Folder>(`/orgs/${orgId}/folders/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ parentId: parentId ?? null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", orgId] });
    },
  });
}
