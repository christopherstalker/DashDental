import { readAppState, mutateAppState } from "@/server/data-store";
import { assertEntitlement, canConnectChannel } from "@/server/entitlements";
import { updateIntegrationStatus } from "@/server/state-mutations";
import {
  ApiError,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { requiredIntegrationStatus } from "@/server/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "admin");
    const integration = currentState.integrations.find((item) => item.id === id);

    if (!integration) {
      throw new ApiError(404, "Integration was not found", "integration_not_found");
    }

    if (
      !requestContext.isSuperAdmin &&
      integration.organizationId !== requestContext.organizationId
    ) {
      throw new ApiError(403, "Integration belongs to another organization", "forbidden");
    }

    const payload = await readJsonObject(request);
    const status = requiredIntegrationStatus(payload);
    if (status === "active" && integration.status !== "active") {
      assertEntitlement(
        canConnectChannel(currentState, integration.organizationId),
      );
    }
    if (
      status === "active" &&
      (integration.provider === "telegram" ||
        integration.provider === "whatsapp" ||
        integration.provider === "instagram") &&
      !integration.encryptedCredentials.trim()
    ) {
      throw new ApiError(
        409,
        "Save live API credentials before activating this channel",
        "integration_not_configured",
      );
    }

    const state = await mutateAppState((current) =>
      updateIntegrationStatus(current, {
        integrationId: id,
        status,
        actorUserId: requestContext.userId,
      }),
    );

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}
