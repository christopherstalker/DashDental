import { ApiError, errorResponse } from "@/server/api-helpers";
import { acceptTwilioMissedCallWebhook } from "@/server/phone-capture";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      throw new ApiError(400, "Twilio webhook body is required", "validation_error");
    }

    const result = await acceptTwilioMissedCallWebhook({
      contentType: request.headers.get("content-type"),
      rawBody,
      request,
    });

    return Response.json(result, {
      status: result.status === "ignored" || result.status === "duplicate" ? 200 : 202,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
