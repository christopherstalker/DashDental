import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '@app/infra/queue/queue.names';
import { WebhooksService } from '@app/modules/webhooks/webhooks.service';

@Processor(QueueNames.outboxDispatch)
export class OutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(
    job: Job<{ outboxEventId?: string }>,
  ): Promise<{ outboxEventId?: string; state: string; eventName?: string }> {
    const outboxEventId = job.data.outboxEventId;
    if (!outboxEventId) {
      return { state: 'missing-outbox-id' };
    }

    const result = await this.webhooksService.dispatchOutboxEvent(outboxEventId);
    this.logger.debug(
      `Dispatched outbox job ${job.id} for event ${outboxEventId} with state ${result.state}.`,
    );

    return result;
  }
}
