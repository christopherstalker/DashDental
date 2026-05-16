import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationsService {
  async provisionClinicWorkspace() {
    return {
      action: 'provision-clinic-workspace',
      creates: ['organization', 'owner membership', 'starter subscription', 'usage counters'],
    };
  }

  async getTenantSettings(organizationId: string) {
    return { organizationId };
  }
}
