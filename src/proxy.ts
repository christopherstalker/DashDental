import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "dashdental.space";

function shouldRedirectVercelHostToCanonical() {
  return (
    process.env.ENABLE_CANONICAL_HOST_REDIRECT === "true" &&
    process.env.VERCEL_ENV === "production"
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (shouldRedirectVercelHostToCanonical() && host?.endsWith(".vercel.app")) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";

    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
