import {
  getBillingProvider,
  getManualBillingDetails,
  getManualBillingMissingFields,
  getOnlineBillingProvider,
  getOnlineBillingProviderLabel,
  isManualBillingConfigured,
  shouldShowManualBilling,
} from "./manual-billing";
import { getPaddleCheckoutReadiness } from "./paddle";
import { isStripeConfigured } from "./stripe";

export type BillingDiagnosticLevel = "pass" | "warn" | "block";

export interface BillingDiagnosticCheck {
  id: string;
  label: string;
  detail: string;
  level: BillingDiagnosticLevel;
}

export interface BillingProviderDiagnostics {
  providerMode: ReturnType<typeof getBillingProvider>;
  onlineProvider: ReturnType<typeof getOnlineBillingProvider>;
  onlineProviderLabel: ReturnType<typeof getOnlineBillingProviderLabel>;
  selfServeCheckoutReady: boolean;
  customerPortalReady: boolean;
  manualFallbackVisible: boolean;
  manualFallbackReady: boolean;
  checks: BillingDiagnosticCheck[];
}

export function getBillingProviderDiagnostics(): BillingProviderDiagnostics {
  const providerMode = getBillingProvider();
  const onlineProvider = getOnlineBillingProvider();
  const onlineProviderLabel = getOnlineBillingProviderLabel();
  const manualFallbackVisible = shouldShowManualBilling();
  const manualBillingDetails = getManualBillingDetails();
  const manualFallbackReady = isManualBillingConfigured(manualBillingDetails);
  const manualMissingFields = getManualBillingMissingFields(manualBillingDetails);

  const checks: BillingDiagnosticCheck[] = [
    {
      id: "billing_provider",
      label: "Billing route",
      detail:
        providerMode === "manual"
          ? "Manual invoice billing is the active launch route."
          : onlineProvider === "paddle"
          ? "Self-serve checkout and portal are routed through Paddle."
          : onlineProvider === "stripe"
            ? "Self-serve checkout and portal are routed through Stripe."
            : "No online billing provider is active for this billing mode.",
      level: onlineProvider || providerMode === "manual" ? "pass" : "block",
    },
  ];

  if (onlineProvider === "paddle") {
    const paddle = getPaddleCheckoutReadiness();
    checks.push(
      {
        id: "paddle_api_key",
        label: "Paddle API key",
        detail: paddle.apiKeyConfigured
          ? "Server can create transactions and portal sessions."
          : "PADDLE_API_KEY is missing.",
        level: paddle.apiKeyConfigured ? "pass" : "block",
      },
      {
        id: "paddle_client_token",
        label: "Paddle client token",
        detail: paddle.clientTokenConfigured
          ? "Checkout page can initialize Paddle.js."
          : "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing.",
        level: paddle.clientTokenConfigured ? "pass" : "block",
      },
      {
        id: "paddle_webhook_secret",
        label: "Webhook signature",
        detail: paddle.webhookSecretConfigured
          ? "Incoming Paddle events can be verified before provisioning."
          : "PADDLE_WEBHOOK_SECRET is missing.",
        level: paddle.webhookSecretConfigured ? "pass" : "block",
      },
      {
        id: "paddle_monthly_prices",
        label: "Monthly prices",
        detail: paddle.monthlyPriceIdsConfigured
          ? "Starter, Pro, and Enterprise monthly price IDs are configured."
          : "One or more PADDLE_PRICE_*_MONTHLY values are missing.",
        level: paddle.monthlyPriceIdsConfigured ? "pass" : "block",
      },
      {
        id: "paddle_yearly_prices",
        label: "Annual prices",
        detail: paddle.yearlyPriceIdsConfigured
          ? "Annual checkout is available for all plans."
          : "Annual checkout is hidden until all PADDLE_PRICE_*_YEARLY values are set.",
        level: paddle.yearlyPriceIdsConfigured ? "pass" : "warn",
      },
    );
  } else if (onlineProvider === "stripe") {
    const configured = isStripeConfigured();
    checks.push({
      id: "stripe_configured",
      label: "Stripe checkout",
      detail: configured
        ? "Stripe secret and price IDs are used for monthly checkout."
        : "Stripe secret key is missing.",
      level: configured ? "pass" : "block",
    });
  }

  if (manualFallbackVisible) {
    checks.push({
      id: "manual_fallback",
      label: "Manual invoice fallback",
      detail: manualFallbackReady
        ? "IBAN transfer fallback is available for owner invoices."
        : `Manual fallback is missing ${manualMissingFields.join(", ") || "required env values"}.`,
      level: manualFallbackReady ? "pass" : "warn",
    });
  }

  const blocking = checks.some((check) => check.level === "block");

  return {
    checks,
    customerPortalReady: Boolean(onlineProvider) && !blocking,
    manualFallbackReady,
    manualFallbackVisible,
    onlineProvider,
    onlineProviderLabel,
    providerMode,
    selfServeCheckoutReady: Boolean(onlineProvider) && !blocking,
  };
}
