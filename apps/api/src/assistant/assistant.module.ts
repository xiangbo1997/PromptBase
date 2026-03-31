import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { FolderModule } from '../folder/folder.module';
import { ModelProviderModule } from '../model-provider/model-provider.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptModule } from '../prompt/prompt.module';
import { RedisModule } from '../redis/redis.module';
import { TagModule } from '../tag/tag.module';
import { AnthropicAdapter } from '../test-run/adapters/anthropic.adapter';
import { AdapterFactory } from '../test-run/adapters/adapter.factory';
import { GeminiAdapter } from '../test-run/adapters/gemini.adapter';
import { OllamaAdapter } from '../test-run/adapters/ollama.adapter';
import { OpenAIAdapter } from '../test-run/adapters/openai.adapter';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { DocKnowledgeService } from './doc-knowledge.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    OrgModule,
    ModelProviderModule,
    PromptModule,
    TagModule,
    FolderModule,
    AuditLogModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    DocKnowledgeService,
    AdapterFactory,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
    OllamaAdapter,
  ],
})
export class AssistantModule {}
