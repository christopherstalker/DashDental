import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WebhookRecoveryService } from '@app/modules/webhooks/webhook-recovery.service';

@Injectable()
export class RecoveryScheduler {
  private readonly logger = new Logger(RecoveryScheduler.name);
  private isRunning = false;

  constructor(
    private readonly webhookRecoveryService: WebhookRecoveryService,
  ) {}

  @Interval(30_000)
  async runRecoverySweep() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const summary = await this.webhookRecoveryService.runRecoverySweep();
      if (summary.skipped) {
        return;
      }

      if (summary.replayed.receipts > 0 || summary.replayed.outbox > 0) {
        this.logger.warn(
          `Recovery sweep replayed ${summary.replayed.receipts} receipt(s) and ${summary.replayed.outbox} outbox event(s).`,
        );
      }
    } finally {
      this.isRunning = false;
    }
  }
}
