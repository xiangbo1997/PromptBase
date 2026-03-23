import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RefreshDto } from './refresh.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(RefreshDto, plain);
}

describe('RefreshDto', () => {
  it('should pass with valid refreshToken', async () => {
    const errors = await validate(toDto({ refreshToken: 'some-token' }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when refreshToken is missing', async () => {
    const errors = await validate(toDto({}));
    expect(errors.find((e) => e.property === 'refreshToken')).toBeDefined();
  });

  it('should fail when refreshToken is empty', async () => {
    const errors = await validate(toDto({ refreshToken: '' }));
    expect(errors.find((e) => e.property === 'refreshToken')).toBeDefined();
  });
});
