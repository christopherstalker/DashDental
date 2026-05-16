import {
  ClinicDbSyncSetupError,
  fetchClinicDbLeadRows,
  recordClinicDbSyncFailure,
  syncClinicDbRows,
} from "@/server/clinic-db-sync";
import { hasApprovedClinicDbContract } from "@/server/data-access-contracts";
import { mutateAppState, readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import { optionalIsoString, optionalNumber, optionalString } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const nowIso = optionalIsoString(payload, "nowIso") ?? new Date().toISOString();
    const limit = Math.min(Math.max(optionalNumber(payload, "limit") ?? 500, 1), 2000);

    if (!hasApprovedClinicDbContract(currentState, organizationId)) {
      const message =
        "Data access contract requires IT approval before Clinic DB sync can read tables.";
      const state = await mutateAppState((current) =>
        recordClinicDbSyncFailure(current, {
          organizationId,
          actorUserId: context.userId,
          nowIso,
          message,
          setupRequired: true,
        }),
      );

      return Response.json(
        {
          error: message,
          approvalRequired: true,
          state: stateForContext(state, context),
        },
        { status: 428 },
      );
    }

    try {
      const rows = await fetchClinicDbLeadRows({
        state: currentState,
        organizationId,
        limit,
      });
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      const state = await mutateAppState((current) => {
        const result = syncClinicDbRows(current, {
          organizationId,
          actorUserId: context.userId,
          nowIso,
          rows,
        });
        imported = result.imported;
        updated = result.updated;
        skipped = result.skipped;
        return result.state;
      });

      return Response.json({
        state: stateForContext(state, context),
        imported,
        updated,
        skipped,
        rows: rows.length,
      });
    } catch (error) {
      const setupRequired = error instanceof ClinicDbSyncSetupError;
      const message =
        error instanceof Error
          ? error.message
          : "Clinic database sync failed.";

      const state = await mutateAppState((current) =>
        recordClinicDbSyncFailure(current, {
          organizationId,
          actorUserId: context.userId,
          nowIso,
          message,
          setupRequired,
        }),
      );

      return Response.json(
        {
          error: message,
          setupRequired,
          state: stateForContext(state, context),
        },
        { status: setupRequired ? 409 : 502 },
      );
    }
  } catch (error) {
    return errorResponse(error);
  }
}
