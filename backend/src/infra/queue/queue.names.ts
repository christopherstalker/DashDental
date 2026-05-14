export const QueueNames = {
  webhookIngest: 'webhook.ingest',
  webhookProcess: 'webhook.process',
  outboxDispatch: 'outbox.dispatch',
  automationExecute: 'automation.execute',
  slaSweep: 'sla.sweep',
  clinicDbSync: 'clinic-db.sync',
  aiSummary: 'ai.summary',
  billingWebhook: 'billing.webhook',
  billingUsageRollup: 'billing.usage-rollup',
  auditExport: 'audit.export',
  deadLetter: 'dead-letter',
} as const;

export const JobNames = {
  persistWebhook: 'persist-webhook',
  processWebhook: 'process-webhook',
  dispatchOutbox: 'dispatch-outbox',
  sweepSla: 'sweep-sla',
  syncClinicDb: 'sync-clinic-db',
  generateAiSummary: 'generate-ai-summary',
  syncStripeSubscription: 'sync-stripe-subscription',
  rollupUsage: 'rollup-usage',
} as const;
