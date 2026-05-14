export interface AiInsightEntity {
  id: string;
  organizationId: string;
  leadId?: string;
  conversationId?: string;
  type: 'conversation_summary' | 'risk_detection' | 'intent_classification' | 'weekly_insight';
  resultJson: Record<string, unknown>;
  model: string;
  promptVersion: string;
  confidence: number;
  costEstimate: number;
  createdAt: string;
}
