import crypto from "node:crypto";
import type { AppState, Integration } from "@/domain/types";
import { ApiError } from "./api-error";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./integration-secrets";
import { isProductionRuntime } from "./feature-flags";
import { addAudit } from "./state-mutations";
import { acceptInboundWebhook, resolveWebhookExternalEventId } from "./webhook-pipeline";
import { recordProductEvent } from "./product-analytics";
import { structuredLog } from "./observability";

export interface PhoneIntegrationCredentials {
  accountSid?: string;
  authToken?: string;
  autoReplyEnabled?: boolean;
  messagingServiceSid?: string;
  phoneNumber: string;
}

interface ResolvedPhoneIntegration {
  credentials: PhoneIntegrationCredentials;
  integration: Integration;
}

const missedCallStatuses = new Set(["busy", "canceled", "failed", "no-answer", "missed"]);

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizePhoneE164(value: string): string {
  const normalized = value.replace(/[^\d+]/g, "");
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    throw new ApiError(400, "phoneNumber must be a valid international number", "validation_error", {
      field: "phoneNumber",
    });
  }

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function safeNormalizePhone(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return normalizePhoneE164(value);
  } catch {
    return undefined;
  }
}

function parseTwilioFormBody(rawBody: string): Record<string, string> {
  const params = new URLSearchParams(rawBody);
  return Object.fromEntries(params.entries());
}

export function parseTwilioWebhookPayload(
  rawBody: string,
  contentType: string | null,
): Record<string, unknown> {
  if (contentType?.includes("application/json")) {
    return asRecord(JSON.parse(rawBody || "{}"));
  }

  return parseTwilioFormBody(rawBody);
}

function decryptPhoneCredentials(integration: Integration): PhoneIntegrationCredentials | undefined {
  return decryptIntegrationSecret<PhoneIntegrationCredentials>(integration.encryptedCredentials);
}

export function configurePhoneIntegrationInState(
  state: AppState,
  input: {
    accountSid?: string;
    actorUserId?: string;
    authToken?: string;
    autoReplyEnabled?: boolean;
    messagingServiceSid?: string;
    organizationId: string;
    phoneNumber: string;
  },
): AppState {
  const phoneNumber = normalizePhoneE164(input.phoneNumber);
  const nowIso = new Date().toISOString();
  const credentials: PhoneIntegrationCredentials = {
    accountSid: input.accountSid?.trim() || undefined,
    authToken: input.authToken?.trim() || undefined,
    autoReplyEnabled: input.autoReplyEnabled !== false,
    messagingServiceSid: input.messagingServiceSid?.trim() || undefined,
    phoneNumber,
  };
  const existing = state.integrations.find(
    (integration) =>
      integration.organizationId === input.organizationId && integration.provider === "phone",
  );
  const nextIntegration: Integration = {
    id: existing?.id ?? createRuntimeId("int-phone"),
    organizationId: input.organizationId,
    provider: "phone",
    status: "active",
    externalAccountId: phoneNumber,
    encryptedCredentials: encryptIntegrationSecret(credentials),
    webhookSecret: credentials.authToken ? "twilio-signature" : "",
    lastSyncAt: nowIso,
    errorState: credentials.authToken
      ? undefined
      : "Twilio auth token is missing. Calls can be logged only from trusted test traffic.",
    healthScore: credentials.authToken ? 94 : 68,
  };

  let nextState: AppState = {
    ...state,
    integrations: existing
      ? state.integrations.map((integration) =>
          integration.id === existing.id ? nextIntegration : integration,
        )
      : [nextIntegration, ...state.integrations],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "phone.integration_configured",
    entityType: "integration",
    entityId: nextIntegration.id,
    metadataJson: {
      autoReplyEnabled: credentials.autoReplyEnabled,
      phoneNumber,
      twilioConfigured: Boolean(credentials.accountSid && credentials.authToken),
    },
  });

  return nextState;
}

function resolvePhoneIntegration(
  state: AppState,
  calledNumber?: string,
): ResolvedPhoneIntegration | undefined {
  const normalizedCalledNumber = safeNormalizePhone(calledNumber);
  const candidates = state.integrations
    .filter(
      (integration) =>
        integration.provider === "phone" && integration.status !== "disconnected",
    )
    .map((integration) => {
      const credentials = decryptPhoneCredentials(integration);
      return credentials ? { credentials, integration } : undefined;
    })
    .filter((item): item is ResolvedPhoneIntegration => Boolean(item));

  return (
    candidates.find(
      ({ credentials, integration }) =>
        safeNormalizePhone(credentials.phoneNumber) === normalizedCalledNumber ||
        safeNormalizePhone(integration.externalAccountId ?? "") === normalizedCalledNumber,
    ) ?? (candidates.length === 1 ? candidates[0] : undefined)
  );
}

