import { deriveLeadStatus } from "@/domain/business-rules";
import { readAppState, mutateAppState } from "@/server/data-store";
import { refreshOrganizationConversationProjections } from "@/server/inbox-projections";
import { createLeadFromInbound } from "@/server/state-mutations";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import {
  optionalIsoString,
  optionalProvider,
  optionalString,
} from "@/server/validation";

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "manager");
    const url = new URL(request.url);
    const organizationId = assertSameOrganization(
      context,
      url.searchParams.get("organizationId") ?? undefined,
    );
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const nowIso = new Date().toISOString();

    const leads = state.leads
      .filter((lead) => lead.organizationId === organizationId)
      .map((lead) => ({ ...lead, status: deriveLeadStatus(lead, nowIso) }))
      .filter((lead) => (status ? lead.status === status : true))
      .filter((lead) => (source ? lead.source === source : true));

    return Response.json({ leads });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const source = optionalProvider(payload, "source") ?? "web_form";

    const state = await mutateAppState((current) =>
      createLeadFromInbound(current, {
        organizationId,
        actorUserId: context.userId,
        name: optionalString(payload, "name") ?? "New patient",
        phone: optionalString(payload, "phone"),
        email: optionalString(payload, "email"),
        source,
        providerContactId: optionalString(payload, "providerContactId"),
        assignedTo: optionalString(payload, "assignedTo"),
        messageText: "Manual lead created in dashboard",
        nowIso: optionalIsoString(payload, "firstMessageAt"),
      }),
    );
    await refreshOrganizationConversationProjections(organizationId);

    return Response.json(stateForContext(state, context), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
