import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  it('falls back to the first source when the model output is not structured JSON', () => {
    const service = new AssistantService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const parsed = (service as any).parseModelPayload('plain text answer', 2);

    expect(parsed.answer).toBe('plain text answer');
    expect(parsed.citationNumbers).toEqual([1]);
    expect(parsed.inferenceNotes).toEqual(['模型未返回结构化 JSON，本次结果按原文回退展示。']);
  });

  it('parses structured JSON and filters invalid citation ids', () => {
    const service = new AssistantService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const parsed = (service as any).parseModelPayload(
      JSON.stringify({
        answer: 'Use `/prompts/new` to create a prompt.',
        citationNumbers: [1, 9, '2'],
        inferenceNotes: ['This is inferred from the create flow.'],
      }),
      2,
    );

    expect(parsed.answer).toContain('/prompts/new');
    expect(parsed.citationNumbers).toEqual([1, 2]);
    expect(parsed.inferenceNotes).toEqual(['This is inferred from the create flow.']);
  });
});
