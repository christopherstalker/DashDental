import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ receiptId: string }> },
) {
  try {
    const { receiptId } = await context.params;
    const payload = await readJsonObject(request);
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      `/admin/receipts/${receiptId}/replay`,
      {
        method: "POST",
        body: JSON.stringify({
          force: Boolean(payload.force),
        }),
      },
      "super_admin",
    );
    await auditSupportActionFromRequest(request, {
      action: "support.receipt_replay_requested",
      entityType: "webhook_receipt",
      entityId: receiptId,
      metadataJson: {
        force: Boolean(payload.force),
      },
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
