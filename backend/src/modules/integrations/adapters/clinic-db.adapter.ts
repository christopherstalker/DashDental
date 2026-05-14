import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './base.integration-adapter';
import { ReadonlySyncAdapter } from './readonly-sync.adapter';

@Injectable()
export class ClinicDbAdapter implements IntegrationAdapter, ReadonlySyncAdapter {
  readonly provider = 'clinic_database';

  async getHealthSnapshot() {
    return { provider: this.provider, status: 'pending', score: 35 };
  }

  async sync(organizationId: string, limit = 500) {
    return {
      organizationId,
      limit,
      imported: 0,
      updated: 0,
      skipped: 0,
    };
  }
}
