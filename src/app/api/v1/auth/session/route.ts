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
  resolveAuthenticatedUser,
  resolveSessionContext,
  SESSION_COOKIE_NAME,
  toAccountSession,
  toClientSession,
} from "@/server/session";
import {
  activateInvitedUserOnLogin,
  resolvePasswordLogin,
  touchUserLastLogin,
} from "@/server/user-credentials";
import { optionalString, requiredString } from "@/server/validation";

export async function GET() {
  try {
    const state = await readAppState();
    const cookieStore = await cookies();
    const sessionPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    const user = resolveAuthenticatedUser(state, sessionPayload);

    if (!sessionPayload?.organizationId) {
      return Response.json({
        account: toAccountSession(state, user),
        session: {
          organizationId: null,
          role: null,
          isSuperAdmin: false,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
        },
        state: null,
      });
    }

    const context = resolveSessionContext(state, sessionPayload, "manager");

    return Response.json({
      account: toAccountSession(state, user, context.organizationId),
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
    let organizationId: string | undefined;

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
      organizationId = optionalString(payload, "organizationId");
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

    await activateInvitedUserOnLogin(userId);
    const state = await touchUserLastLogin(userId);
    const sessionPayload = createSessionPayload({ userId, organizationId });
    const cookieStore = await cookies();

    cookieStore.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(sessionPayload),
    });

    if (!organizationId) {
      const user = resolveAuthenticatedUser(state, sessionPayload);
      return Response.json({
        account: toAccountSession(state, user),
        session: {
          organizationId: null,
          role: null,
          isSuperAdmin: false,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
        },
        state: null,
      });
    }

    const context = resolveSessionContext(state, sessionPayload, "manager");
    return Response.json({
      account: toAccountSession(state, context.user, context.organizationId),
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
