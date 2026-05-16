import { mutateAppState } from "@/server/data-store";
import { refreshLeadConversationProjections } from "@/server/inbox-projections";
import { updateLeadStatus } from "@/server/state-mutations";
import { readAppState } from "@/server/data-store";
import {
  ApiError,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalIsoString, optionalString, requiredLeadStatus } from "@/server/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "manager");
    const lead = currentState.leads.find((item) => item.id === id);

    if (!lead) {
      throw new ApiError(404, "Lead was not found", "lead_not_found");
    }

    if (!requestContext.isSuperAdmin && lead.organizationId !== requestContext.organizationId) {
      throw new ApiError(403, "Lead belongs to another organization", "forbidden");
    }

    const payload = await readJsonObject(request);
    const state = await mutateAppState((current) =>
      updateLeadStatus(current, {
        leadId: id,
        status: requiredLeadStatus(payload),
        reason: optionalString(payload, "reason"),
        actorUserId: requestContext.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
      }),
    );
    await refreshLeadConversationProjections(id);

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}
