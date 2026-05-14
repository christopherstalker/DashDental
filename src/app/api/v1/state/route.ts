import { readAppState, resetAppState } from "@/server/data-store";
import { ApiError } from "@/server/api-error";
import { isDemoActionsEnabled } from "@/server/feature-flags";
import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "manager");
    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "super_admin");
    const payload = await readJsonObject(request);

    if (payload.action === "reset") {
      if (!isDemoActionsEnabled()) {
        throw new ApiError(403, "State reset is disabled", "demo_actions_disabled");
      }

      return Response.json(stateForContext(await resetAppState(), context));
    }

    return Response.json({ error: "Unsupported state action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
