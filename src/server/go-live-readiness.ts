import { buildStripeLiveModeRehearsalPlan } from "./stripe-rehearsal";

type GoLiveEnv = {
  [key: string]: string | undefined;
};

export type GoLiveReadinessStatus = "blocked" | "ready";

export type GoLiveReadinessCheck = {
  description: string;
  id: string;
  level: "block" | "pass" | "warn";
  remediation: string;
};

const requiredLegalDocs = [
  "docs/legal/dpa-template.md",
  "docs/legal/subprocessors.md",
  "docs/legal/order-form-template.md",
  "docs/legal/cancellation-refund-policy.md",
] as const;

const requiredLaunchDocs = [
  "docs/first-clinic-launch-plan.md",
  "docs/runbooks/clinic-onboarding.md",
  "docs/runbooks/manual-billing.md",
  "docs/runbooks/support-operations.md",
  "docs/runbooks/data-handling.md",
  "docs/runbooks/monitoring.md",
] as const;

function isEnabled(value?: string) {
  return value?.trim().toLowerCase() === "true";
}

function isHttpsUrl(value?: string) {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isStrongSecret(value?: string) {
  const trimmed = value?.trim() ?? "";

  return (
    trimmed.length >= 32 &&
    !/^replace-with/i.test(trimmed) &&
    !/local|dev|test|example/i.test(trimmed)
  );
}

function isConfiguredProductionValue(value?: string) {
  const trimmed = value?.trim() ?? "";

  return (
    trimmed.length > 0 &&
    !/replace|placeholder|example|changeme|todo|your[-_ ]/i.test(trimmed)
  );
}

function isEmail(value?: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim() ?? "");
}

function extractEmailAddress(value?: string) {
  const trimmed = value?.trim() ?? "";
  const mailbox = trimmed.match(/<([^<>]+)>$/);

  return mailbox?.[1]?.trim() ?? trimmed;
}

function isEmailFrom(value?: string) {
  return isConfiguredProductionValue(value) && isEmail(extractEmailAddress(value));
}

function databaseUrlHasSslParams(value?: string) {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      return false;
    }

    const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
    const libpqCompat = url.searchParams.get("uselibpqcompat")?.toLowerCase();

    return (
      sslmode === "verify-full" ||
      sslmode === "require" ||
      libpqCompat === "true"
    );
  } catch {
    return false;
  }
}

function check(
  ok: boolean,
  input: Omit<GoLiveReadinessCheck, "level"> & { warn?: boolean },
): GoLiveReadinessCheck {
  return {
    description: input.description,
    id: input.id,
    level: ok ? "pass" : input.warn ? "warn" : "block",
    remediation: input.remediation,
  };
}

