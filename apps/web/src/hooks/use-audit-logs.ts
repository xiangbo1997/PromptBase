import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { AuditLog } from "@promptbase/shared";

export interface AuditLogsFilters {
  page?: number;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
}

export function useAuditLogs(orgId: string, filters?: AuditLogsFilters) {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        queryParams.set(key, String(value));
      }
    });
  }

  return useQuery({
    queryKey: ["audit-logs", orgId, filters],
    queryFn: () =>
      request<{ items: AuditLog[]; total: number }>(
        `/orgs/${orgId}/audit-logs?${queryParams.toString()}`
      ),
    enabled: !!orgId,
  });
}
