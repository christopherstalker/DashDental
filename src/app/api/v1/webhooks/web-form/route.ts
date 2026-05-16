import { normalizeWebFormPayload } from "@/domain/business-rules";
import { isDemoOrganizationId } from "@/domain/seed-data";
import { readAppState } from "@/server/data-store";
import { ApiError, errorResponse } from "@/server/api-helpers";
import { optionalString } from "@/server/validation";
import { acceptInboundWebhook } from "@/server/webhook-pipeline";

function resolveWebFormOrganizationId(
  organizationId: string | undefined,
  currentState: Awaited<ReturnType<typeof readAppState>>,
): string {
  if (organizationId) {
    return organizationId;
  }

  const activeWebFormOrganizations = [
    ...new Set(
      currentState.integrations
        .filter(
          (integration) =>
            integration.provider === "web_form" && integration.status === "active",
        )
        .map((integration) => integration.organizationId),
    ),
  ];

  if (activeWebFormOrganizations.length === 1) {
    return activeWebFormOrganizations[0];
  }

  if (currentState.organizations.length === 1) {
    return currentState.organizations[0].id;
  }

  const nonDemoOrganization = currentState.organizations.find(
    (organization) => !isDemoOrganizationId(organization.id),
  );
  if (nonDemoOrganization) {
    return nonDemoOrganization.id;
  }

  throw new ApiError(400, "organizationId is required", "validation_error", {
    field: "organizationId",
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const currentState = await readAppState();
    const organizationId = resolveWebFormOrganizationId(
      optionalString(payload, "organizationId"),
      currentState,
    );
    const integration = currentState.integrations.find(
      (item) => item.organizationId === organizationId && item.provider === "web_form",
    );

    if (!integration || integration.status !== "active") {
      throw new ApiError(404, "Active web form integration was not found", "integration_not_found");
    }

    const webhookSecret = request.headers.get("x-webhook-secret");
    if (!webhookSecret || webhookSecret !== integration.webhookSecret) {
      throw new ApiError(401, "Webhook secret is invalid", "invalid_webhook_secret");
    }

    const canonicalMessage = normalizeWebFormPayload(organizationId, payload);
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ?? canonicalMessage.providerEventId;
    const result = await acceptInboundWebhook({
      provider: "web_form",
      rawBody,
      payload,
      signatureStatus: "valid",
      providerAccountKey: organizationId,
      externalEventId: idempotencyKey,
      canonicalMessages: [
        {
          organizationId,
          provider: "web_form",
          providerEventId: idempotencyKey,
          providerMessageId: canonicalMessage.providerMessageId,
          providerThreadId: canonicalMessage.providerThreadId,
          providerContactId: canonicalMessage.providerContactId,
          patientName: canonicalMessage.patientName,
          patientPhone: canonicalMessage.patientPhone,
          text: canonicalMessage.text,
          occurredAt: canonicalMessage.occurredAt,
          rawPayload: payload,
        },
      ],
    });

    return Response.json(
      {
        status: result.duplicate ? "duplicate" : "received",
        idempotencyKey,
        canonicalMessage,
        receiptId: result.receiptId,
        outboxEventIds: result.outboxEventIds,
        nextStep: result.duplicate
          ? "already processed"
          : "receipt persisted and queued for normalization",
      },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
