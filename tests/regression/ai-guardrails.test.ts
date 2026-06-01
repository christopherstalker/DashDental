import assert from "node:assert/strict";
import test from "node:test";

test("AI reply guardrails block clinical and billing promises", async () => {
  const { evaluateAiReplyDraft } = await import("../../src/server/ai-guardrails");

  const review = evaluateAiReplyDraft(
    "We diagnose this as infection and guarantee insurance will cover the appointment.",
  );

  assert.equal(review.status, "blocked");
  assert.equal(review.requiresHumanApproval, true);
  assert.ok(review.blockedTerms.includes("diagnosis"));
  assert.ok(review.blockedTerms.includes("guarantee"));
  assert.ok(review.blockedTerms.includes("insurance promise"));
});

test("guarded AI reply draft stays draft-only and actionable", async () => {
  const { createGuardedAiReplyDraft } = await import("../../src/server/ai-guardrails");

  const result = createGuardedAiReplyDraft({
    organizationId: "org-test",
    conversationId: "conv-test",
    nowIso: "2026-06-01T08:00:00.000Z",
    lead: {
      id: "lead-test",
      organizationId: "org-test",
      name: "Mila K.",
      source: "instagram",
      status: "new",
      providerContactId: "ig-1",
      firstMessageAt: "2026-06-01T07:59:00.000Z",
      estimatedValue: 620,
      createdAt: "2026-06-01T07:59:00.000Z",
      updatedAt: "2026-06-01T07:59:00.000Z",
    },
    messages: [
      {
        id: "msg-test",
        conversationId: "conv-test",
        direction: "inbound",
        senderType: "patient",
        providerMessageId: "ig-msg-1",
        text: "Do you have implant consultation times this week?",
        sentAt: "2026-06-01T07:59:00.000Z",
      },
    ],
  });

  assert.equal(result.review.requiresHumanApproval, true);
  assert.notEqual(result.review.status, "blocked");
  assert.match(result.text, /consultation/i);
  assert.equal(result.insight.type, "reply_draft");
  assert.equal(result.insight.resultJson.draft, result.text);
});
