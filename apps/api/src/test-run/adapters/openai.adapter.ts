import { Injectable } from '@nestjs/common';
import {
  type ChatMessage,
  type ModelAdapter,
  type ModelChatOptions,
  type ModelInvocationMetrics,
  joinBaseUrl,
  readSseData,
} from './model-adapter';

@Injectable()
export class OpenAIAdapter implements ModelAdapter {
  readonly provider = 'openai';

  async *chat(
    messages: ChatMessage[],
    options: ModelChatOptions,
  ): AsyncGenerator<string, ModelInvocationMetrics, void> {
    const startedAt = Date.now();
    const baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';

    const response = await fetch(joinBaseUrl(baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }

    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let totalTokens: number | undefined;

    for await (const payload of readSseData(response.body)) {
      if (payload === '[DONE]') break;

      const chunk = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const content = chunk.choices?.[0]?.delta?.content;
      if (typeof content === 'string' && content.length > 0) {
        yield content;
      }

      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
        totalTokens = chunk.usage.total_tokens;
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

    return `OpenAI request failed with status ${response.status}`;
  }
}
