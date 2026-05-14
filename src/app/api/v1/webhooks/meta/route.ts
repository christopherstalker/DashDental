import {
  extractMetaInboundMessages,
  isKnownMetaVerifyToken,
  verifyMetaWebhookSignature,
} from "@/server/channel-integrations";
import { readAppState } from "@/server/data-store";
import { ApiError, errorResponse } from "@/server/api-helpers";
import { acceptInboundWebhook, resolveWebhookExternalEventId } from "@/server/webhook-pipeline";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");

    if (mode !== "subscribe" || !challenge || !verifyToken) {
      throw new ApiError(400, "Meta webhook verification parameters are missing", "validation_error");
    }

    if (!isKnownMetaVerifyToken(state, verifyToken)) {
      throw new ApiError(403, "Meta verify token is invalid", "invalid_webhook_secret");
    }

    return new Response(challenge, {
      status: 200,
      headers: {
        "content-type": "text/plain",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const state = await readAppState();
    if (
      !verifyMetaWebhookSignature(
        state,
        rawBody,
        request.headers.get("x-hub-signature-256"),
      )
    ) {
      throw new ApiError(401, "Meta signature is invalid", "invalid_webhook_secret");
    }

    const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const canonicalMessages = extractMetaInboundMessages(state, payload);
    const result = await acceptInboundWebhook({
      provider: "meta",
      rawBody,
      payload,
      signatureStatus: "valid",
      providerAccountKey:
        canonicalMessages[0]?.organizationId ??
        (typeof payload.object === "string" ? payload.object : undefined),
      externalEventId:
        canonicalMessages[0]?.providerEventId ??
        resolveWebhookExternalEventId(undefined, rawBody),
      canonicalMessages,
    });

    if (canonicalMessages.length === 0) {
      return Response.json({
        status: "ignored",
        processed: 0,
        receiptId: result.receiptId,
      }, { status: 200 });
    }

    return Response.json(
      {
        status: result.duplicate ? "duplicate" : "received",
        processed: canonicalMessages.length,
        receiptId: result.receiptId,
        outboxEventIds: result.outboxEventIds,
      },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
