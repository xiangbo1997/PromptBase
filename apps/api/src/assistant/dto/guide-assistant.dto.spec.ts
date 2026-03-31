import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuideAssistantDto } from './guide-assistant.dto';

function toDto(plain: Record<string, unknown>) {
  return plainToInstance(GuideAssistantDto, plain);
}

describe('GuideAssistantDto', () => {
  it('passes with a minimal valid payload', async () => {
    const errors = await validate(toDto({ question: 'How do I create a prompt?' }));
    expect(errors).toHaveLength(0);
  });

  it('passes with history and locale', async () => {
    const errors = await validate(toDto({
      question: 'How do imports work?',
      pathname: '/prompts',
      locale: 'en-US',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ],
    }));
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid history roles', async () => {
    const errors = await validate(toDto({
      question: 'test',
      history: [{ role: 'system', content: 'nope' }],
    }));

    expect(errors.find((error) => error.property === 'history')).toBeDefined();
  });
});
