import { isProductionRuntime } from "./feature-flags";
import { captureError, structuredLog } from "./observability";

export interface EmailDeliveryResult {
  error?: string;
  providerMessageId?: string;
  status: "failed" | "sent" | "skipped";
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

function subjectContainsPatientData(subject: string): boolean {
  return /\b(patient|dob|date of birth|diagnosis|hiv|cancer|depression|mrn|\+?\d[\d\s().-]{7,})\b/i.test(
    subject,
  );
}

export async function sendEmailWithResend(
  input: SendEmailInput,
): Promise<EmailDeliveryResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM");

  if (!apiKey || !from) {
    if (isProductionRuntime()) {
      structuredLog("error", "email.delivery.not_configured", {
        provider: "resend",
      });
      return {
        error: "email_delivery_not_configured",
        status: "failed",
      };
    }

    return {
      error: "RESEND_API_KEY or EMAIL_FROM is not configured in this environment.",
      status: "skipped",
    };
  }

  if (subjectContainsPatientData(input.subject)) {
    structuredLog("warn", "email.delivery.blocked_subject", {
      provider: "resend",
      reason: "subject_contains_patient_data",
    });
    return {
      error: "email_subject_contains_patient_data",
      status: "failed",
    };
  }

  try {
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
      structuredLog("warn", "email.delivery.failed", {
        provider: "resend",
        status: response.status,
      });
      return {
        error: "email_delivery_failed",
        status: "failed",
      };
    }

    return {
      providerMessageId: typeof payload.id === "string" ? payload.id : undefined,
      status: "sent",
    };
  } catch (error) {
    const captured = captureError(error, { operation: "email.delivery", provider: "resend" });
    structuredLog("warn", "email.delivery.exception", {
      errorCode: captured.id,
      provider: "resend",
    });
    return {
      error: "email_delivery_failed",
      status: "failed",
    };
  }
}
