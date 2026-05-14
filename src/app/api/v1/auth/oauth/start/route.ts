import { NextResponse } from "next/server";
import {
  buildAuthErrorRedirect,
  buildAuthorizationUrl,
  createOAuthStatePayload,
  encodeOAuthState,
  getOAuthProviderConfig,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/server/oauth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const config = await getOAuthProviderConfig(request.url);
    const statePayload = createOAuthStatePayload({
      redirectUri: config.redirectUri,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
    });
    const response = NextResponse.redirect(buildAuthorizationUrl(config, statePayload));

    response.cookies.set({
      name: OAUTH_STATE_COOKIE_NAME,
      value: encodeOAuthState(statePayload),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.redirect(buildAuthErrorRedirect(request.url, "oauth_not_configured"));
  }
}
