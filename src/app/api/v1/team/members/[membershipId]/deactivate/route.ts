import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import { deactivateClinicTeamMember } from "@/server/team-management";
import { optionalString } from "@/server/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { membershipId } = await context.params;
    const currentState = await readAppState();
    const requestContext = getRequestContext(request, currentState, "admin");
    const membership = currentState.memberships.find((item) => item.id === membershipId);
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      requestContext,
      optionalString(payload, "organizationId") ?? membership?.organizationId,
    );
    const state = await deactivateClinicTeamMember({
      actorRole: requestContext.role,
      actorUserId: requestContext.userId,
      membershipId,
      organizationId,
    });

    return Response.json(stateForContext(state, requestContext));
  } catch (error) {
    return errorResponse(error);
  }
}
