import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './base.integration-adapter';

@Injectable()
export class TelegramAdapter implements IntegrationAdapter {
  readonly provider = 'telegram';

  async getHealthSnapshot() {
    return { provider: this.provider, status: 'active', score: 95 };
  }
}
