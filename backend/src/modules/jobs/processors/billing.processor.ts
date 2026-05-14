import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '@app/infra/queue/queue.names';
import { BillingService } from '@app/modules/billing/billing.service';

@Processor(QueueNames.billingWebhook)
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(private readonly billingService: BillingService) {
    super();
  }

  async process(
    job: Job<{ outboxEventId?: string; organizationId?: string; correlationId?: string }>,
  ): Promise<{
    jobId: string | undefined;
    state: string;
    outboxEventId?: string;
    organizationId?: string;
  }> {
    const outboxEventId = job.data.outboxEventId;
    if (!outboxEventId) {
      return {
        jobId: job.id?.toString(),
        state: 'missing-outbox-id',
      };
    }

    const result = await this.billingService.syncSubscriptionFromOutboxEvent(outboxEventId);
    this.logger.debug(`Syncing billing webhook job ${job.id} for outbox ${outboxEventId}.`);

    return {
      jobId: job.id?.toString(),
      state: result.state,
      outboxEventId,
      organizationId: job.data.organizationId,
    };
  }
}
