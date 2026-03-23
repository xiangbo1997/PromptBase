import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePromptDto } from './create-prompt.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(CreatePromptDto, plain);
}

describe('CreatePromptDto', () => {
  it('should pass with valid required fields', async () => {
    const dto = toDto({ title: 'Test Prompt', content: 'Hello {{name}}' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields', async () => {
    const dto = toDto({
      title: 'Test',
      content: 'Hello',
      description: 'A description',
      folderId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      tagIds: ['a1b2c3d4-e5f6-4890-abcd-ef1234567890'],
      isTemplate: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when title is missing', async () => {
    const dto = toDto({ content: 'Hello' });
    const errors = await validate(dto);
    const titleError = errors.find((e) => e.property === 'title');
    expect(titleError).toBeDefined();
  });

  it('should fail when content is missing', async () => {
    const dto = toDto({ title: 'Test' });
    const errors = await validate(dto);
    const contentError = errors.find((e) => e.property === 'content');
    expect(contentError).toBeDefined();
  });

  it('should fail with forbidNonWhitelisted for status field', async () => {
    const dto = toDto({ title: 'Test', content: 'Hi', status: 'ACTIVE' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const statusError = errors.find((e) => e.property === 'status');
    expect(statusError).toBeDefined();
  });

  it('should fail with forbidNonWhitelisted for id field', async () => {
    const dto = toDto({ title: 'Test', content: 'Hi', id: '123' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const idError = errors.find((e) => e.property === 'id');
    expect(idError).toBeDefined();
  });

  it('should fail with forbidNonWhitelisted for orgId field', async () => {
    const dto = toDto({ title: 'Test', content: 'Hi', orgId: '123' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.find((e) => e.property === 'orgId')).toBeDefined();
  });

  it('should fail when title exceeds 200 chars', async () => {
    const dto = toDto({ title: 'x'.repeat(201), content: 'Hi' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'title')).toBeDefined();
  });

  it('should fail when folderId is not UUID', async () => {
    const dto = toDto({ title: 'Test', content: 'Hi', folderId: 'not-uuid' });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'folderId')).toBeDefined();
  });

  it('should fail when tagIds contains non-UUID', async () => {
    const dto = toDto({ title: 'Test', content: 'Hi', tagIds: ['not-uuid'] });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'tagIds')).toBeDefined();
  });
});
