import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@/domain/types";
import { ApiError, getRequestContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import {
  decodeSession,
  getSessionTokenFromRequest,
  resolveSessionContext,
  SESSION_COOKIE_NAME,
} from "@/server/session";

interface BackendAdminPrincipal {
  userId: string;
  organizationId: string;
  role: Role;
  email: string;
  sessionId: string;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getBackendBaseUrl(): string {
  const configuredBase =
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    process.env.NEST_API_URL?.trim() ||
    `http://localhost:${process.env.APP_PORT?.trim() || "4000"}`;
  const normalizedBase = configuredBase.endsWith("/")
    ? configuredBase.slice(0, -1)
    : configuredBase;

  return normalizedBase.endsWith("/api/v1")
    ? normalizedBase
    : `${normalizedBase}/api/v1`;
}

function getBackendJwtSecret(): string {
  return process.env.JWT_ACCESS_SECRET?.trim() || "replace-me";
}

function createBackendAccessToken(principal: BackendAdminPrincipal): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: principal.userId,
      userId: principal.userId,
      organizationId: principal.organizationId,
      role: principal.role,
      email: principal.email,
      sessionId: principal.sessionId,
      iat: nowSeconds,
      exp: nowSeconds + 5 * 60,
      aud: "dental-recovery-backend",
      iss: "dental-recovery-web",
    }),
  );
  const signature = crypto
    .createHmac("sha256", getBackendJwtSecret())
    .update(`${header}.${payload}`)
    .digest();

  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

function normalizeBackendPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

async function parseBackendResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : "Backend admin request failed";
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String(payload.code)
        : "backend_request_failed";

    throw new ApiError(response.status, message, code, payload);
  }

  return payload as T;
}

async function fetchBackendAdminWithPrincipal<T>(
  principal: BackendAdminPrincipal,
  path: string,
  init?: RequestInit,
  correlationId?: string | null,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${createBackendAccessToken(principal)}`);
  if (!headers.has("x-correlation-id")) {
    headers.set("x-correlation-id", correlationId?.trim() || `web-${crypto.randomUUID()}`);
  }
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getBackendBaseUrl()}${normalizeBackendPath(path)}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  return parseBackendResponse<T>(response);
}

export async function resolveBackendAdminPrincipal(
  requiredRole: Role = "super_admin",
): Promise<BackendAdminPrincipal> {
  const state = await readAppState();
  const cookieStore = await cookies();
  const sessionPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const context = resolveSessionContext(state, sessionPayload, requiredRole);

  return {
    userId: context.user.id,
    organizationId: context.organizationId,
    role: context.role,
    email: context.user.email,
    sessionId: sessionPayload?.nonce ?? `web-${context.user.id}`,
  };
}

export async function resolveBackendAdminPrincipalFromRequest(
  request: Request,
  requiredRole: Role = "super_admin",
): Promise<BackendAdminPrincipal> {
  const state = await readAppState();
  const context = getRequestContext(request, state, requiredRole);
  const sessionPayload = decodeSession(getSessionTokenFromRequest(request));

  return {
    userId: context.user.id,
    organizationId: context.organizationId,
    role: context.role,
    email: context.user.email,
    sessionId: sessionPayload?.nonce ?? `web-${context.user.id}`,
  };
}

export async function fetchBackendAdminFromServer<T>(
  path: string,
  init?: RequestInit,
  requiredRole: Role = "super_admin",
): Promise<T> {
  const principal = await resolveBackendAdminPrincipal(requiredRole);
  return fetchBackendAdminWithPrincipal<T>(principal, path, init);
}

export async function fetchBackendAdminFromRequest<T>(
  request: Request,
  path: string,
  init?: RequestInit,
  requiredRole: Role = "super_admin",
): Promise<T> {
  const principal = await resolveBackendAdminPrincipalFromRequest(request, requiredRole);
  return fetchBackendAdminWithPrincipal<T>(
    principal,
    path,
    init,
    request.headers.get("x-correlation-id") ?? request.headers.get("x-request-id"),
  );
}
