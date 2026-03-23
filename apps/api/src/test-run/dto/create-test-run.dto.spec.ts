import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTestRunDto } from './create-test-run.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(CreateTestRunDto, plain);
}

const UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

describe('CreateTestRunDto', () => {
  const valid = {
    promptId: UUID,
    promptVersionId: UUID,
    providerId: UUID,
    model: 'gpt-4',
  };

  it('should pass with valid fields', async () => {
    const errors = await validate(toDto(valid));
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional variables', async () => {
    const errors = await validate(toDto({ ...valid, variables: { name: 'world' } }));
    expect(errors).toHaveLength(0);
  });

  it('should pass with content when prompt references are omitted', async () => {
    const { promptId, promptVersionId, ...rest } = valid;
    const errors = await validate(toDto({ ...rest, content: 'Write a haiku' }));
    expect(errors).toHaveLength(0);
  });

  it('should fail when promptId is missing', async () => {
    const { promptId, ...rest } = valid;
    const errors = await validate(toDto(rest));
    expect(errors.find((e) => e.property === 'promptId')).toBeDefined();
  });

  it('should fail when both prompt references and content are missing', async () => {
    const { promptId, promptVersionId, ...rest } = valid;
    const errors = await validate(toDto(rest));
    expect(errors.find((e) => e.property === 'content')).toBeDefined();
  });

  it('should fail when providerId is invalid', async () => {
    const errors = await validate(toDto({ ...valid, providerId: 'google' }));
    expect(errors.find((e) => e.property === 'providerId')).toBeDefined();
  });

  it('should fail when promptId is not UUID', async () => {
    const errors = await validate(toDto({ ...valid, promptId: 'bad' }));
    expect(errors.find((e) => e.property === 'promptId')).toBeDefined();
  });
});
