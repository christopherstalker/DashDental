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
  const body = await request.text();
  if (!verifyStripeWebhook({ body, signature: request.headers.get("stripe-signature") })) {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as StripeEvent;
  const result = await acceptStripeWebhook({ rawBody: body, event });

  return Response.json({
    received: true,
    duplicate: result.duplicate,
    receiptId: result.receiptId,
    outboxEventId: result.outboxEventId,
  });
}
