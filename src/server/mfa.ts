import crypto from "node:crypto";
import type { Role } from "@/domain/types";
import { ApiError } from "./api-error";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./integration-secrets";
import { isProductionRuntime } from "./feature-flags";
import type { RequestContext } from "./api-helpers";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpStepSeconds = 30;
const totpDigits = 6;

export interface EncryptedTotpSecretPayload {
  secret: string;
  createdAt: string;
}

function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  return bits
    .match(/.{1,5}/g)
    ?.map((chunk) => base32Alphabet[Number.parseInt(chunk.padEnd(5, "0"), 2)])
    .join("") ?? "";
}

function base32Decode(value: string): Buffer {
  const clean = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = base32Alphabet.indexOf(char);
    if (index < 0) {
      throw new ApiError(400, "Invalid MFA secret", "mfa_secret_invalid");
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [];
  return Buffer.from(bytes);
}

function totpCode(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(message).digest();
  const offset = hmac.at(-1)! & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** totpDigits).padStart(totpDigits, "0");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function encryptTotpSecret(secret: string): string {
  return encryptIntegrationSecret({
    secret,
    createdAt: new Date().toISOString(),
  } satisfies EncryptedTotpSecretPayload);
}

export function decryptTotpSecret(value?: string): string | undefined {
  return decryptIntegrationSecret<EncryptedTotpSecretPayload>(value)?.secret;
}

export function verifyTotpCode(input: {
  code: string;
  secret: string;
  nowMs?: number;
  window?: number;
}): boolean {
  const cleanCode = input.code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const counter = Math.floor((input.nowMs ?? Date.now()) / 1000 / totpStepSeconds);
  const windowSize = input.window ?? 1;
  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    if (safeEqual(totpCode(input.secret, counter + offset), cleanCode)) {
      return true;
    }
  }

  return false;
}

export function buildTotpUri(input: {
  issuer?: string;
  accountName: string;
  secret: string;
}) {
  const issuer = input.issuer ?? "Dash Dental";
  const label = encodeURIComponent(`${issuer}:${input.accountName}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(totpDigits),
    period: String(totpStepSeconds),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

export function createRecoveryCodes(count = 8) {
  const rawCodes = Array.from({ length: count }, () =>
    `${crypto.randomBytes(4).toString("hex")}-${crypto.randomBytes(4).toString("hex")}`,
  );

  return {
    rawCodes,
    hashes: rawCodes.map(hashRecoveryCode),
  };
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

export function isPrivilegedRole(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "super_admin";
}

export function assertPrivilegedMfaSatisfied(context: RequestContext, requiredRole: Role) {
  if (!isProductionRuntime()) {
    return;
  }

  if (!isPrivilegedRole(context.role)) {
    return;
  }

  if (requiredRole !== "admin" && requiredRole !== "owner" && requiredRole !== "super_admin") {
    return;
  }

  const verifiedAt = context.mfaVerifiedAt ?? 0;
  const maxAgeMs = 12 * 60 * 60 * 1000;
  if (!verifiedAt || Date.now() - verifiedAt > maxAgeMs) {
    throw new ApiError(403, "MFA verification is required for this privileged action", "mfa_required");
  }
}
