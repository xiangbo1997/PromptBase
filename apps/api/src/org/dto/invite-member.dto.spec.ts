import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InviteMemberDto } from './invite-member.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(InviteMemberDto, plain);
}

describe('InviteMemberDto', () => {
  it('should pass with valid email', async () => {
    const errors = await validate(toDto({ email: 'user@example.com' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with all optional fields', async () => {
    const errors = await validate(toDto({ email: 'user@example.com', displayName: 'John', roleKey: 'admin' }));
    expect(errors).toHaveLength(0);
  });

  it('should trim and lowercase email', () => {
    const dto = toDto({ email: '  User@EXAMPLE.com  ' });
    expect(dto.email).toBe('user@example.com');
  });

  it('should fail when email is invalid', async () => {
    const errors = await validate(toDto({ email: 'not-email' }));
    expect(errors.find((e) => e.property === 'email')).toBeDefined();
  });

  it('should fail when displayName exceeds 120 chars', async () => {
    const errors = await validate(toDto({ email: 'user@example.com', displayName: 'x'.repeat(121) }));
    expect(errors.find((e) => e.property === 'displayName')).toBeDefined();
  });
});
