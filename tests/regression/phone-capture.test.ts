import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createEmptyAppState } from "../../src/domain/empty-app-state";
import { createLeadFromInbound } from "../../src/server/state-mutations";
import {
  configurePhoneIntegrationInState,
  parseTwilioWebhookPayload,
  verifyTwilioSignature,
} from "../../src/server/phone-capture";

function signTwilio(url: string, params: Record<string, string>, authToken: string) {
  const base =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

  return crypto.createHmac("sha1", authToken).update(base).digest("base64");
}

test("Twilio signatures validate against the request URL and sorted params", () => {
  const url = "https://dashdental.space/api/webhooks/twilio/call";
  const params = {
    CallSid: "CA123",
    CallStatus: "no-answer",
    From: "+15551234567",
    To: "+15557654321",
  };
  const signature = signTwilio(url, params, "twilio-secret");

  assert.equal(
    verifyTwilioSignature({
      authToken: "twilio-secret",
      params,
      requestUrl: url,
      signature,
    }),
    true,
  );
  assert.equal(
    verifyTwilioSignature({
      authToken: "wrong-secret",
      params,
      requestUrl: url,
      signature,
    }),
    false,
  );
});

test("phone integration stores Twilio credentials encrypted and activates missed calls", () => {
  const state = createEmptyAppState();
  const nextState = configurePhoneIntegrationInState(
    {
      ...state,
      organizations: [
        {
          id: "org-phone",
          name: "Phone Clinic",
          timezone: "UTC",
          currency: "USD",
          averagePatientValue: 500,
          businessHours: { start: "09:00", end: "17:00", weekdays: [1, 2, 3, 4, 5] },
          status: "active",
        },
      ],
    },
    {
      organizationId: "org-phone",
      phoneNumber: "+15557654321",
      accountSid: "AC123",
      authToken: "twilio-secret",
      autoReplyEnabled: true,
    },
  );
  const integration = nextState.integrations.find((item) => item.provider === "phone");

  assert.equal(integration?.status, "active");
  assert.equal(integration?.externalAccountId, "+15557654321");
  assert.equal(integration?.encryptedCredentials.includes("twilio-secret"), false);
});

test("missed calls materialize as urgent phone leads", () => {
  const state = {
    ...createEmptyAppState(),
    organizations: [
      {
        id: "org-phone",
        name: "Phone Clinic",
        timezone: "UTC",
        currency: "USD" as const,
        averagePatientValue: 700,
        businessHours: { start: "09:00", end: "17:00", weekdays: [1, 2, 3, 4, 5] },
        status: "active" as const,
      },
    ],
  };
  const nextState = createLeadFromInbound(state, {
    organizationId: "org-phone",
    source: "phone",
    providerEventId: "twilio-call-1",
    providerMessageId: "twilio-call-1",
    providerThreadId: "+15551234567",
    providerContactId: "+15551234567",
    name: "Phone caller 4567",
    phone: "+15551234567",
    messageText: "Missed call from +15551234567. Call back as soon as possible.",
    nowIso: "2026-06-01T08:00:00.000Z",
  });

  assert.equal(nextState.leads[0]?.source, "phone");
  assert.equal(nextState.leads[0]?.status, "at_risk");
  assert.equal(nextState.conversations[0]?.provider, "phone");
});

test("Twilio form payloads parse without losing call fields", () => {
  const payload = parseTwilioWebhookPayload(
    "CallSid=CA123&CallStatus=no-answer&From=%2B15551234567&To=%2B15557654321",
    "application/x-www-form-urlencoded",
  );

  assert.equal(payload.CallSid, "CA123");
  assert.equal(payload.CallStatus, "no-answer");
  assert.equal(payload.From, "+15551234567");
});
