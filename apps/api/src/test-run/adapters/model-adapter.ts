import type { ModelProviderProtocol } from '@promptbase/shared';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelChatOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ModelInvocationMetrics {
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ModelAdapter {
  readonly provider: ModelProviderProtocol;
  chat(
    messages: ChatMessage[],
    options: ModelChatOptions,
  ): AsyncGenerator<string, ModelInvocationMetrics, void>;
}

export async function* readSseData(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string> {
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundaryIndex = buffer.indexOf('\n\n');

    while (boundaryIndex >= 0) {
      const chunk = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      for (const line of chunk.split(/\r?\n/)) {
        if (line.startsWith('data:')) {
          yield line.slice(5).trim();
        }
      }

      boundaryIndex = buffer.indexOf('\n\n');
    }
  }

  if (buffer.trim().length > 0) {
    for (const line of buffer.split(/\r?\n/)) {
      if (line.startsWith('data:')) {
        yield line.slice(5).trim();
      }
    }
  }
}

export async function* readJsonLines(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<Record<string, unknown>> {
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed) as Record<string, unknown>;
    }
  }

  const tail = buffer.trim();
  if (tail) {
    yield JSON.parse(tail) as Record<string, unknown>;
  }
}

export function joinBaseUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
