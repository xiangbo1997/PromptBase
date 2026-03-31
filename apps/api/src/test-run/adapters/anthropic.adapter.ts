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
export class AnthropicAdapter implements ModelAdapter {
  readonly provider = 'anthropic';

  async *chat(
    messages: ChatMessage[],
    options: ModelChatOptions,
  ): AsyncGenerator<string, ModelInvocationMetrics, void> {
    const startedAt = Date.now();
    const baseUrl = options.baseUrl ?? 'https://api.anthropic.com/v1';
    const systemInstruction = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter((message) => message.length > 0)
      .join('\n\n');

    const response = await fetch(joinBaseUrl(baseUrl, '/messages'), {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        ...(options.apiKey ? { 'x-api-key': options.apiKey } : {}),
      },
      body: JSON.stringify({
        ...(systemInstruction ? { system: systemInstruction } : {}),
        model: options.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        stream: true,
        messages: messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content,
          })),
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }

    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    for await (const payload of readSseData(response.body)) {
      if (payload.length === 0) continue;

      const chunk = JSON.parse(payload) as {
        type?: string;
        delta?: { text?: string };
        message?: { usage?: { input_tokens?: number } };
        usage?: { output_tokens?: number };
      };

      if (chunk.type === 'message_start') {
        promptTokens = chunk.message?.usage?.input_tokens;
      }

      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta?.text;
        if (typeof text === 'string' && text.length > 0) {
          yield text;
        }
      }

      if (chunk.type === 'message_delta') {
        completionTokens = chunk.usage?.output_tokens;
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
      error: { message: await response.text() },
    }));

    if (body?.error?.message) {
      return String(body.error.message);
    }

    return `Anthropic request failed with status ${response.status}`;
  }
}