export function buildGoLiveReadinessPlan({
  env = process.env,
  legalDocs = new Set<string>(requiredLegalDocs),
  launchDocs = new Set<string>(requiredLaunchDocs),
}: {
  env?: GoLiveEnv;
  legalDocs?: Set<string>;
  launchDocs?: Set<string>;
} = {}) {
  const billingProvider = env.BILLING_PROVIDER?.trim().toLowerCase() || "manual";
  const usesManualBilling = billingProvider === "manual" || billingProvider === "hybrid";
  const usesStripeBilling = billingProvider === "stripe" || billingProvider === "hybrid";
  const syntheticBaseUrl =
    env.SYNTHETIC_MONITOR_BASE_URL?.trim() || env.PLAYWRIGHT_BASE_URL?.trim();

  const checks: GoLiveReadinessCheck[] = [
    check(isHttpsUrl(env.APP_URL), {
      description: "APP_URL is a stable public HTTPS hostname.",
      id: "app_url_public_https",
      remediation: "Set APP_URL to the staging or production HTTPS hostname.",
    }),
    check(isStrongSecret(env.SESSION_SECRET), {
      description: "SESSION_SECRET is long and not a placeholder/dev secret.",
      id: "session_secret_strong",
      remediation: "Set SESSION_SECRET to a unique 32+ character production secret.",
    }),
    check(Boolean(env.DATABASE_URL?.trim()), {
      description: "DATABASE_URL is configured.",
      id: "database_url_configured",
      remediation: "Set DATABASE_URL to the production PostgreSQL connection string.",
    }),
    check(databaseUrlHasSslParams(env.DATABASE_URL), {
      description: "DATABASE_URL has explicit managed Postgres SSL parameters.",
      id: "database_url_ssl_params",
      remediation:
        "For Neon, use sslmode=verify-full when possible or uselibpqcompat=true&sslmode=require.",
    }),
    check(Boolean(env.REDIS_URL?.trim()), {
      description: "REDIS_URL is configured for runtime queues.",
      id: "redis_url_configured",
      remediation: "Set REDIS_URL to the production Redis instance used by BullMQ.",
    }),
    check(isStrongSecret(env.INTEGRATION_SECRET), {
      description: "INTEGRATION_SECRET is long and not a placeholder/dev secret.",
      id: "integration_secret_strong",
      remediation: "Set INTEGRATION_SECRET to a unique 32+ character production secret.",
    }),
    check(isStrongSecret(env.JWT_ACCESS_SECRET), {
      description: "JWT_ACCESS_SECRET is long and not a placeholder/dev secret.",
      id: "jwt_access_secret_strong",
      remediation: "Set JWT_ACCESS_SECRET to a unique 32+ character production secret.",
    }),
    check(isStrongSecret(env.JWT_REFRESH_SECRET), {
      description: "JWT_REFRESH_SECRET is long and not a placeholder/dev secret.",
      id: "jwt_refresh_secret_strong",
      remediation: "Set JWT_REFRESH_SECRET to a unique 32+ character production secret.",
    }),
    check(!isEnabled(env.ENABLE_DEV_LOGIN), {
      description: "Development login is disabled for launch.",
      id: "dev_login_disabled",
      remediation: "Set ENABLE_DEV_LOGIN=false in production.",
    }),
    check(!isEnabled(env.ENABLE_DEV_BILLING), {
      description: "Development billing shortcuts are disabled for launch.",
      id: "dev_billing_disabled",
      remediation: "Set ENABLE_DEV_BILLING=false in production.",
    }),
    check(isEnabled(env.DATABASE_BACKUPS_CONFIRMED), {
      description: "Database backups are confirmed at the managed database provider.",
      id: "database_backups_confirmed",
      remediation: "Confirm Neon/Postgres backups and set DATABASE_BACKUPS_CONFIRMED=true.",
    }),
    check(env.EDGE_RATE_LIMIT_PROFILE?.trim() === "launch", {
      description: "Launch edge rate-limit profile is selected.",
      id: "edge_rate_limit_profile_launch",
      remediation: "Set EDGE_RATE_LIMIT_PROFILE=launch.",
    }),
    check(isEnabled(env.EDGE_PROTECTION_DEPLOYED), {
      description: "CDN/edge rate limits and webhook/public auth rules are deployed.",
      id: "edge_protection_deployed",
      remediation: "Apply docs/edge-protection.md and set EDGE_PROTECTION_DEPLOYED=true.",
    }),
    check(isEnabled(env.REQUIRE_PUBLIC_AUTH_BOT_PROTECTION), {
      description: "Public login and registration require bot protection.",
      id: "public_auth_bot_protection_required",
      remediation: "Wire Turnstile for the hostname and set REQUIRE_PUBLIC_AUTH_BOT_PROTECTION=true.",
    }),
    check(Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()), {
      description: "Public Turnstile site key is configured.",
      id: "turnstile_site_key_configured",
      remediation: "Set NEXT_PUBLIC_TURNSTILE_SITE_KEY for the launch hostname.",
    }),
    check(Boolean(env.TURNSTILE_SECRET_KEY?.trim()), {
      description: "Turnstile secret key is configured server-side.",
      id: "turnstile_secret_configured",
      remediation: "Set TURNSTILE_SECRET_KEY from the Cloudflare Turnstile widget.",
    }),
    check(isConfiguredProductionValue(env.RESEND_API_KEY), {
      description: "Transactional email API key is configured for launch invites.",
      id: "email_delivery_api_key_configured",
      remediation: "Set RESEND_API_KEY from the verified production email provider.",
    }),
    check(isEmailFrom(env.EMAIL_FROM), {
      description: "Transactional email sender is configured as a valid mailbox.",
      id: "email_from_configured",
      remediation: "Set EMAIL_FROM to a verified sender, for example Dash Dental <noreply@dashdental.space>.",
    }),
    check(isEmail(env.SUPPORT_OWNER_EMAIL), {
      description: "Named support owner email is configured.",
      id: "support_owner_email_configured",
      remediation: "Set SUPPORT_OWNER_EMAIL to the person owning launch support.",
    }),
    check(Boolean(env.SUPPORT_OWNER_NAME?.trim()), {
      description: "Named support owner is configured.",
      id: "support_owner_name_configured",
      remediation: "Set SUPPORT_OWNER_NAME to the launch support owner.",
    }),
    check(isEmail(env.SECURITY_CONTACT_EMAIL), {
      description: "Security contact email is configured.",
      id: "security_contact_configured",
      remediation: "Set SECURITY_CONTACT_EMAIL for vulnerability and incident reports.",
    }),
    check(isEmail(env.INCIDENT_ESCALATION_EMAIL), {
      description: "Incident escalation email is configured.",
      id: "incident_escalation_configured",
      remediation: "Set INCIDENT_ESCALATION_EMAIL for urgent production incidents.",
    }),
    check(isEnabled(env.LEGAL_REVIEW_APPROVED), {
      description: "Legal pack has been reviewed for paid launch.",
      id: "legal_review_approved",
      remediation: "Review DPA, subprocessors, order form, and cancellation policy; then set LEGAL_REVIEW_APPROVED=true.",
    }),
    check(isEnabled(env.DPA_APPROVED), {
      description: "Data Processing Addendum is approved for customer use.",
      id: "dpa_approved",
      remediation: "Review docs/legal/dpa-template.md and set DPA_APPROVED=true.",
    }),
    check(isEnabled(env.SUBPROCESSORS_APPROVED), {
      description: "Subprocessor register is approved for customer use.",
      id: "subprocessors_approved",
      remediation: "Review docs/legal/subprocessors.md and set SUBPROCESSORS_APPROVED=true.",
    }),
    check(isEnabled(env.ORDER_FORM_APPROVED), {
      description: "Order form template is approved for customer use.",
      id: "order_form_approved",
      remediation: "Review docs/legal/order-form-template.md and set ORDER_FORM_APPROVED=true.",
    }),
    check(isEnabled(env.CANCELLATION_POLICY_APPROVED), {
      description: "Cancellation/refund policy is approved for customer use.",
      id: "cancellation_policy_approved",
      remediation:
        "Review docs/legal/cancellation-refund-policy.md and set CANCELLATION_POLICY_APPROVED=true.",
    }),
    check(requiredLegalDocs.every((doc) => legalDocs.has(doc)), {
      description: "Required legal pack files are present.",
      id: "legal_docs_present",
      remediation: `Keep ${requiredLegalDocs.join(", ")} in the repository.`,
    }),
    check(requiredLaunchDocs.every((doc) => launchDocs.has(doc)), {
      description: "First-clinic launch runbooks are present.",
      id: "first_clinic_runbooks_present",
      remediation: `Keep ${requiredLaunchDocs.join(", ")} in the repository.`,
    }),
    check(isEnabled(env.DATA_HANDLING_POLICY_APPROVED), {
      description: "Clinic data handling and AI boundary policy is approved.",
      id: "data_handling_policy_approved",
      remediation: "Review docs/runbooks/data-handling.md and set DATA_HANDLING_POLICY_APPROVED=true.",
    }),
    check(isEnabled(env.FIRST_CLINIC_REHEARSAL_APPROVED), {
      description: "Internal fake-clinic rehearsal is complete.",
      id: "first_clinic_rehearsal_approved",
      remediation:
        "Create a fake clinic, grant/lock/unlock access, send a test lead, reply from inbox, and set FIRST_CLINIC_REHEARSAL_APPROVED=true.",
    }),
    check(isHttpsUrl(syntheticBaseUrl), {
      description: "Synthetic monitor base URL points at a public HTTPS hostname.",
      id: "synthetic_monitor_base_url_https",
      remediation: "Set SYNTHETIC_MONITOR_BASE_URL or PLAYWRIGHT_BASE_URL to the staging HTTPS hostname.",
    }),
    check(isEnabled(env.SYNTHETIC_MONITOR_SCHEDULED), {
      description: "Synthetic launch monitor is scheduled.",
      id: "synthetic_monitor_scheduled",
      remediation: "Enable the scheduled workflow or external monitor and set SYNTHETIC_MONITOR_SCHEDULED=true.",
    }),
    check(isEnabled(env.PRODUCTION_MONITOR_POLICY_APPROVED), {
      description: "Production synthetic monitor tenant and cleanup policy are approved.",
      id: "production_monitor_policy_approved",
      remediation:
        "Approve the production monitor tenant and cleanup policy, then set PRODUCTION_MONITOR_POLICY_APPROVED=true.",
    }),
    check(["manual", "stripe", "hybrid"].includes(billingProvider), {
      description: "Billing provider is an expected launch mode.",
      id: "billing_provider_supported",
      remediation: "Set BILLING_PROVIDER to manual, stripe, or hybrid.",
    }),
  ];

  if (usesManualBilling) {
    const manualBillingReady =
      isEmail(env.MANUAL_BILLING_SUPPORT_EMAIL) &&
      Boolean(env.MANUAL_BILLING_RECIPIENT_NAME?.trim()) &&
      Boolean(env.MANUAL_BILLING_INSTRUCTIONS?.trim()) &&
      isEnabled(env.MANUAL_INVOICE_TEMPLATE_APPROVED);

    checks.push(
      check(isEmail(env.MANUAL_BILLING_SUPPORT_EMAIL), {
        description: "Manual billing support email is visible and configured.",
        id: "manual_billing_support_email",
        remediation: "Set MANUAL_BILLING_SUPPORT_EMAIL to the billing support inbox.",
      }),
      check(Boolean(env.MANUAL_BILLING_RECIPIENT_NAME?.trim()), {
        description: "Manual billing recipient name is configured.",
        id: "manual_billing_recipient_name",
        remediation: "Set MANUAL_BILLING_RECIPIENT_NAME before manual invoice launch.",
      }),
      check(Boolean(env.MANUAL_BILLING_INSTRUCTIONS?.trim()), {
        description: "Manual billing payment instructions are configured.",
        id: "manual_billing_instructions",
        remediation: "Set MANUAL_BILLING_INSTRUCTIONS with customer-safe payment instructions.",
      }),
      check(isEnabled(env.MANUAL_INVOICE_TEMPLATE_APPROVED), {
        description: "Manual invoice template and activation timing are approved.",
        id: "manual_invoice_template_approved",
        remediation:
          "Approve the manual invoice template, bank/payment message, late-payment path, and set MANUAL_INVOICE_TEMPLATE_APPROVED=true.",
      }),
      check(manualBillingReady, {
        description: "Manual billing is ready for assisted paid launch.",
        id: "manual_billing_ready",
        remediation:
          "Configure manual billing support email, recipient, payment instructions, and approve the invoice template.",
      }),
    );
  }

  if (usesStripeBilling) {
    checks.push(
      ...buildStripeLiveModeRehearsalPlan(env).checks.map((stripeCheck) =>
        check(stripeCheck.ok, {
          description: stripeCheck.description,
          id: `stripe_${stripeCheck.id}`,
          remediation: stripeCheck.remediation,
        }),
      ),
    );
  } else {
    checks.push({
      description: "Stripe live-mode rehearsal is not required for manual-only launch.",
      id: "stripe_rehearsal_not_required",
      level: "warn",
      remediation: "Run npm run stripe:rehearsal before enabling card self-serve billing.",
    });
  }

  return {
    checks,
    status: checks.some((item) => item.level === "block") ? "blocked" : "ready",
  } as const;
}

export { requiredLaunchDocs, requiredLegalDocs };
