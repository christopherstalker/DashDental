import { randomBytes } from "node:crypto";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { mutateAppState, readAppState } from "@/server/data-store";
import { optionalString, requiredString } from "@/server/validation";

function readScopes(payload: Record<string, unknown>): string[] {
  const value = payload.scopes;
  if (!Array.isArray(value)) {
    return ["conversations:read", "leads:read"];
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
      apiKeys: state.partnerApiKeys.filter((key) => key.organizationId === organizationId),
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
    const rawKey = `dd_live_${randomBytes(24).toString("hex")}`;
    const nowIso = new Date().toISOString();
    const state = await mutateAppState((current) => ({
      ...current,
      partnerApiKeys: [
        {
          id: `api-key-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          organizationId,
          name: requiredString(payload, "name"),
          keyPrefix: rawKey.slice(0, 12),
          scopes: readScopes(payload),
          status: "active",
          createdBy: context.userId,
          createdAt: nowIso,
        },
        ...(current.partnerApiKeys ?? []),
      ],
    }));

    return Response.json(
      {
        apiKeys: state.partnerApiKeys.filter((key) => key.organizationId === organizationId),
        key: rawKey,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
