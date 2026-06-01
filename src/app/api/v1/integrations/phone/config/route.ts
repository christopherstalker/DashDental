import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { mutateAppState, readAppState } from "@/server/data-store";
import { configurePhoneIntegrationInState } from "@/server/phone-capture";
import { optionalBoolean, optionalString, requiredString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );

    const state = await mutateAppState((current) =>
      configurePhoneIntegrationInState(current, {
        organizationId,
        actorUserId: context.userId,
        phoneNumber: requiredString(payload, "phoneNumber"),
        accountSid: optionalString(payload, "accountSid"),
        authToken: optionalString(payload, "authToken"),
        messagingServiceSid: optionalString(payload, "messagingServiceSid"),
        autoReplyEnabled: optionalBoolean(payload, "autoReplyEnabled"),
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
