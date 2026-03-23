import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(RegisterDto, plain);
}

describe('RegisterDto', () => {
  it('should pass with valid email and password', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: '12345678' }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional displayName', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: '12345678', displayName: 'John' }));
    expect(errors).toHaveLength(0);
  });

  it('should trim and lowercase email', () => {
    const dto = toDto({ email: '  Test@EXAMPLE.com  ', password: '12345678' });
    expect(dto.email).toBe('test@example.com');
  });

  it('should fail when email is invalid', async () => {
    const errors = await validate(toDto({ email: 'bad', password: '12345678' }));
    expect(errors.find((e) => e.property === 'email')).toBeDefined();
  });

  it('should fail when password is too short', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: '1234' }));
    expect(errors.find((e) => e.property === 'password')).toBeDefined();
  });

  it('should fail when password exceeds 128 chars', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: 'x'.repeat(129) }));
    expect(errors.find((e) => e.property === 'password')).toBeDefined();
  });

  it('should fail when displayName exceeds 120 chars', async () => {
    const errors = await validate(toDto({ email: 'test@example.com', password: '12345678', displayName: 'x'.repeat(121) }));
    expect(errors.find((e) => e.property === 'displayName')).toBeDefined();
  });
});
