import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { captureError, structuredLog } from "./observability";

const sensitiveKeyPattern = /(email|phone|name|token|secret|password|credential|message|patient)/i;

function safeProperties(properties: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? "__redacted__" : value,
    ]),
  );
}

export async function recordProductEvent(input: {
  organizationId?: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const properties = safeProperties(input.properties);

  try {
    await prisma.analyticsEvent.create({
      data: {
        organizationId: input.organizationId,
        event: input.event,
        properties: properties as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const captured = captureError(error, {
      event: "analytics.event.persist_exception",
      organizationId: input.organizationId,
      operation: "analytics.event.persist",
    });
    structuredLog("warn", "analytics.event.persist_failed", {
      organizationId: input.organizationId,
      event: input.event,
      errorCode: captured.id,
    });
  }

  structuredLog("info", "analytics.event.recorded", {
    organizationId: input.organizationId,
    event: input.event,
    properties,
  });
}
