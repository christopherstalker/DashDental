import { randomBytes } from "node:crypto";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { ApiError } from "@/server/api-error";
import { mutateAppState, readAppState } from "@/server/data-store";
import { optionalString, requiredString } from "@/server/validation";

function readEvents(payload: Record<string, unknown>): string[] {
  const value = payload.events;
  if (!Array.isArray(value)) {
    return ["lead.booked", "conversation.sla_breached"];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "admin");
    const url = new URL(request.url);
    const organizationId = assertSameOrganization(
      context,
      url.searchParams.get("organizationId") ?? undefined,
    );

    return Response.json({
      endpoints: state.outgoingWebhookEndpoints.filter(
        (endpoint) => endpoint.organizationId === organizationId,
      ),
      channelHealth: state.integrations
        .filter((integration) => integration.organizationId === organizationId)
        .map((integration) => ({
          provider: integration.provider,
          status: integration.status,
          healthScore: integration.healthScore,
          lastSyncAt: integration.lastSyncAt,
          alert:
            integration.status === "disconnected" || integration.status === "degraded"
              ? integration.errorState ?? "Channel needs attention"
              : undefined,
        })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const url = requiredString(payload, "url");
    if (!/^https:\/\//i.test(url)) {
      throw new ApiError(400, "url must be HTTPS", "validation_error");
    }

    const nowIso = new Date().toISOString();
    const secret = `whsec_${randomBytes(8).toString("hex")}`;
    const state = await mutateAppState((current) => ({
      ...current,
      outgoingWebhookEndpoints: [
        {
          id: `webhook-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          organizationId,
          name: optionalString(payload, "name") ?? "Zapier webhook",
          url,
          events: readEvents(payload),
          status: "active",
          secretPreview: `${secret.slice(0, 8)}...${secret.slice(-3)}`,
          createdBy: context.userId,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...(current.outgoingWebhookEndpoints ?? []),
      ],
    }));

    return Response.json(
      {
        endpoints: state.outgoingWebhookEndpoints.filter(
          (endpoint) => endpoint.organizationId === organizationId,
        ),
        secret,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
