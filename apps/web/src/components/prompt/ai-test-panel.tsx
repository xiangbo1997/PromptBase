"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Play, Loader2, Zap, AlertCircle, Clock } from "lucide-react";
import { useModelProviders } from "@/hooks/use-model-providers";
import { useCreateTestRun, useTestRunStream } from "@/hooks/use-test-runs";
import { cn } from "@promptbase/ui";
import { MODEL_PROVIDER_PROTOCOL_META, type UUID } from "@promptbase/shared";
import { MarkdownResult } from "@/components/prompt/markdown-result";
import { useI18n } from "@/components/providers/i18n-provider";

interface AITestPanelProps {
  orgId: UUID;
  promptId: UUID;
  promptVersionId: UUID | null | undefined;
  variables?: Record<string, string>;
}

export function AITestPanel({ orgId, promptId, promptVersionId, variables }: AITestPanelProps) {
  const { t } = useI18n();
  const { data: providers } = useModelProviders(orgId);
  const [selectedModel, setSelectedModel] = useState("");
  const [testRunId, setTestRunId] = useState<UUID | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const { mutate: createRun, isPending: isCreating } = useCreateTestRun(orgId);
  const { chunks, status, metrics, error, isStreaming } = useTestRunStream(orgId, testRunId);

  const modelOptions = useMemo(() => {
    if (!providers) return [];
    return providers.flatMap((p) =>
      p.models.map((m) => ({
        label: `${p.name} · ${MODEL_PROVIDER_PROTOCOL_META[p.provider].label} · ${m}`,
        value: JSON.stringify({ providerId: p.id, model: m }),
      })),
    );
  }, [providers]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [chunks]);

  const handleRun = () => {
    if (!selectedModel || !promptVersionId) return;
    const { providerId, model } = JSON.parse(selectedModel) as { providerId: UUID; model: string };

    createRun(
      { promptId, promptVersionId, providerId, model, variables },
      { onSuccess: (data) => setTestRunId(data.id) },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-primary" />
          <span>{t("prompt.aiTestRun")}</span>
        </div>
        <div className="grid gap-3 bg-muted/30 p-4 rounded-lg border border-dashed">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("prompt.selectModel")}</label>
            <select
              className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="">{t("prompt.selectModelPlaceholder")}</option>
              {modelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRun}
            disabled={!selectedModel || !promptVersionId || isCreating || isStreaming}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isCreating || isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isStreaming ? t("prompt.running") : t("prompt.runTest")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{t("prompt.output")}</div>
          {metrics && (
            <div className="flex gap-3 text-[10px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {metrics.latencyMs}ms</span>
              {metrics.totalTokens && <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {metrics.totalTokens} tokens</span>}
            </div>
          )}
        </div>
        <div
          ref={outputRef}
          className={cn(
            "bg-card rounded-lg border shadow-sm min-h-[200px] max-h-[400px] overflow-auto font-mono text-sm leading-relaxed",
            error ? "border-destructive/50" : "",
          )}
        >
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs flex items-start gap-2 border-b">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="p-4">
            <MarkdownResult
              content={chunks.join("")}
              isStreaming={isStreaming}
              emptyText={t("prompt.selectModelAndRun")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
