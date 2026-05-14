import { Injectable } from '@nestjs/common';

@Injectable()
export class LeadsService {
  async getLeadPipeline(organizationId: string) {
    return { organizationId };
  }

  async updateLeadStatus(input: {
    organizationId: string;
    leadId: string;
    status: string;
    actorUserId: string;
  }) {
    return input;
  }

  async upsertLeadFromWebhook(input: {
    organizationId: string;
    provider: string;
    providerContactId: string;
  }) {
    return input;
  }
}
