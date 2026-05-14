import { Injectable } from '@nestjs/common';

@Injectable()
export class StripeService {
  async createCheckoutSession(organizationId: string, plan: string) {
    return { organizationId, plan, provider: 'stripe' };
  }

  async createCustomerPortalSession(organizationId: string) {
    return { organizationId, provider: 'stripe' };
  }
}
