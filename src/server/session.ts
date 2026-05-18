import crypto from "node:crypto";
import { canAccess } from "@/domain/business-rules";
import { defaultOrganizationId, isDemoOrganizationId } from "@/domain/seed-data";
import type { AppState, Membership, Organization, Role, User } from "@/domain/types";
import { ApiError } from "./api-error";
import { isProductionRuntime } from "./feature-flags";
import type { RequestContext } from "./api-helpers";

export const SESSION_COOKIE_NAME = "dental_recovery_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  userId: string;
  organizationId?: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface ClientSession {
  organizationId: string;
  role: Role;
  isSuperAdmin: boolean;
  user: Pick<User, "id" | "email" | "name" | "avatar">;
}

export interface AccountWorkspace {
  organization: Organization;
  membership: Membership;
}

export interface AccountSession {
  selectedOrganizationId?: string;
  user: Pick<User, "id" | "email" | "name" | "avatar" | "status">;
  workspaces: Array<{
    organizationId: string;
    organizationName: string;
    organizationStatus: Organization["status"];
    role: Role;
    membershipId: string;
    membershipStatus: Membership["status"];
  }>;
}

export interface LoginProfile {
  userId: string;
  organizationId: string;
  role: Role;
  name: string;
  email: string;
  avatar: string;
  organizationName: string;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (isProductionRuntime()) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return "development-only-dental-recovery-session-secret-change-me";
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64");
}

function sign(value: string): string {
  return base64UrlEncode(
    crypto.createHmac("sha256", getSessionSecret()).update(value).digest(),
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function encodeSignedPayload(payload: unknown): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function decodeSignedPayload<T>(token?: string): T | undefined {
  if (!token) {
    return undefined;
  }

  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(sign(body), signature)) {
    return undefined;
  }

  try {
    return JSON.parse(base64UrlDecode(body).toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

export function createSessionPayload(input: {
  userId: string;
  organizationId?: string;
  now?: number;
}): SessionPayload {
  const issuedAt = input.now ?? Date.now();

  return {
    userId: input.userId,
    organizationId: input.organizationId,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS * 1000,
    nonce: crypto.randomBytes(12).toString("hex"),
  };
}

export function encodeSession(payload: SessionPayload): string {
  return encodeSignedPayload(payload);
}

export function decodeSession(token?: string): SessionPayload | undefined {
  const payload = decodeSignedPayload<SessionPayload>(token);
  if (!payload?.userId || Date.now() > payload.expiresAt) {
    return undefined;
  }

  return payload;
}

export function getSessionTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
}

export function resolveSessionContext(
  state: AppState,
  payload: SessionPayload | undefined,
  requiredRole: Role = "manager",
): RequestContext {
  const user = resolveAuthenticatedUser(state, payload);

  if (!payload?.organizationId) {
    throw new ApiError(
      403,
      "Select a clinic workspace before opening the dashboard",
      "workspace_selection_required",
    );
  }

  const organizationExists = state.organizations.some(
    (item) => item.id === payload.organizationId,
  );
  if (!organizationExists) {
    throw new ApiError(404, "Organization was not found", "organization_not_found");
  }

  const superAdminMembership = state.memberships.find(
    (membership) =>
      membership.userId === payload.userId &&
      membership.role === "super_admin" &&
      membership.status === "active",
  );
  const membership = state.memberships.find(
    (item) =>
      item.userId === payload.userId &&
      item.organizationId === payload.organizationId &&
      item.status === "active",
  );
  const effectiveMembership = membership ?? superAdminMembership;

  if (!effectiveMembership) {
    throw new ApiError(403, "User does not belong to this organization", "forbidden");
  }

  const role = superAdminMembership ? "super_admin" : effectiveMembership.role;
  if (!canAccess(requiredRole, role)) {
    throw new ApiError(403, "Role does not allow this operation", "forbidden", {
      requiredRole,
      role,
    });
  }

  return {
    user,
    userId: user.id,
    organizationId: payload.organizationId,
    role,
    membership: effectiveMembership,
    isSuperAdmin: role === "super_admin",
  };
}

export function resolveAuthenticatedUser(
  state: AppState,
  payload: SessionPayload | undefined,
): User {
  if (!payload) {
    throw new ApiError(401, "Authentication session is required", "unauthenticated");
  }

  const user = state.users.find(
    (item) =>
      item.id === payload.userId &&
      (item.status === "active" || item.status === "invited"),
  );
  if (!user) {
    throw new ApiError(401, "Active user was not found", "unauthenticated");
  }

  return user;
}

export function listUserWorkspaces(
  state: AppState,
  userId: string,
): AccountWorkspace[] {
  return state.memberships
    .filter(
      (membership) =>
        membership.userId === userId &&
        (membership.status === "active" || membership.status === "invited"),
    )
    .map((membership) => {
      const organization = state.organizations.find(
        (item) => item.id === membership.organizationId,
      );
      return organization ? { organization, membership } : undefined;
    })
    .filter((item): item is AccountWorkspace => Boolean(item))
    .toSorted((left, right) => {
      const rank: Record<Role, number> = {
        owner: 1,
        admin: 2,
        manager: 3,
        super_admin: 4,
      };

      return (
        rank[left.membership.role] - rank[right.membership.role] ||
        left.organization.name.localeCompare(right.organization.name)
      );
    });
}

export function toAccountSession(
  state: AppState,
  user: User,
  selectedOrganizationId?: string,
): AccountSession {
  return {
    selectedOrganizationId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      status: user.status,
    },
    workspaces: listUserWorkspaces(state, user.id).map(({ membership, organization }) => ({
      organizationId: organization.id,
      organizationName: organization.name,
      organizationStatus: organization.status,
      role: membership.role,
      membershipId: membership.id,
      membershipStatus: membership.status,
    })),
  };
}

export function toClientSession(context: RequestContext): ClientSession {
  return {
    organizationId: context.organizationId,
    role: context.role,
    isSuperAdmin: context.isSuperAdmin,
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name,
      avatar: context.user.avatar,
    },
  };
}

export function buildLoginProfiles(state: AppState): LoginProfile[] {
  const organizations = new Map<string, Organization>(
    state.organizations.map((organization) => [organization.id, organization]),
  );
  const users = new Map<string, User>(state.users.map((user) => [user.id, user]));

  return state.memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => {
      const user = users.get(membership.userId);
      const organization = organizations.get(membership.organizationId);
      if (!user || !organization || user.status !== "active") {
        return undefined;
      }

      return {
        userId: user.id,
        organizationId: organization.id,
        role: membership.role,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        organizationName: organization.name,
      };
    })
    .filter((profile): profile is LoginProfile => Boolean(profile))
    .toSorted((left, right) => {
      const rank: Record<Role, number> = {
        owner: 1,
        admin: 2,
        manager: 3,
        super_admin: 4,
      };
      return rank[left.role] - rank[right.role];
    });
}

export function createDefaultSessionPayload(state: AppState): SessionPayload {
  const owner =
    state.memberships.find(
      (membership) =>
        membership.role === "owner" &&
        membership.status === "active" &&
        !isDemoOrganizationId(membership.organizationId),
    ) ??
    state.memberships.find(
      (membership) =>
        membership.organizationId === defaultOrganizationId &&
        membership.role === "owner",
    ) ??
    state.memberships.find(
      (membership) => membership.role === "owner" && membership.status === "active",
    );

  return createSessionPayload({
    userId: owner?.userId ?? "user-owner",
    organizationId: owner?.organizationId ?? defaultOrganizationId,
  });
}
