import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

test("AI reply guardrails block PHI, diagnosis keywords, MRNs, and medications", async () => {
  const { evaluateAiReplyDraft } = await import("../../src/server/ai-guardrails");
  const cases = [
    {
      label: "full name plus DOB",
      text: "Jane Miller DOB 1988-04-22 needs implant pricing. Can we book her?",
      term: "phi:name_dob",
    },
    {
      label: "standalone DOB",
      text: "DOB: 04/22/1988, can you confirm the appointment?",
      term: "phi:dob",
    },
    {
      label: "MRN",
      text: "MRN AB-12345 is ready for recall. Can we call?",
      term: "phi:mrn",
    },
    {
      label: "diagnosis keyword",
      text: "The cancer history is noted. Can you come tomorrow?",
      term: "phi:diagnosis_keyword",
    },
    {
      label: "medication",
      text: "Take amoxicillin and then come in. Can you book today?",
      term: "phi:medication",
    },
  ];

  for (const item of cases) {
    const review = evaluateAiReplyDraft(item.text);
    assert.equal(review.status, "blocked", item.label);
    assert.ok(review.blockedTerms.includes(item.term), item.label);
  }
});

test("AI guardrails cover multilingual, short, semantic, and near-PHI edge cases", async () => {
  const { evaluateAiReplyDraft } = await import("../../src/server/ai-guardrails");
  const cases = [
    { expected: "blocked", text: "Garantizamos que el seguro lo cubre, quieres reservar?" },
    { expected: "blocked", text: "Ми гарантуємо результат 100%, коли вам зручно?" },
    { expected: "blocked", text: "No need to see a dentist, probably fine. Can you wait it out?" },
    { expected: "blocked", text: "Пацієнт має ВІЛ, можна записати завтра?" },
    { expected: "blocked", text: "Depression medication noted, can we book?" },
    { expected: "needs_review", text: "Ok?" },
    { expected: "needs_review", text: "Hi Ava, we can help today" },
    { expected: "approved", text: "Hi, our front desk can help with appointment options. Would today afternoon or tomorrow morning work?" },
    { expected: "needs_review", text: "Call 4567?" },
    { expected: "needs_review", text: "Mila, can we call you today?" },
  ] as const;

  for (const item of cases) {
    const review = evaluateAiReplyDraft(item.text);
    assert.equal(review.status, item.expected, item.text);
  }
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

test("guarded AI reply draft does not return a safe version for PHI failures", async () => {
  const { createGuardedAiReplyDraft } = await import("../../src/server/ai-guardrails");

  const result = createGuardedAiReplyDraft({
    organizationId: "org-test",
    conversationId: "conv-test",
    nowIso: "2026-06-01T08:00:00.000Z",
    lead: {
      id: "lead-test",
      organizationId: "org-test",
      name: "Jane Miller DOB 1988-04-22",
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
        text: "Need an appointment",
        sentAt: "2026-06-01T07:59:00.000Z",
      },
    ],
  });

  assert.equal(result.review.status, "blocked");
  assert.equal(result.text, "");
  assert.equal(result.insight.resultJson.draft, undefined);
});

test("LLM summary prompt is conservative about uncertain facts", () => {
  const source = readFileSync(join(process.cwd(), "src/server/ai-provider.ts"), "utf8");
  assert.match(source, /Be conservative: if a fact is uncertain/);
  assert.match(source, /Do not include patient identifiers/);
});

test("AI reply drafts are logged before the API returns them to the user", () => {
  const source = readFileSync(
    join(process.cwd(), "src/app/api/v1/ai/conversations/[id]/reply-draft/route.ts"),
    "utf8",
  );
  const persisted = source.indexOf("aiInsights: [draft.insight");
  const audit = source.indexOf('action: "ai_message_log.reply_draft_created"');
  const response = source.indexOf("return Response.json");

  assert.ok(persisted > 0, "draft insight must be persisted");
  assert.ok(audit > persisted, "AI message-log audit must happen after draft persistence");
  assert.ok(response > audit, "route must log before returning draft text");
});
