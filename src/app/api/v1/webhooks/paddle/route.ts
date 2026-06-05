import { ApiError, errorResponse } from "@/server/api-helpers";
import { normalizePaddleEvent, verifyPaddleWebhook } from "@/server/paddle";
import { acceptPaddleWebhook } from "@/server/webhook-pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (!verifyPaddleWebhook({ body, signature: request.headers.get("paddle-signature") })) {
      throw new ApiError(400, "Invalid Paddle signature", "invalid_webhook_secret");
    }

    const payload = JSON.parse(body) as Record<string, unknown>;
    const event = normalizePaddleEvent(payload);
    const result = await acceptPaddleWebhook({ rawBody: body, event });

    return Response.json({
      received: true,
      duplicate: result.duplicate,
      receiptId: result.receiptId,
      billingEventId: result.billingEventId,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(new ApiError(400, "Paddle webhook payload is invalid", "validation_error"));
    }

    return errorResponse(error);
  }
}
