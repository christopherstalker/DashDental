export type LeadSource =
  | 'telegram'
  | 'web_form'
  | 'instagram'
  | 'whatsapp'
  | 'clinic_database';

export type LeadStatus =
  | 'new'
  | 'unanswered'
  | 'at_risk'
  | 'in_conversation'
  | 'booked'
  | 'lost';

export type LostReason =
  | 'no_response'
  | 'price'
  | 'chose_competitor'
  | 'spam'
  | 'not_relevant';

export interface LeadEntity {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo?: string;
  providerContactId: string;
  firstMessageAt: string;
  firstHumanResponseAt?: string;
  bookedAt?: string;
  lostReason?: LostReason;
  estimatedValue: number;
  createdAt: string;
  updatedAt: string;
}
