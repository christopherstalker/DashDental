import { readAppState, mutateAppState } from "@/server/data-store";
import { changeSubscriptionPlan } from "@/server/state-mutations";
import { ApiError } from "@/server/api-error";
import { isDevBillingEnabled, isProductionRuntime } from "@/server/feature-flags";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalString, requiredSubscriptionPlan } from "@/server/validation";

export async function POST(request: Request) {
  try {
    if (!isDevBillingEnabled() && isProductionRuntime()) {
      throw new ApiError(
        403,
        "Direct plan changes are disabled. Use Checkout, Customer Portal, or operator-confirmed manual billing.",
        "billing_direct_change_disabled",
      );
    }

    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "owner");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );

    const state = await mutateAppState((current) =>
      changeSubscriptionPlan(current, {
        organizationId,
        plan: requiredSubscriptionPlan(payload),
        actorUserId: context.userId,
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
