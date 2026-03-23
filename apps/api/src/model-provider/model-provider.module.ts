import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModelProviderController } from './model-provider.controller';
import { ModelProviderCryptoService } from './model-provider.crypto';
import { ModelProviderService } from './model-provider.service';

@Module({
  imports: [PrismaModule, AuthModule, OrgModule],
  controllers: [ModelProviderController],
  providers: [ModelProviderService, ModelProviderCryptoService],
  exports: [ModelProviderService, ModelProviderCryptoService],
})
export class ModelProviderModule {}
