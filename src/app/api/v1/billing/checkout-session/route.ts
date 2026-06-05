import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { optionalString, requiredSubscriptionPlan } from "@/server/validation";
import { getOnlineBillingProvider } from "@/server/manual-billing";
import { createPaddleCheckoutSession } from "@/server/paddle";
import { createStripeCheckoutSession } from "@/server/stripe";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";

export async function POST(request: Request) {
  try {
    assertPublicRouteRateLimit(request, { route: "billing_action" });
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

    const plan = requiredSubscriptionPlan(payload);
    const provider = getOnlineBillingProvider();
    const session =
      provider === "paddle"
        ? await createPaddleCheckoutSession({
            requestUrl: request.url,
            organizationId,
            organizationName: organization?.name ?? organizationId,
            userEmail: context.user.email,
            plan,
          })
        : await createStripeCheckoutSession({
            requestUrl: request.url,
            organizationId,
            organizationName: organization?.name ?? organizationId,
            userEmail: context.user.email,
            plan,
            customerId: subscription?.externalCustomerId,
          });

    return Response.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
