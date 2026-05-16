import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
} from "@/server/api-helpers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = await readAppState();
    const context = getRequestContext(request, state, "owner");
    const organizationId = assertSameOrganization(
      context,
      url.searchParams.get("organizationId") ?? undefined,
    );
    const organization = state.organizations.find((item) => item.id === organizationId);

    if (!organization) {
      return Response.json({ error: "organization not found" }, { status: 404 });
    }

    const contracts = state.dataAccessContracts.filter(
      (contract) => contract.organizationId === organizationId,
    );
    const auditLogs = state.auditLogs.filter(
      (log) =>
        log.organizationId === organizationId &&
        (log.action.includes("data_access") ||
          log.action.includes("clinic_db") ||
          log.action.includes("team_note")),
    );
    const integrationEvents = state.integrationEvents.filter(
      (event) => event.organizationId === organizationId,
    );
    const teamNotes = state.teamNotes.filter(
      (note) => note.organizationId === organizationId,
    );

    return Response.json({
      exportedAt: new Date().toISOString(),
      organization,
      contracts,
      auditLogs,
      integrationEvents,
      teamNotes,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
