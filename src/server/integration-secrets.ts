import crypto from "node:crypto";
import { isProductionRuntime } from "./feature-flags";

const ENCRYPTED_SECRET_PREFIX = "enc:v1";

function getEncryptionSecret(): string {
  const integrationSecret = process.env.INTEGRATION_SECRET?.trim();
  if (integrationSecret) {
    return integrationSecret;
  }

  if (isProductionRuntime()) {
    throw new Error("INTEGRATION_SECRET is required in production.");
  }

  return (
    process.env.SESSION_SECRET?.trim() ??
    "development-only-dental-recovery-integration-secret-change-me"
  );
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function createEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(getEncryptionSecret()).digest();
}

export function encryptIntegrationSecret(payload: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", createEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_SECRET_PREFIX,
    base64UrlEncode(iv),
    base64UrlEncode(tag),
    base64UrlEncode(ciphertext),
  ].join(".");
}

export function decryptIntegrationSecret<T>(value?: string): T | undefined {
  if (!value) {
    return undefined;
  }

  const [prefix, iv, tag, ciphertext] = value.split(".");
  if (
    prefix !== ENCRYPTED_SECRET_PREFIX ||
    !iv ||
    !tag ||
    !ciphertext
  ) {
    return undefined;
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      createEncryptionKey(),
      base64UrlDecode(iv),
    );
    decipher.setAuthTag(base64UrlDecode(tag));
    const plaintext = Buffer.concat([
      decipher.update(base64UrlDecode(ciphertext)),
      decipher.final(),
    ]).toString("utf8");

    return JSON.parse(plaintext) as T;
  } catch {
    return undefined;
  }
}
