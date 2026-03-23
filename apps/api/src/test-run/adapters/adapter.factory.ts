import { Injectable, NotFoundException } from '@nestjs/common';
import type { ModelProviderProtocol } from '@promptbase/shared';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import type { ModelAdapter } from './model-adapter';
import { OllamaAdapter } from './ollama.adapter';
import { OpenAIAdapter } from './openai.adapter';

@Injectable()
export class AdapterFactory {
  constructor(
    private readonly openaiAdapter: OpenAIAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly geminiAdapter: GeminiAdapter,
    private readonly ollamaAdapter: OllamaAdapter,
  ) {}

  getAdapter(provider: ModelProviderProtocol): ModelAdapter {
    if (provider === 'openai') return this.openaiAdapter;
    if (provider === 'anthropic') return this.anthropicAdapter;
    if (provider === 'gemini') return this.geminiAdapter;
    if (provider === 'ollama') return this.ollamaAdapter;

    throw new NotFoundException(`Unsupported model provider: ${provider}`);
  }
}
