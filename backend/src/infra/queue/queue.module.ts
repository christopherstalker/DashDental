import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from './queue.names';
import { QueueHealthService } from './queue-health.service';

function getRedisUrl(): string {
  const value = process.env.REDIS_URL?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL is required for production queue processing.');
  }

  return 'redis://localhost:6379';
}

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: getRedisUrl(),
      },
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue(
      { name: QueueNames.webhookIngest },
      { name: QueueNames.webhookProcess },
      { name: QueueNames.outboxDispatch },
      { name: QueueNames.automationExecute },
      { name: QueueNames.slaSweep },
      { name: QueueNames.clinicDbSync },
      { name: QueueNames.aiSummary },
      { name: QueueNames.billingWebhook },
      { name: QueueNames.billingUsageRollup },
      { name: QueueNames.auditExport },
      { name: QueueNames.deadLetter },
    ),
  ],
  providers: [QueueHealthService],
  exports: [BullModule, QueueHealthService],
})
export class QueueModule {}
