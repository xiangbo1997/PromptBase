import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(LoginDto, plain);
}

describe('LoginDto', () => {
  it('should pass with valid email and password', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: '12345678' }));
    expect(errors).toHaveLength(0);
  });

  it('should trim and lowercase email', () => {
    const dto = toDto({ email: '  Test@EXAMPLE.com  ', password: '12345678' });
    expect(dto.email).toBe('test@example.com');
  });

  it('should fail when email is missing', async () => {
    const errors = await validate(toDto({ password: '12345678' }));
    expect(errors.find((e) => e.property === 'email')).toBeDefined();
  });

  it('should fail when email is invalid', async () => {
    const errors = await validate(toDto({ email: 'not-email', password: '12345678' }));
    expect(errors.find((e) => e.property === 'email')).toBeDefined();
  });

  it('should fail when password is missing', async () => {
    const errors = await validate(toDto({ email: 'test@example.com' }));
    expect(errors.find((e) => e.property === 'password')).toBeDefined();
  });

  it('should fail when password is too short', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: '1234567' }));
    expect(errors.find((e) => e.property === 'password')).toBeDefined();
  });
});
