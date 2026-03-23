import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    let database = false;
    let redis = false;

    try { await this.prisma.$queryRawUnsafe('SELECT 1'); database = true; } catch { /* noop */ }
    try { redis = (await this.redis.ping()) === 'PONG'; } catch { /* noop */ }

    return { status: database && redis ? 'ok' : 'error', database, redis };
  }
}
