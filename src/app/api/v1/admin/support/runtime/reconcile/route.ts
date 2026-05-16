import { errorResponse } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(request: Request) {
  try {
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      "/admin/runtime/reconcile",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
      "super_admin",
    );
    await auditSupportActionFromRequest(request, {
      action: "support.runtime_reconcile_requested",
      entityType: "runtime_reconciliation",
      entityId: "global",
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
