import { getPlanCatalog } from "@/domain/business-rules";
import type { Organization, Subscription } from "@/domain/types";

export type BillingProvider = "stripe" | "paddle" | "manual" | "hybrid";

export interface ManualBillingDetails {
  provider: "manual";
  recipientName: string;
  iban: string;
  swiftBic: string;
  bankName: string;
  bankAddress: string;
  recipientAddress: string;
  correspondentAccount: string;
  correspondentBank: string;
  correspondentSwiftBic: string;
  intermediaryAccount: string;
  intermediaryBank: string;
  intermediarySwiftBic: string;
  currency: string;
  supportEmail: string;
  instructions: string;
  invoicePrefix: string;
}

export interface ManualInvoiceSummary {
  amount: number;
  currency: string;
  paymentReference: string;
  planLabel: string;
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function getBillingProvider(): BillingProvider {
  const value = readEnv("BILLING_PROVIDER").toLowerCase();
  if (value === "stripe" || value === "paddle" || value === "manual" || value === "hybrid") {
    return value;
  }

  if (readEnv("PADDLE_API_KEY")) {
    return "paddle";
  }

  return readEnv("STRIPE_SECRET_KEY") ? "stripe" : "manual";
}

export function getOnlineBillingProvider(): "paddle" | "stripe" | undefined {
  const provider = getBillingProvider();
  if (provider === "paddle" || provider === "stripe") {
    return provider;
  }
  if (provider !== "hybrid") {
    return undefined;
  }
  if (readEnv("PADDLE_API_KEY")) {
    return "paddle";
  }
  if (readEnv("STRIPE_SECRET_KEY")) {
    return "stripe";
  }
  return undefined;
}

export function getOnlineBillingProviderLabel(): "Paddle" | "Stripe" | "Online billing" {
  const provider = getOnlineBillingProvider();
  if (provider === "paddle") {
    return "Paddle";
  }
  if (provider === "stripe") {
    return "Stripe";
  }
  return "Online billing";
}

export function getManualBillingDetails(): ManualBillingDetails {
  return {
    provider: "manual",
    recipientName: readEnv("MANUAL_BILLING_RECIPIENT_NAME"),
    iban: readEnv("MANUAL_BILLING_IBAN"),
    swiftBic: readEnv("MANUAL_BILLING_SWIFT_BIC"),
    bankName: readEnv("MANUAL_BILLING_BANK_NAME"),
    bankAddress: readEnv("MANUAL_BILLING_BANK_ADDRESS"),
    recipientAddress: readEnv("MANUAL_BILLING_RECIPIENT_ADDRESS"),
    correspondentAccount: readEnv("MANUAL_BILLING_CORRESPONDENT_ACCOUNT"),
    correspondentBank: readEnv("MANUAL_BILLING_CORRESPONDENT_BANK"),
    correspondentSwiftBic: readEnv("MANUAL_BILLING_CORRESPONDENT_SWIFT_BIC"),
    intermediaryAccount: readEnv("MANUAL_BILLING_INTERMEDIARY_ACCOUNT"),
    intermediaryBank: readEnv("MANUAL_BILLING_INTERMEDIARY_BANK"),
    intermediarySwiftBic: readEnv("MANUAL_BILLING_INTERMEDIARY_SWIFT_BIC"),
    currency: readEnv("MANUAL_BILLING_CURRENCY") || "USD",
    supportEmail: readEnv("MANUAL_BILLING_SUPPORT_EMAIL") || "support@dashdental.space",
    instructions:
      readEnv("MANUAL_BILLING_INSTRUCTIONS") ||
      "Send a bank transfer using the payment reference. Access is activated after payment confirmation.",
    invoicePrefix: readEnv("MANUAL_BILLING_INVOICE_PREFIX") || "DR",
  };
}

export function getManualBillingMissingFields(
  details = getManualBillingDetails(),
): string[] {
  const missing: string[] = [];

  if (!details.recipientName) {
    missing.push("MANUAL_BILLING_RECIPIENT_NAME");
  }

  if (!details.iban) {
    missing.push("MANUAL_BILLING_IBAN");
  }

  if (!details.currency) {
    missing.push("MANUAL_BILLING_CURRENCY");
  }

  return missing;
}

export function isManualBillingConfigured(details = getManualBillingDetails()): boolean {
  return getManualBillingMissingFields(details).length === 0;
}

export function shouldShowManualBilling(): boolean {
  const provider = getBillingProvider();
  return provider === "manual" || provider === "hybrid";
}

export function buildManualPaymentReference(input: {
  organizationId: string;
  plan: Subscription["plan"];
  invoicePrefix?: string;
}): string {
  const tenantPart = input.organizationId
    .replace(/[^a-z0-9]/gi, "")
    .slice(-8)
    .toUpperCase();
  const prefix = (input.invoicePrefix || "DR").replace(/[^a-z0-9]/gi, "").toUpperCase();

  return `${prefix}-${tenantPart || "CLINIC"}-${input.plan.toUpperCase()}`;
}

export function buildManualInvoiceSummary(input: {
  organization: Organization;
  plan: Subscription["plan"];
  details?: ManualBillingDetails;
}): ManualInvoiceSummary {
  const details = input.details ?? getManualBillingDetails();
  const catalog = getPlanCatalog(input.plan);

  return {
    amount: catalog.monthlyPrice,
    currency: details.currency,
    paymentReference: buildManualPaymentReference({
      organizationId: input.organization.id,
      plan: input.plan,
      invoicePrefix: details.invoicePrefix,
    }),
    planLabel: catalog.label,
  };
}
