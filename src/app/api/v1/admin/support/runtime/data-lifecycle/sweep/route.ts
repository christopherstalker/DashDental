import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      "/admin/runtime/data-lifecycle/sweep",
      {
        method: "POST",
        body: JSON.stringify({
          dryRun: body && typeof body === "object" && "dryRun" in body
            ? Boolean(body.dryRun)
            : true,
          organizationId: body && typeof body === "object" && "organizationId" in body
            ? String(body.organizationId)
            : undefined,
        }),
      },
      "super_admin",
    );
    const organizationId =
      body && typeof body === "object" && "organizationId" in body
        ? String(body.organizationId)
        : undefined;
    await auditSupportActionFromRequest(request, {
      action: "support.data_lifecycle_sweep_requested",
      entityType: "data_lifecycle_run",
      entityId: organizationId ?? "global",
      organizationId,
      metadataJson: {
        dryRun: body && typeof body === "object" && "dryRun" in body
          ? Boolean(body.dryRun)
          : true,
      },
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
