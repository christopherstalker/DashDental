import { cookies } from "next/headers";
import {
  createDemoSessionPayload,
  DEMO_SESSION_COOKIE_NAME,
  encodeDemoSession,
  getDemoSessionCookieOptions,
} from "@/server/demo-session";
import { errorResponse } from "@/server/api-helpers";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { addAudit } from "@/server/state-mutations";
import { mutateAppState } from "@/server/data-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertPublicRouteRateLimit(request, { route: "demo_session" });

    const payload = createDemoSessionPayload();
    const cookieStore = await cookies();
    cookieStore.set(
      DEMO_SESSION_COOKIE_NAME,
      encodeDemoSession(payload),
      getDemoSessionCookieOptions(),
    );

    await mutateAppState((state) =>
      addAudit(state, {
        action: "demo.session_started",
        entityType: "demo_session",
        entityId: payload.demoId,
        metadataJson: {
          expiresAt: new Date(payload.expiresAt).toISOString(),
          source: "demo_session_api",
        },
      }),
    ).catch(() => undefined);

    return Response.json({
      url: "/demo/live",
      expiresAt: new Date(payload.expiresAt).toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE_NAME, "", getDemoSessionCookieOptions(0));
  return Response.json({ ok: true });
}
