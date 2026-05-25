import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import { mutateAppState, readAppState } from "@/server/data-store";
import { upsertReplyTemplate } from "@/server/state-mutations";
import { optionalIsoString, optionalString, requiredString } from "@/server/validation";
import type { ReplyTemplate } from "@/domain/types";

const categories: readonly ReplyTemplate["category"][] = [
  "booking",
  "pricing",
  "callback",
  "aftercare",
  "custom",
];

function readCategory(value?: string): ReplyTemplate["category"] {
  return categories.includes(value as ReplyTemplate["category"])
    ? (value as ReplyTemplate["category"])
    : "custom";
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

    return Response.json({
      templates: (state.replyTemplates ?? [])
        .filter((template) => template.organizationId === organizationId)
        .toSorted((left, right) => left.title.localeCompare(right.title)),
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
    const state = await mutateAppState((current) =>
      upsertReplyTemplate(current, {
        organizationId,
        title: requiredString(payload, "title"),
        body: requiredString(payload, "body"),
        category: readCategory(optionalString(payload, "category")),
        actorUserId: context.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
      }),
    );

    return Response.json(
      {
        templates: state.replyTemplates.filter((template) => template.organizationId === organizationId),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
