import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelProviderCryptoService } from './model-provider.crypto';

function createService(values: Record<string, string | undefined>) {
  const configService = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  return new ModelProviderCryptoService(configService);
}

describe('ModelProviderCryptoService', () => {
  it('encrypts and decrypts with MODEL_KEY_SECRET when configured', () => {
    const service = createService({
      MODEL_KEY_SECRET: 'model-secret',
      JWT_SECRET: 'jwt-secret',
    });

    const encrypted = service.encrypt('sk-live');

    expect(encrypted).not.toBe('sk-live');
    expect(service.decrypt(encrypted)).toBe('sk-live');
  });

  it('falls back to JWT_SECRET when MODEL_KEY_SECRET is absent', () => {
    const service = createService({
      JWT_SECRET: 'jwt-secret',
    });

    const encrypted = service.encrypt('sk-live');

    expect(service.decrypt(encrypted)).toBe('sk-live');
  });

  it('throws a clear error when no encryption secret is configured', () => {
    const service = createService({});

    expect(() => service.encrypt('sk-live')).toThrow(InternalServerErrorException);
    expect(() => service.encrypt('sk-live')).toThrow(
      'MODEL_KEY_SECRET or JWT_SECRET must be configured',
    );
  });
});
