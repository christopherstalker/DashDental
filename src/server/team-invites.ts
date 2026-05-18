import crypto from "node:crypto";
import type { AppState, Role, TeamInviteToken } from "@/domain/types";
import { ApiError } from "./api-error";
import { mutateAppState } from "./data-store";
import { sendEmailWithResend, type EmailDeliveryResult } from "./email-delivery";
import { addAudit } from "./state-mutations";
import { hashPassword, setPasswordHash } from "./user-credentials";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TeamInvitePreview {
  email?: string;
  error?: string;
  expiresAt?: string;
  organizationName?: string;
  role?: Role;
  status: "accepted" | "expired" | "invalid" | "missing" | "valid";
}

export interface CreatedTeamInvite {
  invite: TeamInviteToken;
  inviteUrl: string;
  token: string;
}

export interface TeamInviteEmailDelivery {
  devInviteUrl?: string;
  error?: string;
  status: "failed" | "sent" | "skipped";
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeAvatar(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
      .join("") || "DR"
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getAppBaseUrl(requestUrl: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createTeamInviteInState(
  state: AppState,
  input: {
    actorUserId?: string;
    email: string;
    membershipId: string;
    organizationId: string;
    requestUrl: string;
    role: Role;
    nowIso?: string;
  },
): { invite: CreatedTeamInvite; state: AppState } {
  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const token = generateInviteToken();
  const normalizedEmail = normalizeEmail(input.email);
  const invite: TeamInviteToken = {
    id: createRuntimeId("invite"),
    membershipId: input.membershipId,
    email: normalizedEmail,
    organizationId: input.organizationId,
    role: input.role,
    tokenHash: hashInviteToken(token),
    invitedByUserId: input.actorUserId,
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
    emailDeliveryStatus: "pending",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const inviteUrl = `${getAppBaseUrl(input.requestUrl)}/invite/accept?token=${encodeURIComponent(token)}`;
  let nextState: AppState = {
    ...state,
    inviteTokens: [
      ...(state.inviteTokens ?? []).filter(
        (item) => item.membershipId !== input.membershipId || Boolean(item.acceptedAt),
      ),
      invite,
    ],
  };

  nextState = addAudit(nextState, {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "team.invitation_created",
    entityType: "membership",
    entityId: input.membershipId,
    metadataJson: {
      email: normalizedEmail,
      expiresAt: invite.expiresAt,
      role: input.role,
    },
  });

  return {
    invite: {
      invite,
      inviteUrl,
      token,
    },
    state: nextState,
  };
}

export function getTeamInvitePreview(
  state: AppState,
  token?: string,
  nowIso = new Date().toISOString(),
): TeamInvitePreview {
  if (!token?.trim()) {
    return { error: "Invite token is missing.", status: "missing" };
  }

  const invite = (state.inviteTokens ?? []).find(
    (item) => item.tokenHash === hashInviteToken(token),
  );
  if (!invite) {
    return { error: "This invitation link is invalid.", status: "invalid" };
  }

  const organization = state.organizations.find((item) => item.id === invite.organizationId);
  const basePreview = {
    email: invite.email,
    expiresAt: invite.expiresAt,
    organizationName: organization?.name,
    role: invite.role,
  };

  if (invite.acceptedAt) {
    return {
      ...basePreview,
      error: "This invitation has already been accepted.",
      status: "accepted",
    };
  }

  if (Date.parse(invite.expiresAt) <= Date.parse(nowIso)) {
    return {
      ...basePreview,
      error: "This invitation has expired. Ask your clinic admin to send a new invite.",
      status: "expired",
    };
  }

  return {
    ...basePreview,
    status: "valid",
  };
}

export async function sendTeamInviteEmail(input: {
  clinicName: string;
  email: string;
  inviteUrl: string;
  role: Role;
}): Promise<EmailDeliveryResult> {
  const clinicName = escapeHtml(input.clinicName);
  const inviteUrl = escapeHtml(input.inviteUrl);
  const role = escapeHtml(input.role.replaceAll("_", " "));

  return sendEmailWithResend({
    to: input.email,
    subject: `You were invited to ${input.clinicName} on Dash Dental`,
    text: [
      `You were invited to ${input.clinicName} on Dash Dental as ${input.role}.`,
      "Use this secure one-time link to accept the invite and set your password:",
      input.inviteUrl,
      "This link expires in 7 days. If you did not expect this invite, ignore this email.",
    ].join("\n\n"),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.55;">
        <p style="font-size: 13px; color: #2563eb; font-weight: 700;">Dash Dental invite</p>
        <h1 style="font-size: 24px; margin: 0 0 12px;">Join ${clinicName}</h1>
        <p>You were invited as <strong>${role}</strong> to a clinic workspace.</p>
        <p>
          <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 16px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Accept invite
          </a>
        </p>
        <p style="font-size: 13px; color: #475569;">This secure link expires in 7 days. Clinic staff remains responsible for all patient communication.</p>
      </div>
    `,
  });
}

export async function markInviteEmailDelivery(input: {
  error?: string;
  inviteId: string;
  status: TeamInviteToken["emailDeliveryStatus"];
}): Promise<AppState> {
  const nowIso = new Date().toISOString();

  return mutateAppState((state) => ({
    ...state,
    inviteTokens: (state.inviteTokens ?? []).map((invite) =>
      invite.id === input.inviteId
        ? {
            ...invite,
            emailDeliveryStatus: input.status,
            emailError: input.error,
            emailSentAt: input.status === "sent" ? nowIso : invite.emailSentAt,
            updatedAt: nowIso,
          }
        : invite,
    ),
  }));
}

export function acceptTeamInviteInState(
  state: AppState,
  input: {
    name: string;
    nowIso?: string;
    token: string;
  },
): { organizationId: string; state: AppState; userId: string } {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new ApiError(400, "Name is required.", "validation_error", { field: "name" });
  }

  const invite = (state.inviteTokens ?? []).find(
    (item) => item.tokenHash === hashInviteToken(input.token),
  );
  if (!invite) {
    throw new ApiError(404, "Invitation link is invalid.", "invite_invalid");
  }

  if (invite.acceptedAt) {
    throw new ApiError(409, "Invitation has already been accepted.", "invite_used");
  }

  if (Date.parse(invite.expiresAt) <= Date.parse(nowIso)) {
    throw new ApiError(410, "Invitation has expired.", "invite_expired");
  }

  const membership = state.memberships.find((item) => item.id === invite.membershipId);
  if (!membership || membership.organizationId !== invite.organizationId) {
    throw new ApiError(404, "Invitation membership no longer exists.", "invite_invalid");
  }

  const user = state.users.find((item) => item.id === membership.userId);
  if (!user || normalizeEmail(user.email) !== invite.email) {
    throw new ApiError(404, "Invitation user no longer exists.", "invite_invalid");
  }

  let nextState: AppState = {
    ...state,
    users: state.users.map((item) =>
      item.id === user.id
        ? {
            ...item,
            avatar: sanitizeAvatar(name),
            lastLoginAt: nowIso,
            name,
            status: "active",
          }
        : item,
    ),
    memberships: state.memberships.map((item) =>
      item.id === membership.id
        ? {
            ...item,
            status: "active",
          }
        : item,
    ),
    inviteTokens: (state.inviteTokens ?? []).map((item) =>
      item.id === invite.id
        ? {
            ...item,
            acceptedAt: nowIso,
            updatedAt: nowIso,
          }
        : item,
    ),
  };

  nextState = addAudit(nextState, {
    organizationId: invite.organizationId,
    actorUserId: user.id,
    action: "team.invitation_accepted",
    entityType: "membership",
    entityId: membership.id,
    metadataJson: {
      email: invite.email,
      role: invite.role,
    },
  });

  return {
    organizationId: invite.organizationId,
    state: nextState,
    userId: user.id,
  };
}

export async function acceptTeamInvite(input: {
  name: string;
  password: string;
  token: string;
}): Promise<{ organizationId: string; state: AppState; userId: string }> {
  const passwordHash = await hashPassword(input.password);
  let accepted: { organizationId: string; state: AppState; userId: string } | undefined;
  const state = await mutateAppState((current) => {
    accepted = acceptTeamInviteInState(current, input);
    return accepted.state;
  });

  if (!accepted) {
    throw new ApiError(500, "Invitation could not be accepted.", "invite_accept_failed");
  }

  await setPasswordHash(accepted.userId, passwordHash);

  return {
    organizationId: accepted.organizationId,
    state,
    userId: accepted.userId,
  };
}
