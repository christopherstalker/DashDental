import { mutateAppState, readAppState } from "@/server/data-store";
import { configureMessagingIntegration } from "@/server/channel-integrations";
import { assertEntitlement, canConnectChannel } from "@/server/entitlements";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { ApiError } from "@/server/api-error";
import { optionalProvider, optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const provider = optionalProvider(payload, "provider");

    if (!provider || provider === "web_form" || provider === "phone" || provider === "clinic_database") {
      throw new ApiError(400, "provider must be telegram, whatsapp or instagram", "validation_error", {
        field: "provider",
      });
    }
    const existingIntegration = currentState.integrations.find(
      (integration) =>
        integration.organizationId === organizationId &&
        integration.provider === provider,
    );
    if (!existingIntegration || existingIntegration.status === "disconnected") {
      assertEntitlement(canConnectChannel(currentState, organizationId));
    }

    const state = await mutateAppState((current) =>
      configureMessagingIntegration(current, {
        requestUrl: request.url,
        organizationId,
        provider,
        actorUserId: context.userId,
        credentials:
          provider === "telegram"
            ? {
                botToken: optionalString(payload, "botToken") ?? "",
                botUsername: optionalString(payload, "botUsername"),
                webhookSecret: optionalString(payload, "webhookSecret") ?? "",
              }
            : provider === "whatsapp"
              ? {
                  accessToken: optionalString(payload, "accessToken") ?? "",
                  phoneNumberId: optionalString(payload, "phoneNumberId") ?? "",
                  businessAccountId: optionalString(payload, "businessAccountId"),
                  appSecret: optionalString(payload, "appSecret"),
                  webhookVerifyToken: optionalString(payload, "webhookVerifyToken") ?? "",
                }
              : {
                  pageAccessToken: optionalString(payload, "pageAccessToken") ?? "",
                  pageId: optionalString(payload, "pageId") ?? "",
                  instagramBusinessAccountId: optionalString(
                    payload,
                    "instagramBusinessAccountId",
                  ),
                  appSecret: optionalString(payload, "appSecret"),
                  webhookVerifyToken: optionalString(payload, "webhookVerifyToken") ?? "",
                },
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
