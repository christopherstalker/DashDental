import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('Redis service initialized. Wire ioredis client here.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Redis service shutdown.');
  }
}
