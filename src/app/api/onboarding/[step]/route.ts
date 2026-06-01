import { assertSameOrganization, errorResponse, getRequestContext, readJsonObject } from "@/server/api-helpers";
import { readAppState } from "@/server/data-store";
import {
  getGuidedOnboardingSummary,
  normalizeGuidedOnboardingStep,
  saveGuidedOnboardingStep,
} from "@/server/guided-onboarding";
import { createClinicTeamMember } from "@/server/team-management";
import { optionalString, requiredString } from "@/server/validation";
import { ApiError } from "@/server/api-error";

const inviteRoles = new Set(["owner", "admin", "manager"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ step: string }> },
) {
  try {
    const state = await readAppState();
    const context = getRequestContext(request, state, "admin");
    const { step: rawStep } = await params;
    const step = normalizeGuidedOnboardingStep(rawStep);
    const summary = await getGuidedOnboardingSummary(context.organizationId);
    const current = summary.progress.find((item) => item.step === step);

    return Response.json({
      current,
      summary,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ step: string }> },
) {
  try {
    const currentState = await readAppState();
    const context = getRequestContext(request, currentState, "admin");
    const { step: rawStep } = await params;
    const step = normalizeGuidedOnboardingStep(rawStep);
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    let inviteDelivery: unknown;

    if (step === "invite") {
      const rawRole = optionalString(payload, "role") ?? "manager";
      if (!inviteRoles.has(rawRole)) {
        throw new ApiError(400, "role must be owner, admin, or manager", "validation_error", {
          field: "role",
        });
      }
      const role = rawRole as "owner" | "admin" | "manager";
      const result = await createClinicTeamMember({
        actorRole: context.role,
        actorUserId: context.userId,
        email: requiredString(payload, "email"),
        name: requiredString(payload, "name"),
        organizationId,
        requestUrl: request.url,
        role,
      });
      inviteDelivery = result.inviteDelivery;
    }

    const result = await saveGuidedOnboardingStep({
      organizationId,
      step,
      payload,
      userId: context.userId,
    });

    return Response.json({
      ...result,
      inviteDelivery,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
