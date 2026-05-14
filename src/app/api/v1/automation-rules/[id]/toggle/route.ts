import { readAppState, mutateAppState } from "@/server/data-store";
import { toggleAutomationRule } from "@/server/state-mutations";
import {
  ApiError,
  errorResponse,
  getRequestContext,
  stateForContext,
} from "@/server/api-helpers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "admin");
    const rule = currentState.automationRules.find((item) => item.id === id);

    if (!rule) {
      throw new ApiError(404, "Automation rule was not found", "automation_not_found");
    }

    if (!requestContext.isSuperAdmin && rule.organizationId !== requestContext.organizationId) {
      throw new ApiError(403, "Automation rule belongs to another organization", "forbidden");
    }

    const state = await mutateAppState((current) =>
      toggleAutomationRule(current, {
        ruleId: id,
        actorUserId: requestContext.userId,
      }),
    );

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}
