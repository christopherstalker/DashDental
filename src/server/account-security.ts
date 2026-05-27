import crypto from "node:crypto";
import type { AppState, User } from "@/domain/types";
import { ApiError } from "./api-error";
import { mutateAppState, readAppState } from "./data-store";
import { sendEmailWithResend, type EmailDeliveryResult } from "./email-delivery";
import { isProductionRuntime } from "./feature-flags";
import { addAudit } from "./state-mutations";
import {
  hashPassword,
  readUserCredentialRecord,
  setPasswordHash,
  writeUserCredentialRecord,
} from "./user-credentials";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export interface AccountEmailDelivery {
  devUrl?: string;
  error?: string;
  status: EmailDeliveryResult["status"];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function generateAccountToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashAccountToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl(requestUrl: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

function buildEmailVerificationUrl(requestUrl: string, token: string): string {
  const url = new URL("/verify-email", getAppBaseUrl(requestUrl));
  url.searchParams.set("token", token);
  return url.toString();
}

function buildPasswordResetUrl(requestUrl: string, token: string): string {
  const url = new URL("/reset-password", getAppBaseUrl(requestUrl));
  url.searchParams.set("token", token);
  return url.toString();
}

async function deliverEmail(input: {
  devUrl: string;
  html: string;
  subject: string;
  text: string;
  to: string;
}): Promise<AccountEmailDelivery> {
  const result = await sendEmailWithResend(input);
  return {
    devUrl: !isProductionRuntime() ? input.devUrl : undefined,
    error: result.error,
    status: result.status,
  };
}

function findUserByEmail(state: AppState, email: string): User | undefined {
  const normalizedEmail = normalizeEmail(email);
  return state.users.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail &&
      (user.status === "active" || user.status === "invited"),
  );
}

export async function requestEmailVerification(input: {
  requestUrl: string;
  userId: string;
}): Promise<AccountEmailDelivery & { alreadyVerified: boolean }> {
  const state = await readAppState();
  const user = state.users.find((item) => item.id === input.userId);
  if (!user || user.status === "disabled") {
    throw new ApiError(404, "Account was not found", "account_not_found");
  }
  if (user.emailVerifiedAt) {
    return {
      alreadyVerified: true,
      status: "skipped",
    };
  }

  const now = new Date();
  const token = generateAccountToken();
  const verificationUrl = buildEmailVerificationUrl(input.requestUrl, token);

  await writeUserCredentialRecord(user.id, {
    emailVerificationExpiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
    emailVerificationSentAt: now.toISOString(),
    emailVerificationTokenHash: hashAccountToken(token),
  });

  const safeName = escapeHtml(user.name);
  const safeUrl = escapeHtml(verificationUrl);
  const delivery = await deliverEmail({
    devUrl: verificationUrl,
    to: user.email,
    subject: "Verify your Dash Dental email",
    text: [
      `Hi ${user.name},`,
      "Verify this email address to secure your Dash Dental account:",
      verificationUrl,
      "This link expires in 24 hours. If you did not create this account, ignore this email.",
    ].join("\n\n"),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #052e16; line-height: 1.55;">
        <p style="font-size: 13px; color: #16a34a; font-weight: 700;">Dash Dental security</p>
        <h1 style="font-size: 24px; margin: 0 0 12px;">Verify your work email</h1>
        <p>Hi ${safeName}, confirm this email address before release-critical account actions.</p>
        <p>
          <a href="${safeUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 16px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Verify email
          </a>
        </p>
        <p style="font-size: 13px; color: #166534;">This secure link expires in 24 hours.</p>
      </div>
    `,
  });

  return {
    ...delivery,
    alreadyVerified: false,
  };
}

export async function verifyEmailToken(input: {
  nowIso?: string;
  token: string;
}): Promise<{ email: string; state: AppState; userId: string }> {
  const tokenHash = hashAccountToken(input.token.trim());
  const nowIso = input.nowIso ?? new Date().toISOString();
  const state = await readAppState();

  for (const user of state.users) {
    const credential = await readUserCredentialRecord(user.id);
    if (credential?.emailVerificationTokenHash !== tokenHash) {
      continue;
    }

    if (
      !credential.emailVerificationExpiresAt ||
      Date.parse(credential.emailVerificationExpiresAt) <= Date.parse(nowIso)
    ) {
      throw new ApiError(410, "Email verification link has expired", "email_verification_expired");
    }

    const nextState = await mutateAppState((current) => {
      const target = current.users.find((item) => item.id === user.id);
      if (!target) {
        throw new ApiError(404, "Account was not found", "account_not_found");
      }

      let updated: AppState = {
        ...current,
        users: current.users.map((item) =>
          item.id === user.id
            ? {
                ...item,
                emailVerifiedAt: item.emailVerifiedAt ?? nowIso,
              }
            : item,
        ),
      };

      updated = addAudit(updated, {
        actorUserId: user.id,
        action: "auth.email_verified",
        entityId: user.id,
        entityType: "user",
        metadataJson: {
          email: target.email,
        },
      });

      return updated;
    });

    await writeUserCredentialRecord(user.id, {
      emailVerificationExpiresAt: null,
      emailVerificationTokenHash: null,
    });

    return {
      email: user.email,
      state: nextState,
      userId: user.id,
    };
  }

  throw new ApiError(404, "Email verification link is invalid", "email_verification_invalid");
}

export async function requestPasswordReset(input: {
  email: string;
  requestUrl: string;
}): Promise<AccountEmailDelivery & { matchedAccount: boolean }> {
  const state = await readAppState();
  const user = findUserByEmail(state, input.email);
  if (!user) {
    return {
      matchedAccount: false,
      status: "skipped",
    };
  }

  const now = new Date();
  const token = generateAccountToken();
  const resetUrl = buildPasswordResetUrl(input.requestUrl, token);

  await writeUserCredentialRecord(user.id, {
    passwordResetExpiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS).toISOString(),
    passwordResetRequestedAt: now.toISOString(),
    passwordResetTokenHash: hashAccountToken(token),
  });

  const safeName = escapeHtml(user.name);
  const safeUrl = escapeHtml(resetUrl);
  const delivery = await deliverEmail({
    devUrl: resetUrl,
    to: user.email,
    subject: "Reset your Dash Dental password",
    text: [
      `Hi ${user.name},`,
      "Use this secure link to reset your Dash Dental password:",
      resetUrl,
      "This link expires in 1 hour. If you did not request a reset, ignore this email.",
    ].join("\n\n"),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #052e16; line-height: 1.55;">
        <p style="font-size: 13px; color: #16a34a; font-weight: 700;">Dash Dental security</p>
        <h1 style="font-size: 24px; margin: 0 0 12px;">Reset your password</h1>
        <p>Hi ${safeName}, this link lets you set a new password for your account.</p>
        <p>
          <a href="${safeUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 16px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; color: #166534;">This secure link expires in 1 hour.</p>
      </div>
    `,
  });

  return {
    ...delivery,
    matchedAccount: true,
  };
}

export async function resetPasswordWithToken(input: {
  nowIso?: string;
  password: string;
  token: string;
}): Promise<{ email: string; state: AppState; userId: string }> {
  const tokenHash = hashAccountToken(input.token.trim());
  const nowIso = input.nowIso ?? new Date().toISOString();
  const state = await readAppState();

  for (const user of state.users) {
    const credential = await readUserCredentialRecord(user.id);
    if (credential?.passwordResetTokenHash !== tokenHash) {
      continue;
    }

    if (
      !credential.passwordResetExpiresAt ||
      Date.parse(credential.passwordResetExpiresAt) <= Date.parse(nowIso)
    ) {
      throw new ApiError(410, "Password reset link has expired", "password_reset_expired");
    }

    const passwordHash = await hashPassword(input.password);
    await setPasswordHash(user.id, passwordHash);
    await writeUserCredentialRecord(user.id, {
      passwordResetExpiresAt: null,
      passwordResetRequestedAt: null,
      passwordResetTokenHash: null,
    });

    const nextState = await mutateAppState((current) => {
      const target = current.users.find((item) => item.id === user.id);
      if (!target) {
        throw new ApiError(404, "Account was not found", "account_not_found");
      }

      let updated: AppState = {
        ...current,
        users: current.users.map((item) =>
          item.id === user.id
            ? {
                ...item,
                sessionVersion: (item.sessionVersion ?? 0) + 1,
              }
            : item,
        ),
      };

      updated = addAudit(updated, {
        actorUserId: user.id,
        action: "auth.password_reset",
        entityId: user.id,
        entityType: "user",
        metadataJson: {
          email: target.email,
        },
      });

      return updated;
    });

    return {
      email: user.email,
      state: nextState,
      userId: user.id,
    };
  }

  throw new ApiError(404, "Password reset link is invalid", "password_reset_invalid");
}
