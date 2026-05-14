import { calculateDashboardOverview } from "@/domain/business-rules";
import { readAppState } from "@/server/data-store";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
} from "@/server/api-helpers";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "manager");
    const url = new URL(request.url);
    const organizationId = assertSameOrganization(
      context,
      url.searchParams.get("organizationId") ?? undefined,
    );

    return Response.json(
      calculateDashboardOverview(
        { leads: state.leads, organizations: state.organizations },
        organizationId,
        new Date().toISOString(),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
