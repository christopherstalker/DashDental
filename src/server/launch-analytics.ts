import { getPlanCatalog } from "@/domain/business-rules";
import type { Role, Subscription } from "@/domain/types";

type Plan = Subscription["plan"];

export const launchEventNames = [
  "public.home.start_trial_clicked",
  "public.home.demo_clicked",
  "public.pricing.plan_clicked",
  "public.trial.start_clicked",
  "auth.register.submitted",
  "auth.register.created",
  "workspace.setup.viewed",
  "workspace.setup.next_action_clicked",
  "workspace.setup.channel_clicked",
  "workspace.billing.invoice_requested",
] as const;

export type LaunchEventName = (typeof launchEventNames)[number];

export interface LaunchEventContext {
  billingStatus?: Subscription["status"] | "expired" | "not_configured";
  completedGates?: number;
  locale?: string;
  onboardingStep?: string;
  page?: string;
  plan?: Plan;
  role?: Role;
  section?: string;
  setupProgress?: number;
  source?: string;
  target?: string;
  totalGates?: number;
}

type LaunchBillingStatus = NonNullable<LaunchEventContext["billingStatus"]>;

export type SanitizedLaunchEvent =
  | {
      ok: true;
      event: LaunchEventName;
      context: LaunchEventContext;
    }
  | {
      ok: false;
      code: "invalid_launch_event_payload" | "unsupported_launch_event";
      status: 400;
    };

const launchEventSet = new Set<string>(launchEventNames);
const allowedPlans = new Set<Plan>(["starter", "growth", "scale"]);
const allowedRoles = new Set<Role>(["owner", "admin", "manager", "super_admin"]);
const allowedBillingStatuses = new Set<LaunchBillingStatus>([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "read_only",
  "expired",
  "not_configured",
] satisfies Array<Subscription["status"] | "expired" | "not_configured">);

function readString(payload: Record<string, unknown>, key: string, maxLength = 96) {
  const value = payload[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string, max = 1000) {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(max, Math.round(value)));
}

function readPlan(payload: Record<string, unknown>) {
  const value = readString(payload, "plan", 24);
  return value && allowedPlans.has(value as Plan) ? (value as Plan) : undefined;
}

export function sanitizeLaunchEventPayload(payload: unknown): SanitizedLaunchEvent {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "invalid_launch_event_payload", status: 400 };
  }

  const record = payload as Record<string, unknown>;
  const event = readString(record, "event", 96);

  if (!event || !launchEventSet.has(event)) {
    return { ok: false, code: "unsupported_launch_event", status: 400 };
  }

  const plan = readPlan(record);
  const role = readString(record, "role", 24);
  const billingStatus = readString(record, "billingStatus", 24);
  const context: LaunchEventContext = {};
  const safeBillingStatus =
    billingStatus &&
    allowedBillingStatuses.has(billingStatus as LaunchBillingStatus)
      ? (billingStatus as LaunchBillingStatus)
      : undefined;
  const safeRole = role && allowedRoles.has(role as Role) ? (role as Role) : undefined;

  setIfPresent(context, "billingStatus", safeBillingStatus);
  setIfPresent(context, "completedGates", readNumber(record, "completedGates", 20));
  setIfPresent(context, "locale", readString(record, "locale", 12));
  setIfPresent(context, "onboardingStep", readString(record, "onboardingStep", 64));
  setIfPresent(context, "page", readString(record, "page", 128));
  setIfPresent(context, "plan", plan);
  setIfPresent(context, "role", safeRole);
  setIfPresent(context, "section", readString(record, "section", 64));
  setIfPresent(context, "setupProgress", readNumber(record, "setupProgress", 100));
  setIfPresent(context, "source", readString(record, "source", 64));
  setIfPresent(context, "target", readString(record, "target", 128));
  setIfPresent(context, "totalGates", readNumber(record, "totalGates", 20));

  return {
    ok: true,
    event: event as LaunchEventName,
    context,
  };
}

function setIfPresent<Key extends keyof LaunchEventContext>(
  context: LaunchEventContext,
  key: Key,
  value: LaunchEventContext[Key] | undefined,
) {
  if (value !== undefined) {
    context[key] = value;
  }
}

export function buildSetupLaunchReview(input: {
  billingDaysRemaining: number;
  billingStatus: LaunchEventContext["billingStatus"];
  completedGates: number;
  nextStep?: { href: string; id: string; title: string };
  totalGates: number;
}) {
  const progress = Math.round((input.completedGates / input.totalGates) * 100);
  const stalledGates = Math.max(0, input.totalGates - input.completedGates);
  const trialAtRisk =
    input.billingStatus === "trialing" && input.billingDaysRemaining <= 1 && stalledGates > 0;
  const billingBlocked =
    input.billingStatus === "expired" ||
    input.billingStatus === "past_due" ||
    input.billingStatus === "not_configured";
  const riskLevel = billingBlocked || trialAtRisk ? "high" : progress < 70 ? "medium" : "low";
  const nextAction = input.nextStep
    ? `Open ${input.nextStep.title.toLowerCase()}`
    : "Start daily recovery review";
  const riskSummary = billingBlocked
    ? "Billing needs attention before paid recovery workflows stay open."
    : trialAtRisk
      ? "Trial is nearly over while launch gates are still open."
      : stalledGates > 0
        ? "A clinic can still drop before value proof if setup stalls here."
        : "Launch proof is ready for owner review.";

  return {
    nextAction,
    nextHref: input.nextStep?.href ?? "/dashboard",
    progress,
    riskLevel,
    riskSummary,
    stalledGates,
  };
}

export function getLaunchPlanLabel(plan?: Plan) {
  return plan ? getPlanCatalog(plan).label : undefined;
}
