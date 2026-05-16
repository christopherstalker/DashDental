export interface UsageCounterEntity {
  id: string;
  organizationId: string;
  maxUsers: number;
  maxIntegrations: number;
  monthlyMessages: number;
  monthlyAiRuns: number;
  periodUsageJson: {
    users: number;
    integrations: number;
    messages: number;
    aiRuns: number;
  };
}
