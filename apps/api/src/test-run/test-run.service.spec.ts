import { PromptStatus } from '@prisma/client';
import { TestRunService } from './test-run.service';

describe('TestRunService', () => {
  it('creates an archived playground prompt when content-only runs are requested', async () => {
    const promptCreate = jest.fn().mockResolvedValue({
      id: 'prompt-1',
      title: 'Playground Draft: Write a haiku',
    });
    const promptVersionCreate = jest.fn().mockResolvedValue({
      id: 'version-1',
      promptId: 'prompt-1',
      content: 'Write a haiku',
    });
    const promptUpdate = jest.fn().mockResolvedValue({ id: 'prompt-1', currentVersionId: 'version-1' });
    const testRunCreate = jest.fn().mockResolvedValue({ id: 'run-1', status: 'QUEUED' });
    const transactionClient = {
      prompt: { create: promptCreate, update: promptUpdate },
      promptVersion: { create: promptVersionCreate },
    };
    const prisma = {
      promptVersion: { findFirst: jest.fn() },
      prompt: { create: jest.fn(), update: jest.fn() },
      testRun: { create: testRunCreate, findFirst: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) => callback(transactionClient)),
    } as any;
    const modelProviderService = {
      resolveActiveProviderById: jest.fn().mockResolvedValue({
        id: 'provider-1',
        name: 'OpenAI',
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: null,
        models: ['gpt-5.4'],
        isActive: true,
      }),
    } as any;
    const queue = { add: jest.fn().mockResolvedValue(undefined) } as any;
    const redis = { publish: jest.fn().mockResolvedValue(1) } as any;
    const service = new TestRunService(prisma, modelProviderService, queue, redis);

    const run = await service.create('org-1', 'user-1', {
      providerId: 'provider-1',
      model: 'gpt-5.4',
      content: 'Write a haiku',
    } as any);

    expect(prisma.promptVersion.findFirst).not.toHaveBeenCalled();
    expect(promptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org-1',
          createdById: 'user-1',
          updatedById: 'user-1',
          isArchived: true,
          status: PromptStatus.ARCHIVED,
        }),
      }),
    );
    expect(promptVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org-1',
          promptId: 'prompt-1',
          content: 'Write a haiku',
          createdById: 'user-1',
        }),
      }),
    );
    expect(testRunCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'org-1',
        promptId: 'prompt-1',
        promptVersionId: 'version-1',
        requestedById: 'user-1',
        model: 'gpt-5.4',
      }),
    });
    expect(queue.add).toHaveBeenCalledWith('execute', { orgId: 'org-1', testRunId: 'run-1' });
    expect(redis.publish).toHaveBeenCalled();
    expect(run).toEqual({ id: 'run-1', status: 'QUEUED' });
  });
});
