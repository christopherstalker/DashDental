import { cookies } from "next/headers";
import { errorResponse, stateForContext } from "@/server/api-helpers";
import { readJsonObject } from "@/server/api-helpers";
import { assertPublicAuthBotProtection } from "@/server/public-auth-bot-protection";
import { assertPublicAuthRateLimit } from "@/server/public-auth-rate-limit";
import { registerClinicWorkspace } from "@/server/user-credentials";
import {
  createSessionPayload,
  encodeSession,
  getSessionCookieOptions,
  resolveSessionContext,
  SESSION_COOKIE_NAME,
  toClientSession,
} from "@/server/session";
import { optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    assertPublicAuthRateLimit(request, { action: "register" });

    const payload = await readJsonObject(request);
    await assertPublicAuthBotProtection({
      action: "register",
      request,
      token: optionalString(payload, "turnstileToken"),
    });

    const currencyValue = optionalString(payload, "currency");
    const { state, userId, organizationId } = await registerClinicWorkspace({
      clinicName: optionalString(payload, "clinicName") ?? "",
      ownerName: optionalString(payload, "ownerName") ?? "",
      email: optionalString(payload, "email") ?? "",
      password: optionalString(payload, "password") ?? "",
      timezone: optionalString(payload, "timezone") ?? "UTC",
      currency: currencyValue === "EUR" || currencyValue === "UAH" ? currencyValue : "USD",
    });
    const userForSession = state.users.find((user) => user.id === userId);
    const sessionPayload = createSessionPayload({
      userId,
      organizationId,
      sessionVersion: userForSession?.sessionVersion ?? 0,
    });
    const context = resolveSessionContext(state, sessionPayload, "manager");
    const cookieStore = await cookies();

    cookieStore.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(sessionPayload),
    });

    return Response.json(
      {
        session: toClientSession(context),
        state: stateForContext(state, context),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
