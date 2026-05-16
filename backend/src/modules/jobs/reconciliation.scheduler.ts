import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { IntegrationReconciliationService } from '@app/modules/integrations/integration-reconciliation.service';

@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);
  private isRunning = false;

  constructor(
    private readonly integrationReconciliationService: IntegrationReconciliationService,
  ) {}

  @Interval(60_000)
  async runReconciliationSweep() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const summary =
        await this.integrationReconciliationService.runReconciliationSweep();
      if (summary.skipped) {
        return;
      }

      if (summary.degraded > 0 || summary.restored > 0) {
        this.logger.warn(
          `Reconciliation sweep degraded ${summary.degraded} integration(s) and restored ${summary.restored} integration(s).`,
        );
      }
    } finally {
      this.isRunning = false;
    }
  }
}
