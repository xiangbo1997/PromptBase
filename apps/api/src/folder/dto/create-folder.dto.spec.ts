import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateFolderDto } from './create-folder.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateFolderDto, plain);
}

describe('CreateFolderDto', () => {
  it('should pass with valid name', async () => {
    const errors = await validate(toDto({ name: 'My Folder' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields', async () => {
    const errors = await validate(toDto({
      name: 'My Folder',
      description: 'A folder',
      parentId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
    }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const errors = await validate(toDto({}));
    expect(errors.find((e) => e.property === 'name')).toBeDefined();
  });

  it('should reject extra fields like id, orgId, materializedPath', async () => {
    const dto = toDto({ name: 'Test', id: '123', orgId: '456', materializedPath: '/test' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.find((e) => e.property === 'id')).toBeDefined();
    expect(errors.find((e) => e.property === 'orgId')).toBeDefined();
    expect(errors.find((e) => e.property === 'materializedPath')).toBeDefined();
  });
});
