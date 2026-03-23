import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type { Prompt, UUID } from "@promptbase/shared";
import { useEffect, useState } from "react";

export function useSearch(orgId: UUID, query: string, filters?: { folderId?: string; tagId?: string }) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["prompts", "search", orgId, debouncedQuery, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append("q", debouncedQuery);
      if (filters?.folderId) params.append("folderId", filters.folderId);
      if (filters?.tagId) params.append("tagId", filters.tagId);

      return request<Prompt[]>(`/orgs/${orgId}/prompts/search?${params.toString()}`);
    },
    enabled: !!orgId && (!!debouncedQuery || !!filters?.folderId || !!filters?.tagId),
  });
}
