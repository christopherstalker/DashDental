import { registerAs } from '@nestjs/config';

export default registerAs('billing', () => ({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  prices: {
    starter: process.env.STRIPE_PRICE_STARTER ?? '',
    growth: process.env.STRIPE_PRICE_GROWTH ?? '',
    scale: process.env.STRIPE_PRICE_SCALE ?? '',
  },
}));
