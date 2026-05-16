export interface WebhookEventEntity {
  id: string;
  provider: 'stripe' | 'telegram' | 'meta' | 'web_form';
  providerEventId: string;
  signatureValid: boolean;
  idempotencyKey: string;
  processingState: 'received' | 'queued' | 'processed' | 'failed' | 'dead_letter';
  payloadJson: Record<string, unknown>;
  receivedAt: string;
}
