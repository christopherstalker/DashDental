export type BillingPlan = 'starter' | 'growth' | 'scale';

export interface SubscriptionEntity {
  id: string;
  organizationId: string;
  provider: 'stripe';
  plan: BillingPlan;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  externalSubscriptionId: string;
}
