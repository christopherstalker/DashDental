import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { optionalString, requiredSubscriptionPlan } from "@/server/validation";
import { createStripeCheckoutSession } from "@/server/stripe";

export async function POST(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "owner");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const organization = state.organizations.find((item) => item.id === organizationId);
    const subscription = state.subscriptions.find(
      (item) => item.organizationId === organizationId,
    );

    const session = await createStripeCheckoutSession({
      requestUrl: request.url,
      organizationId,
      organizationName: organization?.name ?? organizationId,
      userEmail: context.user.email,
      plan: requiredSubscriptionPlan(payload),
      customerId: subscription?.externalCustomerId,
    });

    return Response.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
