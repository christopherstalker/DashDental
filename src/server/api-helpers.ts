import { scopeAppStateToOrganization } from "@/domain/state-scope";
import { isDemoOrganizationId } from "@/domain/seed-data";
import type { AppState, Membership, Role, User } from "@/domain/types";
import { ApiError } from "./api-error";
import { assertWorkspaceFeatureAccess } from "./entitlements";
import {
  decodeSession,
  getSessionTokenFromRequest,
  resolveSessionContext,
} from "./session";
import { captureError } from "./observability";
import { assertSameOriginRequest } from "./request-security";
import { assertPrivilegedMfaSatisfied } from "./mfa";
export { ApiError } from "./api-error";

export interface RequestContext {
  user: User;
  userId: string;
  organizationId: string;
  role: Role;
  membership?: Membership;
  isSuperAdmin: boolean;
  mfaVerifiedAt?: number;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      captureError(error, {
        event: "server.api_error",
        status: error.status,
        code: error.code,
      });

      return Response.json(
        { error: "Unexpected server error", code: error.code },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.status },
    );
  }

  captureError(error, { event: "server.unexpected_error" });
  return Response.json(
    { error: "Unexpected server error", code: "unexpected_error" },
    { status: 500 },
  );
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  assertSameOriginRequest(request);
  const value = await request.json().catch(() => ({}));
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getRequestContext(
  request: Request,
  state: AppState,
  requiredRole: Role = "manager",
): RequestContext {
  const context = resolveSessionContext(
    state,
    decodeSession(getSessionTokenFromRequest(request)),
    requiredRole,
  );
  if (!shouldSkipBillingLock(request, context)) {
    assertWorkspaceFeatureAccess(state, context.organizationId, "inbox_read");
  }
  assertPrivilegedMfaSatisfied(context, requiredRole);

  return context;
}

function shouldSkipBillingLock(request: Request, context: RequestContext): boolean {
  if (context.isSuperAdmin || isDemoOrganizationId(context.organizationId)) {
    return true;
  }

  const pathname = new URL(request.url).pathname;
  return (
    pathname.startsWith("/api/v1/auth/") ||
    pathname.startsWith("/api/v1/billing/") ||
    pathname.startsWith("/api/v1/admin/") ||
    pathname.startsWith("/api/v1/health/") ||
    pathname.startsWith("/api/v1/launch/") ||
    pathname.startsWith("/api/v1/webhooks/")
  );
}

export function stateForContext(state: AppState, context: RequestContext): AppState {
  const scopedState = context.isSuperAdmin
    ? state
    : scopeAppStateToOrganization(state, context.organizationId);
  const visibleIntegrationEvents = scopedState.integrationEvents.filter((event) => {
    const payload = event.payloadJson as { setupRequired?: unknown } | undefined;
    return !(event.provider === "clinic_database" && payload?.setupRequired === true);
  });

  return {
    ...scopedState,
    inviteTokens: [],
    integrations: scopedState.integrations.map((integration) => ({
      ...integration,
      encryptedCredentials: integration.encryptedCredentials ? "__configured__" : "",
      webhookSecret: integration.webhookSecret ? "__hidden__" : "",
    })),
    integrationEvents: visibleIntegrationEvents,
  };
}

export function assertSameOrganization(
  context: RequestContext,
  organizationId?: string,
): string {
  const targetOrganizationId = organizationId ?? context.organizationId;

  if (!context.isSuperAdmin && targetOrganizationId !== context.organizationId) {
    throw new ApiError(403, "Cross-organization access is not allowed", "forbidden");
  }

  return targetOrganizationId;
}
