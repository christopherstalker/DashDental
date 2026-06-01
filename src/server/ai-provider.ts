import {
  createDeterministicAiSummary,
  estimateAiInsightCost,
} from "@/domain/business-rules";
import type { AiInsight, Lead, Message } from "@/domain/types";
import { ApiError } from "./api-error";

type AiProvider = "deterministic" | "gemini";

type ConversationSummaryInput = {
  organizationId: string;
  lead: Lead;
  conversationId: string;
  messages: Message[];
  nowIso: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiSummaryPayload = {
  summary?: unknown;
  intent?: unknown;
  riskScore?: unknown;
  recommendation?: unknown;
  bullets?: unknown;
};

const DEFAULT_GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_PROMPT_VERSION = "conversation-summary-gemini-v1";

const geminiSummarySchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "One concise operational summary for the front desk.",
    },
    intent: {
      type: "string",
      description: "Short snake_case intent label, for example booking or price_question.",
    },
    riskScore: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Lead recovery risk score where 0 is low risk and 100 is urgent.",
    },
    recommendation: {
      type: "string",
      description: "One concrete next action for the clinic team.",
    },
    bullets: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
      description: "Key facts from the transcript. Do not invent facts.",
    },
  },
  required: ["summary", "intent", "riskScore", "recommendation", "bullets"],
  additionalProperties: false,
  propertyOrdering: ["summary", "intent", "riskScore", "recommendation", "bullets"],
} as const;

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getAiProvider(): AiProvider {
  const explicitProvider = readEnv("AI_PROVIDER")?.toLowerCase();

  if (!explicitProvider) {
    return readEnv("GEMINI_API_KEY") ? "gemini" : "deterministic";
  }

  if (explicitProvider === "gemini" || explicitProvider === "google") {
    return "gemini";
  }

  if (explicitProvider === "deterministic" || explicitProvider === "demo") {
    return "deterministic";
  }

  throw new ApiError(
    500,
    "AI_PROVIDER must be set to gemini or deterministic.",
    "ai_provider_unsupported",
  );
}

function isDeterministicFallbackEnabled(): boolean {
  return readEnv("AI_DETERMINISTIC_FALLBACK")?.toLowerCase() === "true";
}

function getTimeoutMs(): number {
  const parsed = Number(readEnv("AI_PROVIDER_TIMEOUT_MS") ?? "12000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
}

function getGeminiModel(): string {
  return readEnv("GEMINI_MODEL") ?? readEnv("AI_MODEL") ?? DEFAULT_GEMINI_MODEL;
}

function getGeminiApiBaseUrl(): string {
  return (readEnv("GEMINI_API_BASE_URL") ?? DEFAULT_GEMINI_API_BASE_URL).replace(/\/+$/, "");
}

function normalizeGeminiModel(model: string): string {
  return model.replace(/^models\//, "");
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function buildConversationSummaryPrompt(input: ConversationSummaryInput): string {
  const transcript = input.messages
    .map((message) => {
      const speaker =
        message.senderType === "patient"
          ? "patient"
          : message.senderType === "manager"
            ? "clinic_team"
            : message.senderType;

      return `[${message.sentAt}] ${speaker} (${message.direction}): ${truncate(
        message.text.replace(/\s+/g, " ").trim(),
        700,
      )}`;
    })
    .join("\n");

  return [
    "You are analyzing a dental clinic lead recovery conversation for the front desk team.",
    "Return only JSON that matches the provided schema.",
    "Do not diagnose, do not invent clinical facts, and do not claim that an appointment is booked unless the transcript says so.",
    "Be conservative: if a fact is uncertain, say it needs staff review instead of presenting it as true.",
    "Do not include patient identifiers in recommendations unless they are already operationally necessary for the front desk.",
    "",
    `Lead name: ${input.lead.name}`,
    `Lead status: ${input.lead.status}`,
    `Lead source: ${input.lead.source}`,
    `Estimated value: ${input.lead.estimatedValue}`,
    "",
    "Transcript:",
    transcript || "No messages yet.",
  ].join("\n");
}

function extractGeminiText(payload: GeminiGenerateContentResponse): string {
  const text = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n")
    .trim();

  if (!text) {
    throw new ApiError(502, "Gemini returned an empty response.", "ai_provider_empty_response");
  }

  return text;
}

async function readGeminiResponse(response: Response): Promise<GeminiGenerateContentResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as GeminiGenerateContentResponse;
  } catch {
    throw new ApiError(502, "Gemini returned non-JSON data.", "ai_provider_invalid_response");
  }
}

function parseSummaryJson(text: string): GeminiSummaryPayload {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as GeminiSummaryPayload)
      : {};
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new ApiError(502, "Gemini summary was not valid JSON.", "ai_provider_invalid_json");
    }

    const parsed = JSON.parse(objectMatch[0]);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as GeminiSummaryPayload)
      : {};
  }
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readRiskScore(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function readBullets(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const bullets = value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim())
    .slice(0, 4);

  return bullets.length ? bullets : undefined;
}

