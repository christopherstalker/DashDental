export type IntegrationProvider =
  | 'telegram'
  | 'web_form'
  | 'instagram'
  | 'whatsapp'
  | 'clinic_database';

export type IntegrationStatus = 'active' | 'pending' | 'degraded' | 'disconnected';

export interface IntegrationEntity {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  encryptedCredentials: string;
  webhookSecret?: string;
  healthScore: number;
  errorState?: string;
  lastSyncAt?: string;
}
