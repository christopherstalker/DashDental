import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { optionalString } from "@/server/validation";
import { getOnlineBillingProvider } from "@/server/manual-billing";
import { createPaddlePortalSession } from "@/server/paddle";
import { createStripePortalSession } from "@/server/stripe";
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
    const subscription = state.subscriptions.find(
      (item) => item.organizationId === organizationId,
    );
    const provider = getOnlineBillingProvider();
    if (!provider) {
      throw new ApiError(
        501,
        "Self-serve billing is not configured",
        "billing_provider_not_configured",
      );
    }
    const session =
      provider === "paddle"
        ? await createPaddlePortalSession({
            customerId: subscription?.externalCustomerId,
            subscriptionId: subscription?.externalSubscriptionId,
          })
        : await createStripePortalSession({
            requestUrl: request.url,
            customerId: subscription?.externalCustomerId,
          });

    return Response.json({ ...session, provider });
  } catch (error) {
    return errorResponse(error);
  }
}
