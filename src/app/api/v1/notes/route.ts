import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { readAppState, mutateAppState } from "@/server/data-store";
import {
  assertNoteTarget,
  buildTeamNoteViews,
  createTeamNote,
  getTeamNotes,
} from "@/server/team-notes";
import { optionalIsoString, optionalString, requiredString } from "@/server/validation";

function getLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "manager");
    const url = new URL(request.url);
    const organizationId = assertSameOrganization(
      context,
      url.searchParams.get("organizationId") ?? undefined,
    );
    const conversationId = url.searchParams.get("conversationId") ?? undefined;
    const leadId = url.searchParams.get("leadId") ?? undefined;

    assertNoteTarget(state, { organizationId, conversationId, leadId });

    const notes = getTeamNotes(state, {
      organizationId,
      conversationId,
      leadId,
      limit: getLimit(url.searchParams.get("limit")),
    });

    return Response.json({
      notes: buildTeamNoteViews(state, notes),
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "manager");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const conversationId = optionalString(payload, "conversationId");
    const leadId = optionalString(payload, "leadId");

    const state = await mutateAppState((current) =>
      createTeamNote(current, {
        context,
        organizationId,
        conversationId,
        leadId,
        body: requiredString(payload, "body"),
        nowIso: optionalIsoString(payload, "nowIso"),
      }),
    );

    const notes = getTeamNotes(state, {
      organizationId,
      conversationId,
      leadId,
      limit: 50,
    });

    return Response.json(
      {
        notes: buildTeamNoteViews(state, notes),
        serverTime: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
