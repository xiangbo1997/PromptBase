import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MoveFolderDto } from './move-folder.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(MoveFolderDto, plain);
}

describe('MoveFolderDto', () => {
  it('should pass with valid parentId', async () => {
    const errors = await validate(toDto({ parentId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with no parentId (move to root)', async () => {
    const errors = await validate(toDto({}));
    expect(errors).toHaveLength(0);
  });

  it('should fail when parentId is not UUID', async () => {
    const errors = await validate(toDto({ parentId: 'not-uuid' }));
    expect(errors.find((e) => e.property === 'parentId')).toBeDefined();
  });
});
