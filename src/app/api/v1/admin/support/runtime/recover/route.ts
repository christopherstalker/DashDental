import { errorResponse } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(request: Request) {
  try {
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      "/admin/runtime/recover",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
      "super_admin",
    );
    await auditSupportActionFromRequest(request, {
      action: "support.runtime_recover_requested",
      entityType: "runtime_recovery",
      entityId: "global",
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
