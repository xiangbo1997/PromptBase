import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgController } from './org.controller';
import { OrgMemberGuard } from './org.guard';
import { OrgService } from './org.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OrgController],
  providers: [OrgService, OrgMemberGuard],
  exports: [OrgService, OrgMemberGuard],
})
export class OrgModule {}
