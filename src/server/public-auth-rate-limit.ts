import { ApiError } from "./api-error";

type PublicAuthAction = "login" | "register";

const windowMs = 60_000;
const limits: Record<PublicAuthAction, { limit: number; message: string }> = {
  login: {
    limit: 60,
    message: "Too many login attempts. Wait a minute and try again.",
  },
  register: {
    limit: 8,
    message: "Too many registration attempts. Wait a minute and try again.",
  },
};

const buckets = new Map<string, { count: number; windowStartMs: number }>();

function readClientIp(request: Request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function getPublicAuthClientKey(
  request: Request,
  action: PublicAuthAction,
) {
  return `${action}:${readClientIp(request)}`;
}

export function assertPublicAuthRateLimit(
  request: Request,
  input: {
    action: PublicAuthAction;
    nowMs?: number;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const key = getPublicAuthClientKey(request, input.action);
  const config = limits[input.action];
  const bucket = buckets.get(key);

  if (!bucket || nowMs - bucket.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: nowMs });
    return;
  }

  if (bucket.count >= config.limit) {
    throw new ApiError(429, config.message, "rate_limited", {
      action: input.action,
      retryAfterSeconds: Math.ceil((bucket.windowStartMs + windowMs - nowMs) / 1000),
    });
  }

  bucket.count += 1;
}

export function resetPublicAuthRateLimitsForTests() {
  buckets.clear();
}
