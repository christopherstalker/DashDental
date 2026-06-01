import { cookies } from "next/headers";
import { errorResponse } from "@/server/api-helpers";
import { assertSameOriginRequest } from "@/server/request-security";
import {
  decodeSession,
  SESSION_COOKIE_NAME,
  resolveAuthenticatedUser,
} from "@/server/session";
import { readAppState } from "@/server/data-store";
import { requestEmailVerification } from "@/server/account-security";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const state = await readAppState();
    const cookieStore = await cookies();
    const sessionPayload = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    const user = resolveAuthenticatedUser(state, sessionPayload);
    const delivery = await requestEmailVerification({
      requestUrl: request.url,
      userId: user.id,
    });

    return Response.json(delivery);
  } catch (error) {
    return errorResponse(error);
  }
}
