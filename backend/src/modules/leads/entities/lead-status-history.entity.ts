import type { LeadStatus } from './lead.entity';

export interface LeadStatusHistoryEntity {
  id: string;
  leadId: string;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  changedBy: string;
  reason?: string;
  createdAt: string;
}
