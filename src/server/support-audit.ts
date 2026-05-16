import { addAudit } from "./state-mutations";
import { getRequestContext } from "./api-helpers";
import { mutateAppState, readAppState } from "./data-store";
import { getCorrelationIdFromRequest, structuredLog } from "./observability";

export async function auditSupportActionFromRequest(
  request: Request,
  input: {
    action: string;
    entityType: string;
    entityId: string;
    organizationId?: string;
    metadataJson?: Record<string, unknown>;
  },
) {
  const currentState = await readAppState();
  const context = getRequestContext(request, currentState, "super_admin");
  const correlationId = getCorrelationIdFromRequest(request);

  await mutateAppState((state) =>
    addAudit(state, {
      organizationId: input.organizationId,
      actorUserId: context.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: {
        ...(input.metadataJson ?? {}),
        source: "support_api",
        correlationId,
        actorRole: context.role,
      },
    }),
  );
  structuredLog("info", "support.action.audit_logged", {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    organizationId: input.organizationId,
    actorUserId: context.userId,
    correlationId,
  });
}
