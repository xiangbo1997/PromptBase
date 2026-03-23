import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";

interface Member {
  id: string;
  status: string;
  joinedAt: string | null;
  user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
  role: { id: string; key: string; name: string };
}

export function useMembers(orgId: string) {
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: () => request<Member[]>(`/orgs/${orgId}/members`),
    enabled: !!orgId,
  });
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; roleKey?: string; displayName?: string }) =>
      request(`/orgs/${orgId}/members/invite`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}
