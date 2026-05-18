import { cookies } from "next/headers";
import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { acceptTeamInvite } from "@/server/team-invites";
import {
  createSessionPayload,
  encodeSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/session";
import { requiredString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const payload = await readJsonObject(request);
    const result = await acceptTeamInvite({
      name: requiredString(payload, "name"),
      password: requiredString(payload, "password"),
      token: requiredString(payload, "token"),
    });
    const sessionPayload = createSessionPayload({ userId: result.userId });
    const cookieStore = await cookies();

    cookieStore.set({
      ...getSessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: encodeSession(sessionPayload),
    });

    return Response.json({
      redirectTo: "/workspaces",
      userId: result.userId,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
