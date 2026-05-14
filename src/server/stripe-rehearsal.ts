type StripeRehearsalEnv = {
  [key: string]: string | undefined;
};

export type StripeRehearsalCheck = {
  description: string;
  id: string;
  ok: boolean;
  remediation: string;
};

export function buildStripeLiveModeRehearsalPlan(
  env: StripeRehearsalEnv = process.env,
) {
  const billingProvider = env.BILLING_PROVIDER?.trim();
  const checks: StripeRehearsalCheck[] = [
    {
      description: "Billing provider is set to stripe or hybrid.",
      id: "billing_provider_stripe_ready",
      ok: billingProvider === "stripe" || billingProvider === "hybrid",
      remediation: "Set BILLING_PROVIDER=stripe or BILLING_PROVIDER=hybrid in staging.",
    },
    {
      description: "APP_URL is a public HTTPS hostname used for Checkout and Portal redirects.",
      id: "app_url_https",
      ok: Boolean(env.APP_URL?.startsWith("https://")),
      remediation: "Set APP_URL to the staging HTTPS hostname before Checkout rehearsal.",
    },
    {
      description: "Stripe secret key is live-mode.",
      id: "stripe_secret_key_live",
      ok: Boolean(env.STRIPE_SECRET_KEY?.startsWith("sk_live_")),
      remediation: "Use a restricted live-mode secret key from the staging Stripe account.",
    },
    {
      description: "Stripe webhook signing secret is configured.",
      id: "stripe_webhook_secret",
      ok: Boolean(env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")),
      remediation: "Set STRIPE_WEBHOOK_SECRET from the Stripe webhook endpoint.",
    },
    {
      description: "Starter price id is configured.",
      id: "stripe_price_starter",
      ok: Boolean(env.STRIPE_PRICE_STARTER?.startsWith("price_")),
      remediation: "Set STRIPE_PRICE_STARTER to the live Stripe Price id.",
    },
    {
      description: "Growth price id is configured.",
      id: "stripe_price_growth",
      ok: Boolean(env.STRIPE_PRICE_GROWTH?.startsWith("price_")),
      remediation: "Set STRIPE_PRICE_GROWTH to the live Stripe Price id.",
    },
    {
      description: "Scale price id is configured.",
      id: "stripe_price_scale",
      ok: Boolean(env.STRIPE_PRICE_SCALE?.startsWith("price_")),
      remediation: "Set STRIPE_PRICE_SCALE to the live Stripe Price id.",
    },
  ];

  return {
    checks,
    status: checks.every((check) => check.ok) ? "ready" : "blocked",
  } as const;
}
