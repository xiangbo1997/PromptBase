import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

function parseBullConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const db = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) || 0 : 0;
  return {
    host: parsed.hostname,
    port: Number(parsed.port || '6379'),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db,
  };
}
import { AuthModule } from './auth/auth.module';
import { AssistantModule } from './assistant/assistant.module';
import { FavoriteModule } from './favorite/favorite.module';
import { FolderModule } from './folder/folder.module';
import { ModelProviderModule } from './model-provider/model-provider.module';
import { OrgModule } from './org/org.module';
import { PinModule } from './pin/pin.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromptModule } from './prompt/prompt.module';
import { RedisModule } from './redis/redis.module';
import { SearchModule } from './search/search.module';
import { TagModule } from './tag/tag.module';
import { TestRunModule } from './test-run/test-run.module';
import { ImportExportModule } from './import-export/import-export.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: parseBullConnection(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
      }),
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    AssistantModule,
    OrgModule,
    PromptModule,
    FolderModule,
    TagModule,
    SearchModule,
    FavoriteModule,
    PinModule,
    ModelProviderModule,
    TestRunModule,
    ImportExportModule,
    AuditLogModule,
    HealthModule,
  ],
})
export class AppModule {}
