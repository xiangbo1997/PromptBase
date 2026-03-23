"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useMembers, useInviteMember } from "@/hooks/use-team";
import { Users, Plus, Mail, Shield, Loader2 } from "lucide-react";

const roleOptions = [
  { value: "admin", label: "管理员" },
  { value: "editor", label: "编辑者" },
  { value: "viewer", label: "查看者" },
];

const roleLabels: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  editor: "编辑者",
  viewer: "查看者",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "已激活",
  INVITED: "已邀请",
  SUSPENDED: "已停用",
};

export default function TeamPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: members, isLoading } = useMembers(orgId);
  const invite = useInviteMember(orgId);

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("viewer");

  const handleInvite = () => {
    if (!email.trim()) return;
    invite.mutate(
      { email: email.trim(), roleKey },
      {
        onSuccess: () => {
          setEmail("");
          setRoleKey("viewer");
          setShowInvite(false);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">团队管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理团队成员和角色权限</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          邀请成员
        </button>
      </div>

      {showInvite && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium">邀请新成员</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="输入邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="w-full rounded-md border bg-background py-2 pl-10 pr-3 text-sm outline-none ring-primary focus:ring-1"
                />
              </div>
            </div>
            <select
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none ring-primary focus:ring-1"
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={handleInvite}
              disabled={invite.isPending || !email.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "发送邀请"}
            </button>
          </div>
          {invite.isError && (
            <p className="text-sm text-destructive">邀请失败，请重试</p>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            成员列表 ({members?.length ?? 0})
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !members?.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无成员</div>
        ) : (
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {(member.user.displayName ?? member.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {member.user.displayName ?? member.user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{member.user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : member.status === "INVITED"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                    }`}
                  >
                    {statusLabels[member.status] ?? member.status}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    {roleLabels[member.role.key] ?? member.role.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
