import { after } from "next/server";
import { ApiError, errorResponse } from "@/server/api-helpers";
import { captureError } from "@/server/observability";
import {
  extractPmsSignatureHeaders,
  normalizePmsWebhookPayload,
  PrismaPmsRepository,
  processPmsWebhook,
  resolvePmsWebhookSecret,
  verifyPmsWebhookSignature,
} from "@/server/pms-sync";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const headers = new Headers(request.headers);
    let payload: Record<string, unknown>;

    try {
      const parsed = JSON.parse(rawBody || "{}") as unknown;
      payload =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
    } catch {
      throw new ApiError(400, "PMS webhook payload is invalid", "validation_error");
    }

    const repository = new PrismaPmsRepository();
    const normalized = normalizePmsWebhookPayload(payload, headers);
    const connection = await repository.findConnection({
      organizationId: normalized.organizationId,
      provider: normalized.provider,
    });

    if (!connection || connection.status === "disconnected") {
      throw new ApiError(404, "Active PMS connection was not found", "pms_connection_not_found");
    }

    const secret = resolvePmsWebhookSecret(normalized.provider, connection);
    const signatureHeaders = extractPmsSignatureHeaders(headers);
    if (
      !secret ||
      !verifyPmsWebhookSignature({
        rawBody,
        secret,
        signature: signatureHeaders.signature,
        timestamp: signatureHeaders.timestamp,
      })
    ) {
      throw new ApiError(401, "PMS signature is invalid", "invalid_webhook_secret");
    }

    after(async () => {
      try {
        await processPmsWebhook({
          repository: new PrismaPmsRepository(),
          payload,
          headers,
        });
      } catch (error) {
        captureError(error, {
          eventId: normalized.eventId,
          organizationId: normalized.organizationId,
          provider: normalized.provider,
          route: "pms.webhook.after",
        });
      }
    });

    return Response.json(
      {
        eventId: normalized.eventId,
        received: true,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
