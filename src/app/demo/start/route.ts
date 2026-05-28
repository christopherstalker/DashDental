import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createDemoSessionPayload,
  encodeDemoSession,
  getDemoSessionCookieOptions,
  DEMO_SESSION_COOKIE_NAME,
} from "@/server/demo-session";
import { ApiError } from "@/server/api-error";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { addAudit } from "@/server/state-mutations";
import { mutateAppState } from "@/server/data-store";
import { errorResponse } from "@/server/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
          source: "demo_start_route",
        },
      }),
    ).catch(() => undefined);

    return NextResponse.redirect(new URL("/demo/live", request.url), 303);
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    return errorResponse(error);
  }
}
