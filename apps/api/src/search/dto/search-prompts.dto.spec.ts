import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SearchPromptsDto } from './search-prompts.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(SearchPromptsDto, plain);
}

describe('SearchPromptsDto', () => {
  it('should pass with valid q', async () => {
    const errors = await validate(toDto({ q: 'hello' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional filters', async () => {
    const errors = await validate(toDto({
      q: 'hello',
      folderId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      page: 2,
      pageSize: 10,
    }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when q is missing', async () => {
    const errors = await validate(toDto({}));
    expect(errors.find((e) => e.property === 'q')).toBeDefined();
  });

  it('should fail when q exceeds 200 chars', async () => {
    const errors = await validate(toDto({ q: 'x'.repeat(201) }));
    expect(errors.find((e) => e.property === 'q')).toBeDefined();
  });

  it('should fail when folderId is not UUID', async () => {
    const errors = await validate(toDto({ q: 'test', folderId: 'bad' }));
    expect(errors.find((e) => e.property === 'folderId')).toBeDefined();
  });
});
