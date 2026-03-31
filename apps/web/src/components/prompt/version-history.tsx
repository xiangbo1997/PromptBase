"use client";

import { useState } from "react";
import { useVersions, useRestoreVersion, useVersionDiff } from "@/hooks/use-versions";
import { cn } from "@promptbase/ui";
import { History, RotateCcw, GitCompare, User, Clock } from "lucide-react";
import type { UUID, PromptVersion } from "@promptbase/shared";
import { useI18n } from "@/components/providers/i18n-provider";

interface VersionHistoryProps {
  orgId: UUID;
  promptId: UUID;
  currentVersionId?: UUID | null;
}

export function VersionHistory({ orgId, promptId, currentVersionId }: VersionHistoryProps) {
  const { t, locale } = useI18n();
  const { data: versions, isLoading } = useVersions(orgId, promptId);
  const { mutate: restore, isPending: isRestoring } = useRestoreVersion(orgId, promptId);
  const [diffTargetId, setDiffTargetId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const handleRestore = (versionId: string) => {
    if (window.confirm(t("prompt.restoreVersionConfirm"))) {
      restore(versionId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold mb-2">
        <History className="h-4 w-4 text-primary" />
        <span>{t("prompt.versionHistory")}</span>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {versions?.map((version: PromptVersion & { createdBy?: { displayName?: string | null; email?: string } }) => (
          <div
            key={version.id}
            className={cn(
              "p-4 rounded-lg border bg-card transition-all hover:shadow-sm",
              currentVersionId === version.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded uppercase tracking-wider">
                  v{version.versionNumber}
                </span>
                {currentVersionId === version.id && (
                  <span className="text-[9px] bg-primary text-primary-foreground px-1.5 rounded-full font-bold">
                    {t("prompt.current")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(version.createdAt).toLocaleString(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <User className="h-3 w-3" />
              <span className="truncate">{version.createdBy?.displayName || version.createdBy?.email || t("prompt.unknownUser")}</span>
            </div>

            {version.changeSummary && (
              <p className="text-xs text-muted-foreground/70 italic mb-3">{version.changeSummary}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRestore(version.id)}
                disabled={isRestoring || currentVersionId === version.id}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-30 transition-all"
              >
                <RotateCcw className="h-3 w-3" />
                {t("prompt.restore")}
              </button>
              {currentVersionId && currentVersionId !== version.id && (
                <button
                  onClick={() => setDiffTargetId(diffTargetId === version.id ? null : version.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium transition-all hover:underline",
                    diffTargetId === version.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GitCompare className="h-3 w-3" />
                  {diffTargetId === version.id ? t("prompt.collapseDiff") : t("prompt.compareCurrent")}
                </button>
              )}
            </div>

            {diffTargetId === version.id && currentVersionId && (
              <div className="mt-4 border-t pt-4">
                <DiffViewer orgId={orgId} promptId={promptId} versionId={currentVersionId} compareWithId={version.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffViewer({ orgId, promptId, versionId, compareWithId }: { orgId: string; promptId: string; versionId: string; compareWithId: string }) {
  const { t } = useI18n();
  const { data: diff, isLoading } = useVersionDiff(orgId, promptId, versionId, compareWithId);

  if (isLoading) return <div className="text-xs text-muted-foreground animate-pulse text-center py-4">{t("prompt.comparing")}</div>;
  if (!diff) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="text-green-600">+{diff.summary.added}</span>
        <span className="text-red-600">-{diff.summary.removed}</span>
        <span>{t("prompt.unchangedLines", { count: diff.summary.unchanged })}</span>
      </div>
      <div className="bg-muted/50 rounded-md p-3 text-[11px] font-mono space-y-0.5 overflow-x-auto border border-dashed max-h-64 overflow-y-auto">
        {diff.changes.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              "whitespace-pre min-h-[1.2em] px-1 rounded-sm",
              line.type === "added" && "text-green-700 bg-green-100/50",
              line.type === "removed" && "text-red-700 bg-red-100/50",
            )}
          >
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}{line.content}
          </div>
        ))}
      </div>
    </div>
  );
}
