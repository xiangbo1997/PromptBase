import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { request } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { TestRun, TestRunStatus, UUID } from "@promptbase/shared";

export function useCreateTestRun(orgId: UUID) {
  return useMutation({
    mutationFn: (data: {
      promptId?: UUID;
      promptVersionId?: UUID;
      providerId: UUID;
      model: string;
      content?: string;
      variables?: Record<string, string>;
    }) =>
      request<TestRun>(`/orgs/${orgId}/test-runs`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}

interface StreamState {
  chunks: string[];
  status: TestRunStatus | null;
  metrics: TestRun["metrics"];
  error: string | null;
  isStreaming: boolean;
}

export function useTestRunStream(orgId: UUID, testRunId: UUID | null) {
  const [state, setState] = useState<StreamState>({
    chunks: [],
    status: null,
    metrics: null,
    error: null,
    isStreaming: false,
  });

  const { token } = useAuthStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

  useEffect(() => {
    if (!testRunId || !token) return;

    let mounted = true;
    const controller = new AbortController();

    const run = async () => {
      setState({ chunks: [], status: "RUNNING", metrics: null, error: null, isStreaming: true });

      try {
        const response = await fetch(`${apiUrl}/orgs/${orgId}/test-runs/${testRunId}/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("连接测试流失败");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("浏览器不支持 ReadableStream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (mounted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            for (const line of part.split("\n")) {
              if (!line.startsWith("event:") && !line.startsWith("data:")) continue;
            }

            const eventMatch = part.match(/^event:\s*(.+)$/m);
            const dataMatch = part.match(/^data:\s*(.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === "chunk") {
              setState((prev) => ({ ...prev, chunks: [...prev.chunks, data.content] }));
            } else if (event === "status") {
              setState((prev) => ({ ...prev, status: data.status }));
            } else if (event === "completed") {
              setState((prev) => ({
                ...prev,
                status: "SUCCEEDED",
                metrics: data.metrics,
                isStreaming: false,
              }));
            } else if (event === "failed") {
              setState((prev) => ({
                ...prev,
                status: "FAILED",
                error: data.errorMessage,
                isStreaming: false,
              }));
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "未知错误",
            isStreaming: false,
            status: "FAILED",
          }));
        }
      }
    };

    run();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [orgId, testRunId, token, apiUrl]);

  const reset = useCallback(() => {
    setState({ chunks: [], status: null, metrics: null, error: null, isStreaming: false });
  }, []);

  return { ...state, reset };
}
