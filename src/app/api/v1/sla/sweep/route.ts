import { readAppState, mutateAppState } from "@/server/data-store";
import { refreshOrganizationConversationProjections } from "@/server/inbox-projections";
import { sweepSla } from "@/server/state-mutations";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalIsoString, optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "manager");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    let changedCount = 0;

    const state = await mutateAppState((current) => {
      const result = sweepSla(current, {
        organizationId,
        nowIso: optionalIsoString(payload, "nowIso") ?? new Date().toISOString(),
      });
      changedCount = result.changedCount;
      return result.state;
    });
    await refreshOrganizationConversationProjections(organizationId);

    return Response.json({ state: stateForContext(state, context), changedCount });
  } catch (error) {
    return errorResponse(error);
  }
}
