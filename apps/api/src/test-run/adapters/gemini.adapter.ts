import { Injectable } from '@nestjs/common';
import {
  type ChatMessage,
  joinBaseUrl,
  type ModelAdapter,
  type ModelChatOptions,
  type ModelInvocationMetrics,
  readSseData,
} from './model-adapter';

@Injectable()
export class GeminiAdapter implements ModelAdapter {
  readonly provider = 'gemini';

  async *chat(
    messages: ChatMessage[],
    options: ModelChatOptions,
  ): AsyncGenerator<string, ModelInvocationMetrics, void> {
    const startedAt = Date.now();
    const baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    const systemInstruction = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter((message) => message.length > 0)
      .join('\n\n');

    const response = await fetch(
      `${joinBaseUrl(baseUrl, `/models/${encodeURIComponent(options.model)}:streamGenerateContent`)}?alt=sse`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(options.apiKey ? { 'x-goog-api-key': options.apiKey } : {}),
        },
        body: JSON.stringify({
          ...(systemInstruction
            ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
            : {}),
          contents: messages
            .filter((message) => message.role !== 'system')
            .map((message) => ({
              role: message.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: message.content }],
            })),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            ...(options.maxTokens !== undefined
              ? { maxOutputTokens: options.maxTokens }
              : {}),
          },
        }),
        signal: options.signal,
      },
    );

    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }

    let emittedText = '';
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let totalTokens: number | undefined;

    for await (const payload of readSseData(response.body)) {
      if (!payload || payload === '[DONE]') continue;

      const chunk = JSON.parse(payload) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const text = chunk.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('') ?? '';

      // Gemini 代理的流式实现不完全一致，这里按“累计文本”与“增量文本”两种情况同时兼容。
      if (text.length > 0) {
        if (text.startsWith(emittedText)) {
          const delta = text.slice(emittedText.length);
          if (delta.length > 0) {
            emittedText = text;
            yield delta;
          }
        } else {
          emittedText += text;
          yield text;
        }
      }

      if (chunk.usageMetadata) {
        promptTokens = chunk.usageMetadata.promptTokenCount;
        completionTokens = chunk.usageMetadata.candidatesTokenCount;
        totalTokens = chunk.usageMetadata.totalTokenCount;
      }
    }

    return {
      latencyMs: Date.now() - startedAt,
      promptTokens,
      completionTokens,
      totalTokens,
    };
  }

  private async extractError(response: Response): Promise<string> {
    const body = await response.json().catch(async () => ({
      error: { message: await response.text() },
    }));

    if (body?.error?.message) {
      return String(body.error.message);
    }

    return `Gemini request failed with status ${response.status}`;
  }
}
