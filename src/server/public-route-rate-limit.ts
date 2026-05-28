import { ApiError } from "./api-error";

type PublicRouteLimit =
  | "health_storage"
  | "launch_events"
  | "demo_session"
  | "support_request"
  | "billing_action"
  | "api_key";

const windowMs = 60_000;
const limits: Record<PublicRouteLimit, { limit: number; message: string }> = {
  health_storage: {
    limit: 30,
    message: "Too many health check requests. Wait a minute and try again.",
  },
  launch_events: {
    limit: 120,
    message: "Too many launch event requests. Wait a minute and try again.",
  },
  demo_session: {
    limit: 12,
    message: "Too many demo launches. Wait a minute and try again.",
  },
  support_request: {
    limit: 6,
    message: "Too many support requests. Wait a minute and try again.",
  },
  billing_action: {
    limit: 12,
    message: "Too many billing actions. Wait a minute and try again.",
  },
  api_key: {
    limit: 8,
    message: "Too many API key requests. Wait a minute and try again.",
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

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getPublicRouteRateLimitKey(
  request: Request,
  route: PublicRouteLimit,
) {
  return `${route}:${readClientIp(request)}`;
}

export function assertPublicRouteRateLimit(
  request: Request,
  input: {
    nowMs?: number;
    route: PublicRouteLimit;
  },
) {
  const nowMs = input.nowMs ?? Date.now();
  const key = getPublicRouteRateLimitKey(request, input.route);
  const config = limits[input.route];
  const bucket = buckets.get(key);

  if (!bucket || nowMs - bucket.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: nowMs });
    return;
  }

  if (bucket.count >= config.limit) {
    throw new ApiError(429, config.message, "rate_limited", {
      retryAfterSeconds: Math.ceil((bucket.windowStartMs + windowMs - nowMs) / 1000),
      route: input.route,
    });
  }

  bucket.count += 1;
}

export function resetPublicRouteRateLimitsForTests() {
  buckets.clear();
}
