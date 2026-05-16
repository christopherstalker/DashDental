import {
  createCorrelationId,
  getCorrelationIdFromRequest,
  structuredLog,
} from "@/server/observability";
import { errorResponse } from "@/server/api-helpers";
import { sanitizeLaunchEventPayload } from "@/server/launch-analytics";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";

export async function POST(request: Request) {
  try {
    assertPublicRouteRateLimit(request, { route: "launch_events" });

    const correlationId = getCorrelationIdFromRequest(request);
    const eventId = createCorrelationId("launch");
    const payload = await readLaunchEventBody(request);
    const sanitized = sanitizeLaunchEventPayload(payload);

    if (!sanitized.ok) {
      const candidateEvent =
        typeof payload.event === "string" ? payload.event.slice(0, 96) : undefined;

      structuredLog("warn", "launch.analytics.rejected", {
        candidateEvent,
        code: sanitized.code,
        contentLength: request.headers.get("content-length"),
        contentType: request.headers.get("content-type"),
        correlationId,
        eventId,
        payloadKeys: Object.keys(payload).sort(),
        referer: request.headers.get("referer"),
      });

      return Response.json(
        {
          ok: false,
          code: sanitized.code,
        },
        {
          headers: { "cache-control": "no-store" },
          status: sanitized.status,
        },
      );
    }

    structuredLog("info", "launch.analytics.event", {
      correlationId,
      event: sanitized.event,
      eventId,
      ...sanitized.context,
    });

    return Response.json(
      {
        ok: true,
        eventId,
      },
      {
        headers: { "cache-control": "no-store" },
        status: 202,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

async function readLaunchEventBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text().catch(() => "");

  if (text.length > 4096) {
    return {
      event: "__oversized__",
    };
  }

  if (!text.trim()) {
    return {};
  }

  let value: unknown;

  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return readUrlEncodedLaunchEvent(text);
  }

  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readUrlEncodedLaunchEvent(text: string): Record<string, unknown> {
  const params = new URLSearchParams(text);

  if (!params.has("event")) {
    return {};
  }

  return Object.fromEntries(params.entries());
}
