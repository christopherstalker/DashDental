import { readAppState, mutateAppState } from "@/server/data-store";
import { createAutomationRule } from "@/server/state-mutations";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
  stateForContext,
} from "@/server/api-helpers";
import {
  optionalAutomationTrigger,
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

    return Response.json({
      automationRules: state.automationRules.filter(
        (rule) => rule.organizationId === organizationId,
      ),
    });
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

    const state = await mutateAppState((current) =>
      createAutomationRule(current, {
        organizationId,
        trigger: optionalAutomationTrigger(payload) ?? "first_inbound",
        conditionsJson:
          payload.conditionsJson &&
          typeof payload.conditionsJson === "object" &&
          !Array.isArray(payload.conditionsJson)
            ? (payload.conditionsJson as Record<string, unknown>)
            : {},
        template:
          optionalString(payload, "template") ??
          "Thanks for reaching out. We will reply shortly.",
        active: typeof payload.active === "boolean" ? payload.active : true,
        createdBy: context.userId,
      }),
    );

    return Response.json(stateForContext(state, context), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
