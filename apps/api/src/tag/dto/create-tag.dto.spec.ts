import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTagDto } from './create-tag.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateTagDto, plain);
}

describe('CreateTagDto', () => {
  it('should pass with valid name', async () => {
    const errors = await validate(toDto({ name: 'my-tag' }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const errors = await validate(toDto({}));
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('should reject extra fields like id, orgId, slug', async () => {
    const dto = toDto({ name: 'tag', id: '1', orgId: '2', slug: 'tag' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.find((e) => e.property === 'id')).toBeDefined();
    expect(errors.find((e) => e.property === 'orgId')).toBeDefined();
    expect(errors.find((e) => e.property === 'slug')).toBeDefined();
  });
});
