import type { Role } from "@/domain/types";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import { createClinicTeamMember } from "@/server/team-management";
import { requiredString } from "@/server/validation";
import { ApiError } from "@/server/api-error";

const teamRoles: readonly Role[] = ["owner", "admin", "manager"];

function requiredTeamRole(payload: Record<string, unknown>): Role {
  const role = requiredString(payload, "role") as Role;
  if (!teamRoles.includes(role)) {
    throw new ApiError(400, "role must be owner, admin or manager", "validation_error", {
      field: "role",
      allowed: teamRoles,
    });
  }

  return role;
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      requiredString(payload, "organizationId"),
    );
    const result = await createClinicTeamMember({
      actorRole: context.role,
      actorUserId: context.userId,
      email: requiredString(payload, "email"),
      name: requiredString(payload, "name"),
      organizationId,
      requestUrl: request.url,
      role: requiredTeamRole(payload),
    });

    return Response.json(
      {
        inviteDelivery: result.inviteDelivery,
        state: stateForContext(result.state, context),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
