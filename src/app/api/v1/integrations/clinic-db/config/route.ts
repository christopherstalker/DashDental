import { mutateAppState, readAppState } from "@/server/data-store";
import { updateClinicDbConnectionConfig } from "@/server/clinic-db-integration";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalBoolean, optionalString } from "@/server/validation";
import { ApiError } from "@/server/api-error";

function validateConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new ApiError(
      400,
      "Clinic DB connection string must be a valid PostgreSQL URL",
      "validation_error",
      { field: "connectionString" },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const connectionString = optionalString(payload, "connectionString");
    if (!connectionString) {
      throw new ApiError(400, "connectionString is required", "validation_error", {
        field: "connectionString",
      });
    }

    validateConnectionString(connectionString);

    const state = await mutateAppState((current) =>
      updateClinicDbConnectionConfig(current, {
        organizationId,
        connectionString,
        ssl: optionalBoolean(payload, "ssl") ?? false,
        actorUserId: context.userId,
      }),
    );

    return Response.json(stateForContext(state, context));
  } catch (error) {
    return errorResponse(error);
  }
}
