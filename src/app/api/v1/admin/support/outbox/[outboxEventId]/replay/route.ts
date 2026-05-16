import { errorResponse, readJsonObject } from "@/server/api-helpers";
import { fetchBackendAdminFromRequest } from "@/server/backend-admin-client";
import { auditSupportActionFromRequest } from "@/server/support-audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ outboxEventId: string }> },
) {
  try {
    const { outboxEventId } = await context.params;
    const payload = await readJsonObject(request);
    const response = await fetchBackendAdminFromRequest<unknown>(
      request,
      `/admin/outbox/${outboxEventId}/replay`,
      {
        method: "POST",
        body: JSON.stringify({
          force: Boolean(payload.force),
        }),
      },
      "super_admin",
    );
    await auditSupportActionFromRequest(request, {
      action: "support.outbox_replay_requested",
      entityType: "outbox_event",
      entityId: outboxEventId,
      metadataJson: {
        force: Boolean(payload.force),
      },
    });

    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
