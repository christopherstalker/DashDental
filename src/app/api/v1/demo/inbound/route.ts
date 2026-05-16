import { readAppState, mutateAppState } from "@/server/data-store";
import { createLeadFromInbound } from "@/server/state-mutations";
import { ApiError } from "@/server/api-error";
import { isDemoActionsEnabled } from "@/server/feature-flags";
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

const patientSamples = [
  {
    name: "Emma Brooks",
    phone: "+1 312 555 0149",
    text: "I cracked a molar and need to know if you can see me today.",
    source: "telegram" as const,
  },
  {
    name: "Daniel Fox",
    phone: "+1 646 555 0188",
    text: "I want a second opinion for veneers. What is the consultation price?",
    source: "web_form" as const,
  },
  {
    name: "Marta Shevchenko",
    phone: "+380 97 555 0133",
    text: "Can I book a cleaning this Friday after work?",
    source: "telegram" as const,
  },
];

export async function POST(request: Request) {
  try {
    if (!isDemoActionsEnabled()) {
      throw new ApiError(403, "Demo inbound simulation is disabled", "demo_actions_disabled");
    }

    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "manager");
    const payload = await readJsonObject(request);
    const sample = patientSamples[Math.floor(Math.random() * patientSamples.length)];
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );

    const state = await mutateAppState((current) =>
      createLeadFromInbound(current, {
        organizationId,
        actorUserId: context.userId,
        nowIso: optionalIsoString(payload, "nowIso"),
        name: optionalString(payload, "name") ?? sample.name,
        phone: optionalString(payload, "phone") ?? sample.phone,
        source: optionalProvider(payload, "source") ?? sample.source,
        messageText: optionalString(payload, "text") ?? sample.text,
      }),
    );

    return Response.json(stateForContext(state, context), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
