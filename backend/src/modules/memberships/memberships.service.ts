import { Injectable } from '@nestjs/common';

@Injectable()
export class MembershipsService {
  async getActiveMemberships(userId: string) {
    return { userId };
  }

  async inviteUserToOrganization() {
    return {
      action: 'invite-user-to-organization',
      stores: ['user', 'membership', 'audit-log'],
    };
  }
}
