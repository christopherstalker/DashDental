import { ApiError, errorResponse } from "@/server/api-helpers";
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
    const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const repository = new PrismaPmsRepository();
    const normalized = normalizePmsWebhookPayload(payload, request.headers);
    const connection = await repository.findConnection({
      organizationId: normalized.organizationId,
      provider: normalized.provider,
    });

    if (!connection || connection.status === "disconnected") {
      throw new ApiError(404, "Active PMS connection was not found", "pms_connection_not_found");
    }

    const secret = resolvePmsWebhookSecret(normalized.provider, connection);
    const signatureHeaders = extractPmsSignatureHeaders(request.headers);
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

    const result = await processPmsWebhook({
      repository,
      payload,
      headers: request.headers,
    });

    return Response.json(result, { status: result.created ? 202 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
