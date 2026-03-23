import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';

@Module({
  imports: [PrismaModule, AuthModule, OrgModule],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
