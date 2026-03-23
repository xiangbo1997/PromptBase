import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { ImportExportJob } from "@promptbase/shared";

export function useCreateImportJob(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<ImportExportJob>(`/orgs/${orgId}/import-jobs`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", orgId] });
    },
  });
}

export function useCreateExportJob(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { format: "JSON" | "CSV" | "MARKDOWN"; folderId?: string; tagId?: string; search?: string }) =>
      request<ImportExportJob>(`/orgs/${orgId}/export-jobs`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", orgId] });
    },
  });
}

export function useJob(orgId: string, jobId: string | null) {
  return useQuery({
    queryKey: ["job", orgId, jobId],
    queryFn: () => request<ImportExportJob>(`/orgs/${orgId}/jobs/${jobId}`),
    enabled: !!orgId && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "RUNNING" || status === "QUEUED" ? 2000 : false;
    },
  });
}
