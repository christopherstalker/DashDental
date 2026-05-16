import type {
  AutomationTrigger,
  IntegrationStatus,
  LeadStatus,
  Provider,
  Subscription,
} from "@/domain/types";
import { ApiError } from "./api-error";

const leadStatuses: readonly LeadStatus[] = [
  "new",
  "unanswered",
  "at_risk",
  "in_conversation",
  "booked",
  "lost",
];
const providers: readonly Provider[] = [
  "telegram",
  "web_form",
  "instagram",
  "whatsapp",
  "clinic_database",
];
const integrationStatuses: readonly IntegrationStatus[] = [
  "active",
  "pending",
  "degraded",
  "disconnected",
];
const subscriptionPlans: readonly Subscription["plan"][] = ["starter", "growth", "scale"];
const subscriptionStatuses: readonly Subscription["status"][] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "read_only",
];
const automationTriggers: readonly AutomationTrigger[] = [
  "first_inbound",
  "outside_business_hours",
  "sla_warning",
];

export function optionalString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = optionalString(payload, key);
  if (!value) {
    throw new ApiError(400, `${key} is required`, "validation_error", { field: key });
  }

  return value;
}

export function optionalIsoString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = optionalString(payload, key);
  if (!value) {
    return undefined;
  }

  if (Number.isNaN(new Date(value).getTime())) {
    throw new ApiError(400, `${key} must be an ISO date`, "validation_error", {
      field: key,
    });
  }

  return value;
}

export function optionalNumber(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

export function optionalBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = payload[key];
  return typeof value === "boolean" ? value : undefined;
}

export function optionalProvider(
  payload: Record<string, unknown>,
  key: string,
): Provider | undefined {
  const value = optionalString(payload, key);
  if (!value) {
    return undefined;
  }

  if (!providers.includes(value as Provider)) {
    throw new ApiError(400, `${key} is invalid`, "validation_error", {
      field: key,
      allowed: providers,
    });
  }

  return value as Provider;
}

export function requiredLeadStatus(
  payload: Record<string, unknown>,
  key = "status",
): LeadStatus {
  const value = requiredString(payload, key);
  if (!leadStatuses.includes(value as LeadStatus)) {
    throw new ApiError(400, `${key} is invalid`, "validation_error", {
      field: key,
      allowed: leadStatuses,
    });
  }

  return value as LeadStatus;
}

export function requiredIntegrationStatus(
  payload: Record<string, unknown>,
  key = "status",
): IntegrationStatus {
  const value = requiredString(payload, key);
  if (!integrationStatuses.includes(value as IntegrationStatus)) {
    throw new ApiError(400, `${key} is invalid`, "validation_error", {
      field: key,
      allowed: integrationStatuses,
    });
  }

  return value as IntegrationStatus;
}

export function requiredSubscriptionPlan(
  payload: Record<string, unknown>,
  key = "plan",
): Subscription["plan"] {
  const value = requiredString(payload, key);
  if (!subscriptionPlans.includes(value as Subscription["plan"])) {
    throw new ApiError(400, `${key} is invalid`, "validation_error", {
      field: key,
      allowed: subscriptionPlans,
    });
  }

  return value as Subscription["plan"];
}

export function optionalSubscriptionStatus(
  payload: Record<string, unknown>,
  key = "status",
): Subscription["status"] | undefined {
  const value = optionalString(payload, key);
  if (!value) {
    return undefined;
  }

  if (!subscriptionStatuses.includes(value as Subscription["status"])) {
    throw new ApiError(400, `${key} is invalid`, "validation_error", {
      field: key,
      allowed: subscriptionStatuses,
    });
  }

  return value as Subscription["status"];
}

export function optionalAutomationTrigger(
  payload: Record<string, unknown>,
  key = "trigger",
): AutomationTrigger | undefined {
  const value = optionalString(payload, key);
  if (!value) {
    return undefined;
  }

  if (!automationTriggers.includes(value as AutomationTrigger)) {
    throw new ApiError(400, `${key} is invalid`, "validation_error", {
      field: key,
      allowed: automationTriggers,
    });
  }

  return value as AutomationTrigger;
}
