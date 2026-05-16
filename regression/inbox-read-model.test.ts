import assert from "node:assert/strict";
import test from "node:test";
import type { AppState } from "../../src/domain/types";
import { defaultOrganizationId } from "../../src/domain/seed-data";
import { getRuntimeSeedState } from "../../src/server/runtime-state";

const nowIso = "2026-05-02T10:00:00.000Z";
const firstInboundAt = "2026-05-02T09:56:00.000Z";

function stateWithThread(extraMessages: AppState["messages"] = []): AppState {
  const base = getRuntimeSeedState();

  return {
    ...base,
    organizations: [
      ...base.organizations.filter((organization) => organization.id === defaultOrganizationId),
      {
        id: "org-other-projection",
        name: "Other Projection Clinic",
        timezone: "UTC",
        currency: "USD",
        averagePatientValue: 900,
        businessHours: base.organizations[0]?.businessHours ?? {
          start: "09:00",
          end: "18:00",
          weekdays: [1, 2, 3, 4, 5],
        },
        status: "active",
      },
    ],
    leads: [
      {
        id: "lead-projection",
        organizationId: defaultOrganizationId,
        name: "Projection Patient",
        phone: "+15550100",
        source: "web_form",
        status: "new",
        assignedTo: "user-manager",
        providerContactId: "contact-projection",
        firstMessageAt: firstInboundAt,
        estimatedValue: 500,
        createdAt: firstInboundAt,
        updatedAt: firstInboundAt,
      },
      {
        id: "lead-other-projection",
        organizationId: "org-other-projection",
        name: "Other Projection Patient",
        source: "web_form",
        status: "new",
        providerContactId: "other-contact",
        firstMessageAt: firstInboundAt,
        estimatedValue: 900,
        createdAt: firstInboundAt,
        updatedAt: firstInboundAt,
      },
    ],
    conversations: [
      {
        id: "conv-projection",
        organizationId: defaultOrganizationId,
        leadId: "lead-projection",
        provider: "web_form",
        providerThreadId: "thread-projection",
        status: "open",
        lastMessageAt: firstInboundAt,
      },
      {
        id: "conv-other-projection",
        organizationId: "org-other-projection",
        leadId: "lead-other-projection",
        provider: "web_form",
        providerThreadId: "other-thread",
        status: "open",
        lastMessageAt: firstInboundAt,
      },
    ],
    messages: [
      {
        id: "msg-inbound-projection",
        conversationId: "conv-projection",
        direction: "inbound",
        senderType: "patient",
        providerMessageId: "provider-in-1",
        text: "I need an implant consultation this week.",
        sentAt: firstInboundAt,
      },
      {
        id: "msg-other-projection",
        conversationId: "conv-other-projection",
        direction: "inbound",
        senderType: "patient",
        providerMessageId: "provider-other-1",
        text: "Other tenant message",
        sentAt: firstInboundAt,
      },
      ...extraMessages,
    ],
  };
}

test("inbox projection updates from inbound message state", async () => {
  const { buildConversationProjectionFromState } = await import(
    "../../src/server/inbox-projections"
  );

  const projection = buildConversationProjectionFromState(
    stateWithThread(),
    "conv-projection",
    nowIso,
  );

  assert.equal(projection?.organizationId, defaultOrganizationId);
  assert.equal(projection?.conversationId, "conv-projection");
  assert.equal(projection?.lastMessagePreview, "I need an implant consultation this week.");
  assert.equal(projection?.lastMessageDirection, "inbound");
  assert.equal(projection?.unreadCount, 1);
  assert.equal(projection?.responseState, "waiting");
});

test("inbox projection updates from outbound manager reply", async () => {
  const { buildConversationProjectionFromState } = await import(
    "../../src/server/inbox-projections"
  );

  const projection = buildConversationProjectionFromState(
    stateWithThread([
      {
        id: "msg-outbound-projection",
        conversationId: "conv-projection",
        direction: "outbound",
        senderType: "manager",
        providerMessageId: "local-out-1",
        text: "We can see you tomorrow at 10.",
        sentAt: "2026-05-02T09:58:00.000Z",
      },
    ]),
    "conv-projection",
    nowIso,
  );

  assert.equal(projection?.lastMessagePreview, "We can see you tomorrow at 10.");
  assert.equal(projection?.lastMessageDirection, "outbound");
  assert.equal(projection?.responseState, "responded");
  assert.equal(projection?.leadStage, "in_conversation");
});

test("duplicate inbound messages do not inflate projection unread counters", async () => {
  const { buildConversationProjectionFromState } = await import(
    "../../src/server/inbox-projections"
  );

  const projection = buildConversationProjectionFromState(
    stateWithThread([
      {
        id: "msg-inbound-duplicate",
        conversationId: "conv-projection",
        direction: "inbound",
        senderType: "patient",
        providerMessageId: "provider-in-1",
        text: "I need an implant consultation this week.",
        sentAt: firstInboundAt,
      },
    ]),
    "conv-projection",
    nowIso,
  );

  assert.equal(projection?.unreadCount, 1);
});

test("tenant projection listing is scoped before returning rows", async () => {
  const {
    buildInboxProjectionWhere,
    listConversationProjectionsFromState,
  } = await import("../../src/server/inbox-projections");

  assert.deepEqual(buildInboxProjectionWhere({ organizationId: "org-a" }), {
    organizationId: "org-a",
  });
  assert.deepEqual(
    buildInboxProjectionWhere({
      organizationId: "org-a",
      assignedTo: "user-a",
      status: "open",
    }),
    {
      organizationId: "org-a",
      assignedTo: "user-a",
      status: "open",
    },
  );

  const projections = listConversationProjectionsFromState(
    stateWithThread(),
    defaultOrganizationId,
    nowIso,
  );

  assert.deepEqual(
    projections.map((projection) => projection.organizationId),
    [defaultOrganizationId],
  );
});

test("delivery failure patch remains visible and failed outbox stays retryable", async () => {
  const { buildDeliveryUpdatePatch } = await import("../../src/server/message-deliveries");
  const { isRetryableOutboxStatus } = await import("../../src/server/outbox-pipeline");

  const patch = buildDeliveryUpdatePatch({
    status: "failed",
    attempts: 2,
    errorCode: "provider_failure",
    errorMessage: "Provider rejected the message",
    timestampIso: nowIso,
  });

  assert.equal(patch.status, "failed");
  assert.equal(patch.attemptCount, 2);
  assert.equal(patch.lastErrorCode, "provider_failure");
  assert.equal(patch.failedAt?.toISOString(), nowIso);
  assert.equal(isRetryableOutboxStatus("failed"), true);
  assert.equal(isRetryableOutboxStatus("dead_letter"), false);
  assert.equal(isRetryableOutboxStatus("dispatched"), false);
});
