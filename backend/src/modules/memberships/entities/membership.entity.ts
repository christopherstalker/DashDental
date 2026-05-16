import type { AppRole } from '@app/common/interfaces/authenticated-user.interface';

export type MembershipStatus = 'active' | 'invited';

export interface MembershipEntity {
  id: string;
  organizationId: string;
  userId: string;
  role: AppRole;
  status: MembershipStatus;
  invitedBy?: string;
}
