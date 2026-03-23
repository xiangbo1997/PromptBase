import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryAuditLogDto } from './query-audit-log.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(QueryAuditLogDto, plain);
}

describe('QueryAuditLogDto', () => {
  it('should pass with no fields (all optional)', async () => {
    const errors = await validate(toDto({}));
    expect(errors).toHaveLength(0);
  });

  it('should pass with all fields', async () => {
    const errors = await validate(toDto({
      entityType: 'Prompt',
      action: 'CREATE',
      from: '2024-01-01T00:00:00Z',
      to: '2024-12-31T23:59:59Z',
      page: 1,
      pageSize: 50,
    }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when from is not ISO date', async () => {
    const errors = await validate(toDto({ from: 'not-a-date' }));
    expect(errors.find((e) => e.property === 'from')).toBeDefined();
  });

  it('should fail when entityType exceeds 80 chars', async () => {
    const errors = await validate(toDto({ entityType: 'x'.repeat(81) }));
    expect(errors.find((e) => e.property === 'entityType')).toBeDefined();
  });
});
