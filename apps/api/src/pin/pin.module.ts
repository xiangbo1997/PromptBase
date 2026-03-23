import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PinController } from './pin.controller';
import { PinService } from './pin.service';

@Module({
  imports: [PrismaModule, AuthModule, OrgModule],
  controllers: [PinController],
  providers: [PinService],
})
export class PinModule {}
