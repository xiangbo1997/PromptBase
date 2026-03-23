"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { Sparkles, Play, Loader2, Clock, Zap } from "lucide-react";
import { useModelProviders } from "@/hooks/use-model-providers";
import { useCreateTestRun, useTestRunStream } from "@/hooks/use-test-runs";
import { cn } from "@promptbase/ui";
import { MODEL_PROVIDER_PROTOCOL_META, type UUID } from "@promptbase/shared";
import { MarkdownResult } from "@/components/prompt/markdown-result";

export default function PlaygroundPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const [content, setContent] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [testRunId, setTestRunId] = useState<UUID | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const { data: providers } = useModelProviders(orgId);
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
    if (!selectedModel || !content.trim()) return;
    const { providerId, model } = JSON.parse(selectedModel) as { providerId: UUID; model: string };

    createRun(
      {
        providerId,
        model,
        content: content.trim(),
      },
      { onSuccess: (data) => setTestRunId(data.id) },
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI 实验室
          </h1>
          <p className="text-muted-foreground text-sm">自由编写并测试提示词效果</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="min-w-[200px] rounded-md border px-3 py-2 text-sm bg-background outline-none focus:ring-1 focus:ring-primary"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="">选择模型...</option>
            {modelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={!selectedModel || !content.trim() || isCreating || isStreaming}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-50"
          >
            {isCreating || isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            开始测试
          </button>
        </div>
      </div>

      <div className="flex-1 grid gap-6 lg:grid-cols-2 min-h-0">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">提示词内容</label>
          <textarea
            className="flex-1 rounded-xl border p-4 bg-background font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            placeholder="在这里输入提示词..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">输出结果</label>
            {metrics && (
              <div className="flex gap-4 text-[10px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {metrics.latencyMs}ms</span>
                {metrics.totalTokens && (
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {metrics.totalTokens} tokens</span>
                )}
              </div>
            )}
          </div>
          <div
            ref={outputRef}
            className={cn(
              "flex-1 overflow-auto rounded-xl border bg-card p-4 shadow-sm",
              error ? "border-destructive/30" : "",
            )}
          >
            {error && <div className="text-destructive mb-2 pb-2 border-b text-xs">{error}</div>}
            <MarkdownResult
              content={chunks.join("")}
              isStreaming={isStreaming}
              emptyText="等待运行结果..."
              className="min-h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
