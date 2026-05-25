import { errorResponse, getRequestContext } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "manager");
    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
    const organizationId = context.organizationId;
    const conversations = state.conversations.filter(
      (conversation) => context.isSuperAdmin || conversation.organizationId === organizationId,
    );
    const leadsById = new Map(state.leads.map((lead) => [lead.id, lead]));
    const payload = conversations.map((conversation) => {
      const lead = leadsById.get(conversation.leadId);
      const messages = state.messages.filter((message) => message.conversationId === conversation.id);
      const notes = state.teamNotes.filter((note) => note.conversationId === conversation.id);

      return {
        id: conversation.id,
        patientName: lead?.name ?? "Patient",
        channel: conversation.provider,
        status: conversation.status,
        leadStatus: lead?.status,
        assignedTo: lead?.assignedTo,
        estimatedValue: lead?.estimatedValue,
        lastMessageAt: conversation.lastMessageAt,
        messages,
        notes,
      };
    });

    if (format === "csv") {
      const rows = [
        ["conversation_id", "patient_name", "channel", "status", "lead_status", "assigned_to", "estimated_value", "last_message_at"],
        ...payload.map((item) => [
          item.id,
          item.patientName,
          item.channel,
          item.status,
          item.leadStatus,
          item.assignedTo,
          item.estimatedValue,
          item.lastMessageAt,
        ]),
      ];

      return new Response(rows.map((row) => row.map(csvEscape).join(",")).join("\n"), {
        headers: {
          "content-disposition": "attachment; filename=dash-dental-conversations.csv",
          "content-type": "text/csv; charset=utf-8",
        },
      });
    }

    return Response.json({
      exportedAt: new Date().toISOString(),
      conversations: payload,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
