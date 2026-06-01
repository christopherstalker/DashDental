import assert from "node:assert/strict";
import test from "node:test";
import { defaultOrganizationId, getInitialAppState } from "../../src/domain/seed-data";

test("review and recall queue separates booked reviews from lost lead recalls", async () => {
  const { buildReviewAndRecallQueue } = await import("../../src/server/review-recall");
  const state = getInitialAppState();

  const queue = buildReviewAndRecallQueue(
    state,
    defaultOrganizationId,
    "2026-04-23T12:00:00.000Z",
  );

  assert.ok(queue.reviews.some((item) => item.leadId === "lead-004"));
  assert.ok(queue.recalls.some((item) => item.leadId === "lead-005"));
  assert.ok(queue.recalls.every((item) => item.estimatedValue > 0));
});

test("review request is idempotent and leaves an audited outbound message", async () => {
  const { requestPatientReviewInState } = await import("../../src/server/review-recall");
  const state = getInitialAppState();

  const first = requestPatientReviewInState(state, {
    leadId: "lead-004",
    actorUserId: "user-manager",
    reviewUrl: "https://example.com/review",
    nowIso: "2026-04-23T12:00:00.000Z",
  });
  const second = requestPatientReviewInState(first, {
    leadId: "lead-004",
    actorUserId: "user-manager",
    reviewUrl: "https://example.com/review",
    nowIso: "2026-04-23T12:01:00.000Z",
  });

  assert.equal(
    second.auditLogs.filter((log) => log.action === "review.requested" && log.entityId === "lead-004").length,
    1,
  );
  assert.equal(second.messages.filter((message) => message.providerMessageId.startsWith("review-request")).length, 1);
});

test("recall reminder is scheduled once per missed lead", async () => {
  const { scheduleRecallReminderInState } = await import("../../src/server/review-recall");
  const state = getInitialAppState();

  const first = scheduleRecallReminderInState(state, {
    leadId: "lead-005",
    actorUserId: "user-manager",
    remindAt: "2026-04-24T09:00:00.000Z",
  });
  const second = scheduleRecallReminderInState(first, {
    leadId: "lead-005",
    actorUserId: "user-manager",
    remindAt: "2026-04-24T10:00:00.000Z",
  });

  assert.equal(second.conversationReminders.filter((item) => item.leadId === "lead-005").length, 1);
  assert.ok(second.auditLogs.some((log) => log.action === "recall.reminder_scheduled"));
});
