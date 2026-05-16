import { readAppState, mutateAppState } from "@/server/data-store";
import {
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { activateManualSubscription } from "@/server/state-mutations";
import {
  optionalNumber,
  optionalSubscriptionStatus,
  optionalString,
  requiredString,
  requiredSubscriptionPlan,
} from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "super_admin");
    const payload = await readJsonObject(request);
    const periodDays = optionalNumber(payload, "periodDays");
    const organizationId = requiredString(payload, "organizationId");

    if (!currentState.organizations.some((item) => item.id === organizationId)) {
      return Response.json(
        { error: "Organization was not found.", code: "organization_not_found" },
        { status: 404 },
      );
    }

    const state = await mutateAppState((current) =>
      activateManualSubscription(current, {
        organizationId,
        plan: requiredSubscriptionPlan(payload),
        status: optionalSubscriptionStatus(payload),
        actorUserId: context.userId,
        externalReference: optionalString(payload, "externalReference"),
        periodDays: periodDays && periodDays > 0 ? periodDays : undefined,
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
