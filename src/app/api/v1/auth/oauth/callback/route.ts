import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAppState } from "@/server/data-store";
import {
  buildAuthErrorRedirect,
  decodeOAuthState,
  exchangeOAuthCode,
  fetchOAuthUserInfo,
  getOAuthProviderConfig,
  OAUTH_STATE_COOKIE_NAME,
  resolveOAuthSessionContext,
} from "@/server/oauth";
import {
  createSessionPayload,
  encodeSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/session";

function redirectWithError(requestUrl: string, code: string) {
  const response = NextResponse.redirect(buildAuthErrorRedirect(requestUrl, code));
  response.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return redirectWithError(request.url, "oauth_provider_error");
  }

  try {
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const cookieStore = await cookies();
    const statePayload = decodeOAuthState(cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value);

    if (!code || !returnedState || !statePayload || statePayload.state !== returnedState) {
      return redirectWithError(request.url, "oauth_state_invalid");
    }

    const providerConfig = await getOAuthProviderConfig(request.url);
    const token = await exchangeOAuthCode({ code, config: providerConfig, statePayload });
    const userInfo = await fetchOAuthUserInfo(providerConfig, token.access_token as string);
    const appState = await readAppState();
    const context = resolveOAuthSessionContext({
      state: appState,
      userInfo,
      providerConfig,
      organizationId: statePayload.organizationId,
    });
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(
        createSessionPayload({
          userId: context.userId,
          organizationId: context.organizationId,
        }),
      ),
    });
    response.cookies.set({
      name: OAUTH_STATE_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    return redirectWithError(request.url, "oauth_login_failed");
  }
}
