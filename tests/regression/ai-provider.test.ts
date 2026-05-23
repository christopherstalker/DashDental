import assert from "node:assert/strict";
import test from "node:test";
import { createConversationAiSummary } from "../../src/server/ai-provider";
import type { Lead, Message } from "../../src/domain/types";

const baseLead: Lead = {
  id: "lead-ai-provider-test",
  organizationId: "org-smile-studio",
  name: "Demo Patient",
  source: "web_form",
  status: "new",
  providerContactId: "demo-patient",
  firstMessageAt: "2026-05-23T12:00:00.000Z",
  estimatedValue: 620,
  createdAt: "2026-05-23T12:00:00.000Z",
  updatedAt: "2026-05-23T12:00:00.000Z",
};

const baseMessages: Message[] = [
  {
    id: "msg-ai-provider-test",
    conversationId: "conv-ai-provider-test",
    direction: "inbound",
    senderType: "patient",
    providerMessageId: "provider-ai-provider-test",
    text: "I need an implant consultation and want to know the price this week.",
    sentAt: "2026-05-23T12:01:00.000Z",
  },
];

function snapshotAiEnv() {
  return {
    AI_DETERMINISTIC_FALLBACK: process.env.AI_DETERMINISTIC_FALLBACK,
    AI_MODEL: process.env.AI_MODEL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_PROVIDER_TIMEOUT_MS: process.env.AI_PROVIDER_TIMEOUT_MS,
    GEMINI_API_BASE_URL: process.env.GEMINI_API_BASE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  };
}

function restoreEnv(snapshot: ReturnType<typeof snapshotAiEnv>) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test("Gemini provider sends structured summary request and stores AiInsight result", async () => {
  const envSnapshot = snapshotAiEnv();
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  let requestHeaders: HeadersInit | undefined;

  try {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_MODEL = "gemini-2.5-flash";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.GEMINI_MODEL;

    globalThis.fetch = (async (input, init) => {
      assert.match(String(input), /\/models\/gemini-2\.5-flash:generateContent$/);
      requestHeaders = init?.headers;
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: "Patient wants implant pricing and a consultation slot this week.",
                      intent: "implant_consultation",
                      riskScore: 42,
                      recommendation: "Offer one consultation slot and confirm the callback number.",
                      bullets: ["Asks about implant consultation", "Needs pricing", "Wants availability this week"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const insight = await createConversationAiSummary({
      organizationId: "org-smile-studio",
      lead: baseLead,
      conversationId: "conv-ai-provider-test",
      messages: baseMessages,
      nowIso: "2026-05-23T12:02:00.000Z",
    });

    assert.equal(insight.model, "gemini-2.5-flash");
    assert.equal(insight.promptVersion, "conversation-summary-gemini-v1");
    assert.equal(insight.resultJson.intent, "implant_consultation");
    assert.equal(insight.resultJson.riskScore, 42);
    assert.deepEqual(insight.resultJson.bullets, [
      "Asks about implant consultation",
      "Needs pricing",
      "Wants availability this week",
    ]);
    assert.deepEqual(requestHeaders, {
      "Content-Type": "application/json",
      "x-goog-api-key": "test-gemini-key",
    });
    assert.equal(
      (requestBody?.generationConfig as { responseMimeType?: string })?.responseMimeType,
      "application/json",
    );
    assert.ok(
      (requestBody?.generationConfig as { responseJsonSchema?: unknown })?.responseJsonSchema,
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(envSnapshot);
  }
});

test("AI provider keeps deterministic demo summary when Gemini is not enabled", async () => {
  const envSnapshot = snapshotAiEnv();

  try {
    process.env.AI_PROVIDER = "deterministic";
    delete process.env.GEMINI_API_KEY;

    const insight = await createConversationAiSummary({
      organizationId: "org-smile-studio",
      lead: baseLead,
      conversationId: "conv-ai-provider-test",
      messages: baseMessages,
      nowIso: "2026-05-23T12:02:00.000Z",
    });

    assert.equal(insight.model, "deterministic-summary-v1");
    assert.equal(insight.promptVersion, "summary-v1");
    assert.equal(insight.type, "conversation_summary");
    assert.ok(insight.resultJson.summary);
  } finally {
    restoreEnv(envSnapshot);
  }
});
