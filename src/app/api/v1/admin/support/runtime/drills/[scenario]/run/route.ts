import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ scenario: string }> },
) {
  try {
    const { scenario } = await context.params;
    const body = await readJsonObject(request);
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      `/admin/runtime/drills/${encodeURIComponent(scenario)}/run`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "super_admin",
    );
    await auditSupportActionFromRequest(request, {
      action: "support.drill_run_requested",
      entityType: "runtime_drill",
      entityId: scenario,
      metadataJson: body && typeof body === "object" ? body : {},
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
