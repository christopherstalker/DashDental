import { createHash, randomBytes } from "node:crypto";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { mutateAppState, readAppState } from "@/server/data-store";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { optionalString, requiredString } from "@/server/validation";

function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

function sanitizeApiKey(key: (Awaited<ReturnType<typeof readAppState>>)["partnerApiKeys"][number]) {
  return {
    id: key.id,
    organizationId: key.organizationId,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    status: key.status,
    lastUsedAt: key.lastUsedAt,
    createdBy: key.createdBy,
    createdAt: key.createdAt,
  };
}

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
      apiKeys: state.partnerApiKeys
        .filter((key) => key.organizationId === organizationId)
        .map(sanitizeApiKey),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertPublicRouteRateLimit(request, { route: "api_key" });
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
          keyHash: hashApiKey(rawKey),
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
        apiKeys: state.partnerApiKeys
          .filter((key) => key.organizationId === organizationId)
          .map(sanitizeApiKey),
        key: rawKey,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
