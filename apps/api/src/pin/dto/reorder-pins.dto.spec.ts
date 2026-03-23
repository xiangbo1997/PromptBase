import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ReorderPinsDto } from './reorder-pins.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(ReorderPinsDto, plain);
}

const UUID1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const UUID2 = 'b2c3d4e5-f6a7-4901-bcde-f12345678901';

describe('ReorderPinsDto', () => {
  it('should pass with valid promptIds', async () => {
    const errors = await validate(toDto({ promptIds: [UUID1, UUID2] }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when promptIds is missing', async () => {
    const errors = await validate(toDto({}));
    expect(errors.find((e) => e.property === 'promptIds')).toBeDefined();
  });

  it('should fail when promptIds is empty', async () => {
    const errors = await validate(toDto({ promptIds: [] }));
    expect(errors.find((e) => e.property === 'promptIds')).toBeDefined();
  });

  it('should fail when promptIds contains non-UUID', async () => {
    const errors = await validate(toDto({ promptIds: ['not-uuid'] }));
    expect(errors.find((e) => e.property === 'promptIds')).toBeDefined();
  });

  it('should fail when promptIds has duplicates', async () => {
    const errors = await validate(toDto({ promptIds: [UUID1, UUID1] }));
    expect(errors.find((e) => e.property === 'promptIds')).toBeDefined();
  });
});
