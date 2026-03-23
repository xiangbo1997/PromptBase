import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgModule } from '../org/org.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [PrismaModule, AuthModule, OrgModule],
  controllers: [FavoriteController],
  providers: [FavoriteService],
})
export class FavoriteModule {}
