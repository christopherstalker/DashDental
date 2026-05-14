import type { Provider } from "@/domain/types";
import { readAppState, mutateAppState } from "@/server/data-store";
import { updateDataAccessContractApproval } from "@/server/data-access-contracts";
import {
  ApiError,
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalIsoString, optionalProvider, optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "owner");
    const payload = await readJsonObject(request);
    const action = optionalString(payload, "action");

    if (action !== "approve" && action !== "revoke") {
      throw new ApiError(400, "action must be approve or revoke", "validation_error", {
        field: "action",
      });
    }

    const provider = (optionalProvider(payload, "provider") ?? "clinic_database") as Provider;
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const state = await mutateAppState((current) =>
      updateDataAccessContractApproval(current, {
        organizationId,
        provider,
        action,
        actorUserId: context.userId,
        approvedByName: context.user.name,
        approvedByEmail: context.user.email,
        nowIso: optionalIsoString(payload, "nowIso"),
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
