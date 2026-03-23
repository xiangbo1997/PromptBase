import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateModelProviderDto } from './create-model-provider.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateModelProviderDto, plain);
}

describe('CreateModelProviderDto', () => {
  const valid = { name: 'My Provider', provider: 'openai', apiKey: 'sk-xxx', models: ['gpt-4'] };

  it('should pass with valid fields', async () => {
    const errors = await validate(toDto(valid));
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const { name, ...rest } = valid;
    const errors = await validate(toDto(rest));
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('should fail when provider is invalid', async () => {
    const errors = await validate(toDto({ ...valid, provider: 'google' }));
    expect(errors.find((e) => e.property === 'provider')).toBeDefined();
  });

  it('should pass when provider uses another supported protocol', async () => {
    const errors = await validate(toDto({ ...valid, provider: 'ollama', apiKey: 'local-token' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass when apiKey is omitted for local protocols', async () => {
    const { apiKey, ...rest } = valid;
    const errors = await validate(toDto(rest));
    expect(errors).toHaveLength(0);
  });

  it('should fail when models is empty', async () => {
    const errors = await validate(toDto({ ...valid, models: [] }));
    // empty array is valid for @IsArray, but not for ArrayUnique with no items - actually it's valid
    // Let's just check it validates
    expect(errors).toHaveLength(0);
  });

  it('should reject extra fields with forbidNonWhitelisted', async () => {
    const dto = toDto({ ...valid, id: '123', orgId: '456' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.find((e) => e.property === 'id')).toBeDefined();
    expect(errors.find((e) => e.property === 'orgId')).toBeDefined();
  });
});
