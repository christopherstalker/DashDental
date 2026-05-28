import { ApiError } from "./api-error";
import { structuredLog } from "./observability";

const signedWebhookPrefixes = [
  "/api/v1/webhooks/",
  "/api/v1/launch/events",
  "/api/v1/health/",
];

function sameOrigin(left: URL, right: URL): boolean {
  return left.protocol === right.protocol && left.host === right.host;
}

function shouldBypassOriginGuard(pathname: string): boolean {
  return signedWebhookPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function readForwardedProtocol(request: Request): string | undefined {
  return request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
}

function requestOriginUrl(request: Request): URL {
  const url = new URL(request.url);
  const forwardedProto = readForwardedProtocol(request);
  if (forwardedProto) {
    url.protocol = `${forwardedProto}:`;
  }

  return url;
}

export function assertSameOriginRequest(request: Request) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return;
  }

  const requestUrl = requestOriginUrl(request);
  if (shouldBypassOriginGuard(requestUrl.pathname)) {
    return;
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    structuredLog("warn", "security.csrf_rejected", {
      path: requestUrl.pathname,
      reason: "sec_fetch_site_cross_site",
    });
    throw new ApiError(403, "Cross-site request was rejected", "csrf_rejected");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const originUrl = safeUrl(origin);
    if (!sameOrigin(originUrl, requestUrl)) {
      structuredLog("warn", "security.csrf_rejected", {
        path: requestUrl.pathname,
        reason: "origin_mismatch",
      });
      throw new ApiError(403, "Request origin is not allowed", "csrf_rejected");
    }
    return;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    const refererUrl = safeUrl(referer);
    if (!sameOrigin(refererUrl, requestUrl)) {
      structuredLog("warn", "security.csrf_rejected", {
        path: requestUrl.pathname,
        reason: "referer_mismatch",
      });
      throw new ApiError(403, "Request referer is not allowed", "csrf_rejected");
    }
  }
}

function safeUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new ApiError(403, "Request origin is not allowed", "csrf_rejected");
  }
}
