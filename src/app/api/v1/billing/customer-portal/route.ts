import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { optionalString } from "@/server/validation";
import { createStripePortalSession } from "@/server/stripe";

export async function POST(request: Request) {
  try {
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
    const session = await createStripePortalSession({
      requestUrl: request.url,
      customerId: subscription?.externalCustomerId,
    });

    return Response.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
