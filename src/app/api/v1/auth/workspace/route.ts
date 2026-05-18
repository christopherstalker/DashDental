import { cookies } from "next/headers";
import { readAppState } from "@/server/data-store";
import {
  errorResponse,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
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
import { requiredString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const state = await readAppState();
    const cookieStore = await cookies();
    const currentPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    const user = resolveAuthenticatedUser(state, currentPayload);
    const payload = await readJsonObject(request);
    const organizationId = requiredString(payload, "organizationId");
    const nextPayload = createSessionPayload({
      userId: user.id,
      organizationId,
    });
    const context = resolveSessionContext(state, nextPayload, "manager");

    cookieStore.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(nextPayload),
    });

    return Response.json({
      account: toAccountSession(state, user, context.organizationId),
      session: toClientSession(context),
      state: stateForContext(state, context),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
