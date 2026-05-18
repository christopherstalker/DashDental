import { ApiError } from "./api-error";
import { isProductionRuntime } from "./feature-flags";

export interface EmailDeliveryResult {
  error?: string;
  providerMessageId?: string;
  status: "sent" | "skipped";
}

interface SendEmailInput {
  html: string;
  subject: string;
  text: string;
  to: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function sendEmailWithResend(
  input: SendEmailInput,
): Promise<EmailDeliveryResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM");

  if (!apiKey || !from) {
    if (isProductionRuntime()) {
      throw new ApiError(
        500,
        "Resend email delivery is not configured.",
        "email_delivery_not_configured",
      );
    }

    return {
      error: "RESEND_API_KEY or EMAIL_FROM is not configured in this environment.",
      status: "skipped",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to,
    }),
    cache: "no-store",
  });
  const payload = asRecord(await response.json().catch(() => ({})));

  if (!response.ok) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "Resend email delivery failed.";
    throw new ApiError(502, message, "email_delivery_failed", {
      status: response.status,
    });
  }

  return {
    providerMessageId: typeof payload.id === "string" ? payload.id : undefined,
    status: "sent",
  };
}
