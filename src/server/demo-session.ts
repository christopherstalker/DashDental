import crypto from "node:crypto";
import { encodeSignedPayload, decodeSignedPayload } from "./session";

export const DEMO_SESSION_COOKIE_NAME = "dd_demo_session";
export const DEMO_SESSION_MAX_AGE_SECONDS = 15 * 60;

export interface DemoSessionPayload {
  demoId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export function createDemoSessionPayload(now = Date.now()): DemoSessionPayload {
  return {
    demoId: `demo-${now}-${crypto.randomBytes(6).toString("hex")}`,
    issuedAt: now,
    expiresAt: now + DEMO_SESSION_MAX_AGE_SECONDS * 1000,
    nonce: crypto.randomBytes(12).toString("hex"),
  };
}

export function encodeDemoSession(payload: DemoSessionPayload): string {
  return encodeSignedPayload(payload);
}

export function decodeDemoSession(token?: string): DemoSessionPayload | undefined {
  const payload = decodeSignedPayload<DemoSessionPayload>(token);
  if (!payload?.demoId || !payload.expiresAt || Date.now() >= payload.expiresAt) {
    return undefined;
  }

  return payload;
}

export function isDemoSessionActive(
  payload: DemoSessionPayload | undefined,
  now = Date.now(),
): payload is DemoSessionPayload {
  return Boolean(payload?.demoId && now < payload.expiresAt);
}

export function getDemoSessionCookieOptions(maxAge = DEMO_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}
