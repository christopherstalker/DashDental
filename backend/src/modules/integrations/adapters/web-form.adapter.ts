import { Injectable } from '@nestjs/common';
import { IntegrationAdapter } from './base.integration-adapter';

@Injectable()
export class WebFormAdapter implements IntegrationAdapter {
  readonly provider = 'web_form';

  async getHealthSnapshot() {
    return { provider: this.provider, status: 'active', score: 98 };
  }
}
