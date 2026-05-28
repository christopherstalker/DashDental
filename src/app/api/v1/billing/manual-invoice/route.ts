import { getPlanCatalog } from "@/domain/business-rules";
import { readAppState, mutateAppState } from "@/server/data-store";
import { addAudit } from "@/server/state-mutations";
import { ApiError } from "@/server/api-error";
import {
  assertSameOrganization,
  errorResponse,
  getRequestContext,
  readJsonObject,
} from "@/server/api-helpers";
import {
  buildManualInvoiceSummary,
  getManualBillingDetails,
  getManualBillingMissingFields,
  isManualBillingConfigured,
} from "@/server/manual-billing";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { optionalString, requiredSubscriptionPlan } from "@/server/validation";

export async function POST(request: Request) {
  try {
    assertPublicRouteRateLimit(request, { route: "billing_action" });
    const state = await readAppState();
    const context = getRequestContext(request, state, "owner");
    const payload = await readJsonObject(request);
    const organizationId = assertSameOrganization(
      context,
      optionalString(payload, "organizationId"),
    );
    const details = getManualBillingDetails();
    if (!isManualBillingConfigured(details)) {
      throw new ApiError(
        501,
        "Manual bank transfer billing is not configured yet.",
        "manual_billing_not_configured",
        { missing: getManualBillingMissingFields(details) },
      );
    }

    const organization = state.organizations.find((item) => item.id === organizationId);
    if (!organization) {
      throw new ApiError(404, "Organization was not found.", "organization_not_found");
    }

    const plan = requiredSubscriptionPlan(payload);
    const invoice = buildManualInvoiceSummary({ organization, plan, details });
    const catalog = getPlanCatalog(plan);
    const requestId = `invoice-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await mutateAppState((current) =>
      addAudit(current, {
        organizationId,
        actorUserId: context.userId,
        action: "billing.manual_invoice_requested",
        entityType: "billing_invoice_request",
        entityId: requestId,
        metadataJson: {
          plan,
          planLabel: catalog.label,
          amount: invoice.amount,
          currency: invoice.currency,
          paymentReference: invoice.paymentReference,
          requestedByEmail: context.user.email,
        },
      }),
    );

    return Response.json({
      requestId,
      status: "requested",
      plan,
      planLabel: catalog.label,
      amount: invoice.amount,
      currency: invoice.currency,
      paymentReference: invoice.paymentReference,
      bankTransfer: details,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
