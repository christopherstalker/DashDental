import { ApiError, errorResponse } from "@/server/api-helpers";
import { verifyStripeWebhook } from "@/server/stripe";
import { acceptStripeWebhook } from "@/server/webhook-pipeline";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (!verifyStripeWebhook({ body, signature: request.headers.get("stripe-signature") })) {
      throw new ApiError(400, "Invalid Stripe signature", "invalid_webhook_secret");
    }

    let event: StripeEvent;

    try {
      event = JSON.parse(body) as StripeEvent;
    } catch {
      throw new ApiError(400, "Stripe webhook payload is invalid", "validation_error");
    }

    if (!event?.id || !event.type || !event.data || typeof event.data !== "object") {
      throw new ApiError(400, "Stripe webhook payload is invalid", "validation_error");
    }

    const result = await acceptStripeWebhook({ rawBody: body, event });

    return Response.json({
      received: true,
      duplicate: result.duplicate,
      receiptId: result.receiptId,
      outboxEventId: result.outboxEventId,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