function timingSafeBase64Equal(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function twilioSignatureBase(url: string, params: Record<string, unknown>) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}${String(params[key] ?? "")}`)
    .join("");

  return `${url}${sorted}`;
}

function requestUrlCandidates(requestUrl: string) {
  const candidates = [requestUrl];
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) {
    const url = new URL(requestUrl);
    candidates.push(`${appUrl}${url.pathname}${url.search}`);
  }

  return [...new Set(candidates)];
}

export function verifyTwilioSignature(input: {
  authToken: string;
  params: Record<string, unknown>;
  requestUrl: string;
  signature: string | null;
}) {
  if (!input.signature) {
    return false;
  }

  return requestUrlCandidates(input.requestUrl).some((url) => {
    const digest = crypto
      .createHmac("sha1", input.authToken)
      .update(twilioSignatureBase(url, input.params))
      .digest("base64");

    return timingSafeBase64Equal(digest, input.signature ?? "");
  });
}

function buildCanonicalMissedCall(input: {
  organizationId: string;
  payload: Record<string, unknown>;
}) {
  const callSid = readString(input.payload.CallSid) ?? readString(input.payload.callSid);
  const from = safeNormalizePhone(readString(input.payload.From) ?? readString(input.payload.from));
  const to = safeNormalizePhone(readString(input.payload.To) ?? readString(input.payload.to));
  const status =
    readString(input.payload.CallStatus) ??
    readString(input.payload.DialCallStatus) ??
    readString(input.payload.callStatus) ??
    "missed";
  const normalizedStatus = status.toLowerCase();

  if (!from || !to) {
    throw new ApiError(400, "Twilio From and To numbers are required", "validation_error");
  }

  if (!missedCallStatuses.has(normalizedStatus)) {
    return undefined;
  }

  const occurredAt = new Date().toISOString();
  const providerEventId =
    callSid ? `twilio-call-${callSid}-${normalizedStatus}` : createRuntimeId("twilio-call");
  const last4 = from.slice(-4);

  return {
    organizationId: input.organizationId,
    provider: "phone" as const,
    providerEventId,
    providerMessageId: providerEventId,
    providerContactId: from,
    providerThreadId: from,
    patientName: `Phone caller ${last4}`,
    patientPhone: from,
    text: `Missed call from ${from}. Call back as soon as possible.`,
    occurredAt,
    rawPayload: {
      callSid,
      from,
      to,
      status: normalizedStatus,
    },
  };
}

async function sendTwilioSms(input: {
  body: string;
  credentials: PhoneIntegrationCredentials;
  to: string;
}) {
  if (!input.credentials.accountSid || !input.credentials.authToken) {
    return { status: "skipped" as const, reason: "twilio_credentials_missing" };
  }

  const body = new URLSearchParams({
    Body: input.body,
    To: input.to,
  });
  if (input.credentials.messagingServiceSid) {
    body.set("MessagingServiceSid", input.credentials.messagingServiceSid);
  } else {
    body.set("From", input.credentials.phoneNumber);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${input.credentials.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${input.credentials.accountSid}:${input.credentials.authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );
  const payload = asRecord(await response.json().catch(() => ({})));

  if (!response.ok) {
    return {
      status: "failed" as const,
      reason: readString(payload.message) ?? "twilio_sms_failed",
    };
  }

  return {
    status: "sent" as const,
    providerMessageId: readString(payload.sid),
  };
}

export async function acceptTwilioMissedCallWebhook(input: {
  contentType: string | null;
  rawBody: string;
  request: Request;
}) {
  const payload = parseTwilioWebhookPayload(input.rawBody, input.contentType);
  const state = await import("./data-store").then((module) => module.readAppState());
  const to = readString(payload.To) ?? readString(payload.to);
  const resolved = resolvePhoneIntegration(state, to);
  if (!resolved) {
    throw new ApiError(404, "Active phone integration was not found", "phone_integration_not_found");
  }

  const authToken = resolved.credentials.authToken?.trim();
  const signatureStatus = authToken
    ? verifyTwilioSignature({
        authToken,
        params: payload,
        requestUrl: input.request.url,
        signature: input.request.headers.get("x-twilio-signature"),
      })
      ? "valid"
      : "invalid"
    : isProductionRuntime()
      ? "invalid"
      : "skipped";
  const canonical = buildCanonicalMissedCall({
    organizationId: resolved.integration.organizationId,
    payload,
  });

  const externalEventId = canonical?.providerEventId ?? resolveWebhookExternalEventId(undefined, input.rawBody);
  const webhook = await acceptInboundWebhook({
    provider: "twilio",
    rawBody: input.rawBody,
    payload,
    signatureStatus,
    providerAccountKey: resolved.integration.externalAccountId || to,
    externalEventId,
    canonicalMessages: canonical ? [canonical] : [],
  });
  let sms: Awaited<ReturnType<typeof sendTwilioSms>> | undefined;

  if (canonical && resolved.credentials.autoReplyEnabled !== false) {
    sms = await sendTwilioSms({
      credentials: resolved.credentials,
      to: canonical.patientPhone,
      body: "We saw your missed call. Reply here or call us back and the clinic team will help you book the right appointment.",
    }).catch((error) => {
      structuredLog("warn", "phone.auto_reply_failed", {
        organizationId: resolved.integration.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { status: "failed" as const, reason: "phone_auto_reply_failed" };
    });
  }

  await recordProductEvent({
    organizationId: resolved.integration.organizationId,
    event: canonical ? "phone.missed_call_captured" : "phone.call_ignored",
    properties: {
      status: readString(payload.CallStatus) ?? readString(payload.DialCallStatus),
      smsStatus: sms?.status,
    },
  });

  return {
    status: canonical ? (webhook.duplicate ? "duplicate" : "received") : "ignored",
    canonicalMessage: canonical,
    receiptId: webhook.receiptId,
    outboxEventIds: webhook.outboxEventIds,
    sms,
  };
}
