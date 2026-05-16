import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueNames } from '@app/infra/queue/queue.names';
import { WebhooksService } from '@app/modules/webhooks/webhooks.service';

@Processor(QueueNames.webhookProcess)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(
    job: Job<{ receiptId?: string }>,
  ): Promise<{ receiptId?: string; state: string; outboxEvents?: number }> {
    const receiptId = job.data.receiptId;
    if (!receiptId) {
      return { state: 'missing-receipt-id' };
    }

    const result = await this.webhooksService.processWebhookReceipt(receiptId);
    this.logger.debug(
      `Processed webhook receipt job ${job.id} for receipt ${receiptId} with state ${result.state}.`,
    );

    return result;
  }
}
