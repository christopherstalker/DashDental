import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ComplianceService } from '@app/modules/compliance/compliance.service';

@Injectable()
export class DataLifecycleScheduler {
  private readonly logger = new Logger(DataLifecycleScheduler.name);

  constructor(private readonly complianceService: ComplianceService) {}

  @Cron('25 3 * * *')
  async runNightlyLifecycleSweep() {
    try {
      await this.complianceService.runDataLifecycleSweep({
        dryRun: false,
        source: 'scheduler',
      });
    } catch (error) {
      this.logger.error(
        `Nightly data lifecycle sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
