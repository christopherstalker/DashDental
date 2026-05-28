import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "dashdental.space";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function shouldRedirectVercelHostToCanonical() {
  return (
    process.env.ENABLE_CANONICAL_HOST_REDIRECT === "true" &&
    process.env.VERCEL_ENV === "production"
  );
}

function buildContentSecurityPolicy() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://challenges.cloudflare.com",
    isDevelopment ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    isDevelopment ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (
    host &&
    !localHosts.has(host) &&
    (forwardedProto === "http" || request.nextUrl.protocol === "http:")
  ) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (shouldRedirectVercelHostToCanonical() && host?.endsWith(".vercel.app")) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";

    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return response;
}

export const config = {
  matcher: [
    {
      missing: [
        { key: "next-router-prefetch", type: "header" },
        { key: "purpose", type: "header", value: "prefetch" },
      ],
      source: "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    },
  ],
};

// git-for-windows tree-object temp path workaround
