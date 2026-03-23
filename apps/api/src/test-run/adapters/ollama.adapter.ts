import { Injectable } from '@nestjs/common';
import {
  type ChatMessage,
  joinBaseUrl,
  type ModelAdapter,
  type ModelChatOptions,
  type ModelInvocationMetrics,
  readJsonLines,
} from './model-adapter';

@Injectable()
export class OllamaAdapter implements ModelAdapter {
  readonly provider = 'ollama';

  async *chat(
    messages: ChatMessage[],
    options: ModelChatOptions,
  ): AsyncGenerator<string, ModelInvocationMetrics, void> {
    const startedAt = Date.now();
    const baseUrl = options.baseUrl ?? 'http://127.0.0.1:11434';
    const response = await fetch(joinBaseUrl(baseUrl, '/api/chat'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          ...(options.maxTokens !== undefined
            ? { num_predict: options.maxTokens }
            : {}),
        },
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }

    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    for await (const chunk of readJsonLines(response.body)) {
      const content = (chunk.message as { content?: string } | undefined)?.content;
      if (typeof content === 'string' && content.length > 0) {
        yield content;
      }

      if (typeof chunk.prompt_eval_count === 'number') {
        promptTokens = chunk.prompt_eval_count;
      }

      if (typeof chunk.eval_count === 'number') {
        completionTokens = chunk.eval_count;
      }
    }

    return {
      latencyMs: Date.now() - startedAt,
      promptTokens,
      completionTokens,
      totalTokens:
        promptTokens !== undefined && completionTokens !== undefined
          ? promptTokens + completionTokens
          : undefined,
    };
  }

  private async extractError(response: Response): Promise<string> {
    const body = await response.json().catch(async () => ({
      error: response.statusText || await response.text(),
    }));

    if (typeof body?.error === 'string' && body.error.length > 0) {
      return body.error;
    }

    return `Ollama request failed with status ${response.status}`;
  }
}
