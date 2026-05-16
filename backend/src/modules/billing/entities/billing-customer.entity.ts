export interface BillingCustomerEntity {
  id: string;
  organizationId: string;
  externalCustomerId: string;
  provider: 'stripe';
  createdAt: string;
}
