import { cookies } from "next/headers";
import { readAppState } from "@/server/data-store";
import { ApiError } from "@/server/api-error";
import {
  errorResponse,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { isDevLoginEnabled } from "@/server/feature-flags";
import { assertPublicAuthBotProtection } from "@/server/public-auth-bot-protection";
import { assertPublicAuthRateLimit } from "@/server/public-auth-rate-limit";
import {
  createSessionPayload,
  decodeSession,
  encodeSession,
  getSessionCookieOptions,
  resolveSessionContext,
  SESSION_COOKIE_NAME,
  toClientSession,
} from "@/server/session";
import { resolvePasswordLogin, touchUserLastLogin } from "@/server/user-credentials";
import { optionalString, requiredString } from "@/server/validation";

export async function GET() {
  try {
    const state = await readAppState();
    const cookieStore = await cookies();
    const context = resolveSessionContext(
      state,
      decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value),
      "manager",
    );

    return Response.json({
      session: toClientSession(context),
      state: stateForContext(state, context),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const payload = await readJsonObject(request);
    let userId: string;
    let organizationId: string;

    const email = optionalString(payload, "email");
    const password = optionalString(payload, "password");

    if (email && password) {
      assertPublicAuthRateLimit(request, { action: "login" });
      await assertPublicAuthBotProtection({
        action: "login",
        request,
        token: optionalString(payload, "turnstileToken"),
      });

      const login = await resolvePasswordLogin({
        state: currentState,
        email,
        password,
        organizationId: optionalString(payload, "organizationId"),
      });
      userId = login.userId;
      organizationId = login.organizationId;
    } else if (isDevLoginEnabled()) {
      userId = requiredString(payload, "userId");
      organizationId = requiredString(payload, "organizationId");
    } else {
      assertPublicAuthRateLimit(request, { action: "login" });
      await assertPublicAuthBotProtection({
        action: "login",
        request,
        token: optionalString(payload, "turnstileToken"),
      });

      throw new ApiError(
        400,
        "Email and password are required",
        "validation_error",
        { fields: ["email", "password"] },
      );
    }

    const state = await touchUserLastLogin(userId);
    const sessionPayload = createSessionPayload({ userId, organizationId });
    const context = resolveSessionContext(state, sessionPayload, "manager");
    const cookieStore = await cookies();

    cookieStore.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(sessionPayload),
    });

    return Response.json({
      session: toClientSession(context),
      state: stateForContext(state, context),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set({
    ...getSessionCookieOptions(0),
    name: SESSION_COOKIE_NAME,
    value: "",
  });

  return Response.json({ ok: true });
}
