import { extractTelegramInboundMessage } from "@/server/channel-integrations";
import { readAppState } from "@/server/data-store";
import { errorResponse } from "@/server/api-helpers";
import { acceptInboundWebhook, resolveWebhookExternalEventId } from "@/server/webhook-pipeline";

function readTelegramExternalEventId(payload: Record<string, unknown>, rawBody: string): string {
  const updateId = typeof payload.update_id === "number" ? `tg-update-${payload.update_id}` : undefined;
  return resolveWebhookExternalEventId(updateId, rawBody);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const state = await readAppState();
    const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
    const canonicalMessage = extractTelegramInboundMessage(
      state,
      payload,
      secretToken,
    );
    const result = await acceptInboundWebhook({
      provider: "telegram",
      rawBody,
      payload,
      signatureStatus: "valid",
      providerAccountKey: secretToken ?? undefined,
      externalEventId: canonicalMessage?.providerEventId ?? readTelegramExternalEventId(payload, rawBody),
      canonicalMessages: canonicalMessage ? [canonicalMessage] : [],
    });

    if (!canonicalMessage) {
      return Response.json({
        status: "ignored",
        reason: "unsupported_update",
        receiptId: result.receiptId,
      }, { status: 200 });
    }

    return Response.json(
      {
        status: result.duplicate ? "duplicate" : "received",
        provider: "telegram",
        providerEventId: canonicalMessage.providerEventId,
        receiptId: result.receiptId,
        outboxEventIds: result.outboxEventIds,
      },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
