import { errorResponse } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      "/admin/runtime/projections/rebuild",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "super_admin",
    );
    await auditSupportActionFromRequest(request, {
      action: "support.projections_rebuild_requested",
      entityType: "conversation_projection",
      entityId:
        body && typeof body === "object" && "organizationId" in body
          ? String(body.organizationId)
          : "global",
      organizationId:
        body && typeof body === "object" && "organizationId" in body
          ? String(body.organizationId)
          : undefined,
      metadataJson: body && typeof body === "object" ? body : {},
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
