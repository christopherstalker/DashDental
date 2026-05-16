import { Injectable } from '@nestjs/common';
import { ClinicDbAdapter } from './adapters/clinic-db.adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { WebFormAdapter } from './adapters/web-form.adapter';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly telegramAdapter: TelegramAdapter,
    private readonly webFormAdapter: WebFormAdapter,
    private readonly clinicDbAdapter: ClinicDbAdapter,
  ) {}

  async listOrganizationIntegrations(organizationId: string) {
    return {
      organizationId,
      adapters: [
        await this.telegramAdapter.getHealthSnapshot(),
        await this.webFormAdapter.getHealthSnapshot(),
        await this.clinicDbAdapter.getHealthSnapshot(),
      ],
    };
  }

  async saveClinicDbCredentials(input: {
    organizationId: string;
    actorUserId: string;
    connectionString: string;
    ssl: boolean;
  }) {
    return input;
  }

  async runClinicDbSync(input: { organizationId: string; limit?: number }) {
    return this.clinicDbAdapter.sync(input.organizationId, input.limit);
  }
}
