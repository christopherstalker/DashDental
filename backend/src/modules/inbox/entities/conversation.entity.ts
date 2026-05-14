export interface ConversationEntity {
  id: string;
  organizationId: string;
  leadId: string;
  provider: string;
  providerThreadId: string;
  status: 'open' | 'closed';
  lastMessageAt: string;
  aiSummary?: string;
}
