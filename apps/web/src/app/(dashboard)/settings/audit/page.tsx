"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useAuditLogs, type AuditLogsFilters } from "@/hooks/use-audit-logs";
import { History, Filter, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function AuditLogPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const [filters, setFilters] = useState<AuditLogsFilters>({ page: 1 });
  const { data, isLoading } = useAuditLogs(orgId, filters);

  const entityTypes = [
    { label: "全部类型", value: "" },
    { label: "提示词", value: "PROMPT" },
    { label: "文件夹", value: "FOLDER" },
    { label: "版本", value: "VERSION" },
    { label: "成员", value: "MEMBER" },
  ];

  const page = filters.page ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          审计日志
        </h1>
        <p className="text-muted-foreground text-sm">追踪组织内的所有操作记录</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border bg-card/50 shadow-sm">
        <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5 min-w-[160px]">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="bg-transparent text-sm outline-none flex-1"
            value={filters.entityType || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, entityType: e.target.value, page: 1 }))}
          >
            {entityTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            className="bg-transparent text-sm outline-none"
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value, page: 1 }))}
          />
          <span className="text-muted-foreground">至</span>
          <input
            type="date"
            className="bg-transparent text-sm outline-none"
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value, page: 1 }))}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b text-muted-foreground font-medium uppercase tracking-wider">
              <th className="px-6 py-3">时间</th>
              <th className="px-6 py-3">操作人</th>
              <th className="px-6 py-3">行为</th>
              <th className="px-6 py-3">对象类型</th>
              <th className="px-6 py-3">对象 ID</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-muted rounded w-full" /></td>
                </tr>
              ))
            ) : data?.items.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-medium">
                  {log.actor?.displayName || log.actor?.email || "系统"}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs border border-primary/20">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{log.entityType}</td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{log.entityId.slice(0, 8)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">共 {data?.total || 0} 条记录</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: page - 1 }))}
            className="p-2 rounded-md border bg-card hover:bg-muted disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm px-2">第 {page} 页</span>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, page: page + 1 }))}
            className="p-2 rounded-md border bg-card hover:bg-muted disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
