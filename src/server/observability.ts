import crypto from "node:crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const sensitiveKeyPattern =
  /(authorization|cookie|secret|token|password|signature|credential|rawbody|rawpayload|body|email|phone|text|message|patient)/i;
const safeStatusKeyPattern = /^(status|processingStatus|deliveryStatus|verificationStatus|signatureStatus)$/i;
const redacted = "__redacted__";

function redactString(value: string): string {
  if (value.includes("@") || /\+?\d[\d\s().-]{7,}/.test(value)) {
    return redacted;
  }

  return value;
}

export function redactForLog(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveKeyPattern.test(key) && !safeStatusKeyPattern.test(key)) {
    return redacted;
  }
  if (depth > 8) {
    return "[MaxDepth]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return redactString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item, key, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redactForLog(childValue, childKey, depth + 1),
      ]),
    );
  }

  return String(value);
}

export function createCorrelationId(prefix = "corr"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getCorrelationIdFromRequest(request: Request): string {
  return (
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-request-id") ??
    createCorrelationId("web")
  );
}

export function structuredLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    at: new Date().toISOString(),
    ...(redactForLog(fields) as LogFields),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  return payload;
}

export function captureError(
  error: unknown,
  context: LogFields & { event?: string } = {},
) {
  const normalized = {
    event: context.event ?? "error.captured",
    errorName: error instanceof Error ? error.name : "Error",
    errorMessage: error instanceof Error ? error.message : String(error),
    ...context,
  };

  structuredLog("error", normalized.event, normalized);

  return {
    captured: Boolean(process.env.SENTRY_DSN?.trim()),
    ...(redactForLog(normalized) as LogFields),
  };
}

export async function withErrorCapture<T>(
  event: string,
  fields: LogFields,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    captureError(error, { event, ...fields });
    throw error;
  }
}
