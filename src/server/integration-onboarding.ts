import crypto from "node:crypto";
import type { Provider } from "@/domain/types";
import { isProductionRuntime } from "./feature-flags";

type MessagingProvider = Extract<Provider, "telegram" | "whatsapp" | "instagram">;
type SelfServeProvider = MessagingProvider | "web_form";

export interface MessagingSetupGuide {
  provider: MessagingProvider;
  callbackUrl: string;
  verifyToken: string;
  docsUrl: string;
  portalLabel: string;
  requiredCredentials: string[];
  steps: string[];
}

export interface WebFormSetupGuide {
  provider: "web_form";
  endpointUrl: string;
  webhookSecret: string;
  requiredCredentials: string[];
  samplePayload: Record<string, string>;
  steps: string[];
}

function getSecret(): string {
  const integrationSecret = process.env.INTEGRATION_SECRET?.trim();
  if (integrationSecret) {
    return integrationSecret;
  }

  if (isProductionRuntime()) {
    throw new Error("INTEGRATION_SECRET is required in production.");
  }

  return (
    process.env.SESSION_SECRET?.trim() ??
    "development-only-dental-recovery-onboarding-secret"
  );
}

function getAppUrl(requestUrl: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

function buildStableVerifyToken(organizationId: string, provider: SelfServeProvider): string {
  const digest = crypto
    .createHmac("sha256", getSecret())
    .update(`${organizationId}:${provider}:self-serve`)
    .digest("hex")
    .slice(0, 18);

  return `${provider.slice(0, 2)}_${digest}`;
}

export function getWebFormSetupGuide(requestUrl: string, organizationId: string): WebFormSetupGuide {
  const appUrl = getAppUrl(requestUrl);

  return {
    provider: "web_form",
    endpointUrl: `${appUrl}/api/v1/webhooks/web-form`,
    webhookSecret: buildStableVerifyToken(organizationId, "web_form"),
    requiredCredentials: ["Webhook secret"],
    samplePayload: {
      organizationId,
      eventId: "website-test-lead-001",
      name: "Test Patient",
      phone: "+380000000000",
      message: "I want to book a consultation.",
    },
    steps: [
      "Save the generated webhook secret in Dash Dental.",
      "Send website form submissions to the endpoint below.",
      "Include x-webhook-secret with every request.",
      "Use Send test lead to verify the lead appears in Inbox and Dashboard.",
    ],
  };
}

export function getMessagingSetupGuide(
  requestUrl: string,
  organizationId: string,
  provider: MessagingProvider,
): MessagingSetupGuide {
  const appUrl = getAppUrl(requestUrl);

  if (provider === "telegram") {
    return {
      provider,
      callbackUrl: `${appUrl}/api/v1/webhooks/telegram`,
      verifyToken: buildStableVerifyToken(organizationId, provider),
      docsUrl: "https://core.telegram.org/bots/api?source=post_page",
      portalLabel: "BotFather + Telegram Bot API",
      requiredCredentials: ["Bot token"],
      steps: [
        "Create or open the clinic bot in BotFather.",
        "Paste the Bot token into Dash Dental.",
        "Keep the suggested secret token or rotate it.",
        "Save the integration. Dash Dental will register the Telegram webhook automatically.",
      ],
    };
  }

  if (provider === "whatsapp") {
    return {
      provider,
      callbackUrl: `${appUrl}/api/v1/webhooks/meta`,
      verifyToken: buildStableVerifyToken(organizationId, provider),
      docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks",
      portalLabel: "Meta App Dashboard / WhatsApp Cloud API",
      requiredCredentials: [
        "Permanent access token",
        "Phone number ID",
        "Meta app secret",
        "Optional WABA ID",
      ],
      steps: [
        "Create or open the clinic Meta app with WhatsApp Cloud API enabled.",
        "In Meta Webhooks, use the callback URL and verify token shown here.",
        "Subscribe the app to WhatsApp messages and message status events.",
        "Paste the access token, phone number ID, and app secret into Dash Dental, then save.",
      ],
    };
  }

  return {
    provider,
    callbackUrl: `${appUrl}/api/v1/webhooks/meta`,
    verifyToken: buildStableVerifyToken(organizationId, provider),
    docsUrl: "https://developers.facebook.com/docs/messenger-platform/instagram/features/webhooks/",
    portalLabel: "Meta App Dashboard / Instagram Messaging",
    requiredCredentials: [
      "Page access token",
      "Facebook page ID",
      "Meta app secret",
      "Optional Instagram business account ID",
    ],
    steps: [
      "Open the clinic Meta app and enable Instagram Messaging.",
      "In Meta Webhooks, use the callback URL and verify token shown here.",
      "Subscribe message-related Instagram webhook fields and connect the clinic page.",
      "Paste the page token, page ID, and app secret into Dash Dental, then move the app to Live mode.",
    ],
  };
}