function toProviderError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError(504, "Gemini request timed out.", "ai_provider_timeout");
  }

  return new ApiError(502, "Gemini request failed.", "ai_provider_failed");
}

async function createGeminiConversationSummary(
  input: ConversationSummaryInput,
  fallbackInsight: AiInsight,
): Promise<AiInsight> {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new ApiError(
      500,
      "GEMINI_API_KEY is required when Gemini AI is enabled.",
      "ai_provider_not_configured",
    );
  }

  const model = normalizeGeminiModel(getGeminiModel());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(
      `${getGeminiApiBaseUrl()}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildConversationSummaryPrompt(input) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseJsonSchema: geminiSummarySchema,
          },
        }),
        signal: controller.signal,
      },
    );
    const payload = await readGeminiResponse(response);

    if (!response.ok) {
      throw new ApiError(
        502,
        payload.error?.message ?? "Gemini request failed.",
        "ai_provider_failed",
        {
          provider: "gemini",
          status: response.status,
          reason: payload.error?.status,
        },
      );
    }

    const summaryPayload = parseSummaryJson(extractGeminiText(payload));
    const riskScore = readRiskScore(
      summaryPayload.riskScore,
      fallbackInsight.resultJson.riskScore ?? 50,
    );

    return {
      id: createRuntimeId("ai"),
      organizationId: input.organizationId,
      leadId: input.lead.id,
      conversationId: input.conversationId,
      type: "conversation_summary",
      resultJson: {
        summary: readString(
          summaryPayload.summary,
          fallbackInsight.resultJson.summary ?? "Conversation needs front desk review.",
        ),
        intent: readString(
          summaryPayload.intent,
          fallbackInsight.resultJson.intent ?? "booking",
        ),
        riskScore,
        recommendation: readString(
          summaryPayload.recommendation,
          fallbackInsight.resultJson.recommendation ?? "Review the transcript and reply with one clear next step.",
        ),
        bullets: readBullets(summaryPayload.bullets),
      },
      model,
      promptVersion: GEMINI_PROMPT_VERSION,
      confidence: riskScore >= 70 ? 0.86 : 0.82,
      costEstimate: estimateAiInsightCost(input.messages),
      createdAt: input.nowIso,
    };
  } catch (error) {
    throw toProviderError(error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function createConversationAiSummary(
  input: ConversationSummaryInput,
): Promise<AiInsight> {
  const fallbackInsight = createDeterministicAiSummary(
    input.organizationId,
    input.lead,
    input.conversationId,
    input.messages,
    input.nowIso,
  );

  if (getAiProvider() === "deterministic") {
    return fallbackInsight;
  }

  try {
    return await createGeminiConversationSummary(input, fallbackInsight);
  } catch (error) {
    if (isDeterministicFallbackEnabled()) {
      return {
        ...fallbackInsight,
        model: "deterministic-summary-v1",
        promptVersion: "summary-v1-fallback",
        confidence: Math.min(fallbackInsight.confidence, 0.72),
      };
    }

    throw error;
  }
}
