import type { ModelProviderProtocol } from '@promptbase/shared';
import { NotFoundException } from '@nestjs/common';
import { AdapterFactory } from './adapter.factory';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { OllamaAdapter } from './ollama.adapter';
import { OpenAIAdapter } from './openai.adapter';

describe('AdapterFactory', () => {
  const factory = new AdapterFactory(
    new OpenAIAdapter(),
    new AnthropicAdapter(),
    new GeminiAdapter(),
    new OllamaAdapter(),
  );
  const supportedCases: Array<[ModelProviderProtocol, new () => object]> = [
    ['openai', OpenAIAdapter],
    ['anthropic', AnthropicAdapter],
    ['gemini', GeminiAdapter],
    ['ollama', OllamaAdapter],
  ];

  it.each(supportedCases)('should resolve %s adapter', (provider, expectedClass) => {
    expect(factory.getAdapter(provider)).toBeInstanceOf(expectedClass);
  });

  it('should throw for unsupported providers', () => {
    expect(() => factory.getAdapter('unknown' as ModelProviderProtocol)).toThrow(NotFoundException);
  });
});
