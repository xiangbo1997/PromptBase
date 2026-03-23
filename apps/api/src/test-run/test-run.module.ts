import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModelProviderModule } from '../model-provider/model-provider.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdapterFactory } from './adapters/adapter.factory';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OllamaAdapter } from './adapters/ollama.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { TestRunController } from './test-run.controller';
import { TestRunProcessor } from './test-run.processor';
import { TEST_RUN_QUEUE } from './test-run.constants';
import { TestRunService } from './test-run.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TEST_RUN_QUEUE,
      defaultJobOptions: { removeOnComplete: 100, removeOnFail: 100 },
    }),
    PrismaModule,
    AuthModule,
    OrgModule,
    ModelProviderModule,
  ],
  controllers: [TestRunController],
  providers: [
    TestRunService,
    TestRunProcessor,
    AdapterFactory,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
    OllamaAdapter,
  ],
})
export class TestRunModule {}
