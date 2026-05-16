import { getWebFormSetupGuide } from "@/server/integration-onboarding";
import { mutateAppState, readAppState } from "@/server/data-store";
import { assertEntitlement, canConnectChannel } from "@/server/entitlements";
import { configureWebFormIntegration } from "@/server/web-form-integration";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const fallbackSecret = getWebFormSetupGuide(request.url, organizationId).webhookSecret;
    const webhookSecret = optionalString(payload, "webhookSecret") ?? fallbackSecret;
    const existingIntegration = currentState.integrations.find(
      (integration) =>
        integration.organizationId === organizationId &&
        integration.provider === "web_form",
    );
    if (!existingIntegration || existingIntegration.status === "disconnected") {
      assertEntitlement(canConnectChannel(currentState, organizationId));
    }

    const state = await mutateAppState((current) =>
      configureWebFormIntegration(current, {
        organizationId,
        webhookSecret,
        actorUserId: context.userId,
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
