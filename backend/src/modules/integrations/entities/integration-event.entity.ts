export interface IntegrationEventEntity {
  id: string;
  organizationId: string;
  provider: string;
  providerEventId: string;
  status: 'received' | 'processed' | 'failed' | 'dead_letter';
  payloadJson: Record<string, unknown>;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}
