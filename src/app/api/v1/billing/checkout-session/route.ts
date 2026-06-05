import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import {
  optionalBillingInterval,
  optionalString,
  requiredSubscriptionPlan,
} from "@/server/validation";
import { getOnlineBillingProvider } from "@/server/manual-billing";
import { createPaddleCheckoutSession } from "@/server/paddle";
import { createStripeCheckoutSession } from "@/server/stripe";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { ApiError } from "@/server/api-error";

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
    const interval = optionalBillingInterval(payload) ?? "monthly";
    const provider = getOnlineBillingProvider();
    if (!provider) {
      throw new ApiError(
        501,
        "Self-serve billing is not configured",
        "billing_provider_not_configured",
      );
    }
    if (provider === "stripe" && interval !== "monthly") {
      throw new ApiError(
        400,
        "Annual checkout is only available through Paddle billing",
        "annual_checkout_not_supported",
      );
    }
    const session =
      provider === "paddle"
        ? await createPaddleCheckoutSession({
            requestUrl: request.url,
            organizationId,
            organizationName: organization?.name ?? organizationId,
            userEmail: context.user.email,
            plan,
            interval,
          })
        : await createStripeCheckoutSession({
            requestUrl: request.url,
            organizationId,
            organizationName: organization?.name ?? organizationId,
            userEmail: context.user.email,
            plan,
            customerId: subscription?.externalCustomerId,
          });

    return Response.json({ ...session, interval, provider });
  } catch (error) {
    return errorResponse(error);
  }
}
