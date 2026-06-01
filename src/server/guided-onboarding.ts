import { Prisma, type OnboardingStep as PrismaOnboardingStep, type PmsProvider as PrismaPmsProvider } from "@/generated/prisma";
import { ApiError } from "./api-error";
import { encryptIntegrationSecret } from "./integration-secrets";
import {
  normalizePmsProvider,
  pollPmsConnection,
  PrismaPmsRepository,
  type PmsProvider,
} from "./pms-sync";
import { prisma } from "./prisma";
import { recordProductEvent } from "./product-analytics";
import { structuredLog } from "./observability";

export type GuidedOnboardingStep = "welcome" | "pms" | "phone" | "recall" | "invite" | "done";

export interface GuidedOnboardingProgressItem {
  step: GuidedOnboardingStep;
  completedAt: string | null;
  data: Record<string, unknown>;
}

export interface GuidedOnboardingSummary {
  activatedAt: string | null;
  currentStep: GuidedOnboardingStep;
  progress: GuidedOnboardingProgressItem[];
  steps: readonly GuidedOnboardingStep[];
}

const onboardingSteps = ["welcome", "pms", "phone", "recall", "invite", "done"] as const;
const onboardingStepSet = new Set<GuidedOnboardingStep>(onboardingSteps);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizePhoneNumber(value: string): string {
  const normalized = value.replace(/[^\d+]/g, "");
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    throw new ApiError(400, "phoneNumber must be a valid international number", "validation_error", {
      field: "phoneNumber",
    });
  }

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function toSafeStepData(step: GuidedOnboardingStep, payload: Record<string, unknown>) {
  if (step === "pms") {
    return {
      provider: optionalString(payload, "provider"),
      baseUrlConfigured: Boolean(optionalString(payload, "baseUrl")),
      webhookSecretConfigured: Boolean(optionalString(payload, "webhookSecret")),
    };
  }

  if (step === "phone") {
    return {
      phoneNumber: optionalString(payload, "phoneNumber"),
      smsAutoReplyEnabled: payload.smsAutoReplyEnabled === true,
    };
  }

  if (step === "recall") {
    return {
      appointmentId: optionalString(payload, "appointmentId"),
      sent: payload.sendPreview === true,
    };
  }

  if (step === "invite") {
    return {
      role: optionalString(payload, "role") ?? "manager",
      invited: Boolean(optionalString(payload, "email")),
    };
  }

  return {
    completed: true,
  };
}

export function normalizeGuidedOnboardingStep(value: unknown): GuidedOnboardingStep {
  if (typeof value !== "string" || !onboardingStepSet.has(value as GuidedOnboardingStep)) {
    throw new ApiError(404, "Onboarding step was not found", "onboarding_step_not_found");
  }

  return value as GuidedOnboardingStep;
}

export async function getGuidedOnboardingSummary(
  organizationId: string,
): Promise<GuidedOnboardingSummary> {
  const [organization, rows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { activatedAt: true },
    }),
    prisma.onboardingProgress.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const byStep = new Map(
    rows.map((row) => [
      row.step as GuidedOnboardingStep,
      {
        step: row.step as GuidedOnboardingStep,
        completedAt: row.completedAt?.toISOString() ?? null,
        data: asRecord(row.data),
      },
    ]),
  );
  const progress = onboardingSteps.map(
    (step): GuidedOnboardingProgressItem =>
      byStep.get(step) ?? { step, completedAt: null, data: {} },
  );
  const currentStep =
    progress.find((item) => !item.completedAt)?.step ?? onboardingSteps[onboardingSteps.length - 1];

  return {
    activatedAt: organization?.activatedAt?.toISOString() ?? null,
    currentStep,
    progress,
    steps: onboardingSteps,
  };
}

async function saveProgress(input: {
  organizationId: string;
  step: GuidedOnboardingStep;
  data: Record<string, unknown>;
}) {
  const now = new Date();
  await prisma.onboardingProgress.upsert({
    where: {
      organizationId_step: {
        organizationId: input.organizationId,
        step: input.step as PrismaOnboardingStep,
      },
    },
    create: {
      organizationId: input.organizationId,
      step: input.step as PrismaOnboardingStep,
      completedAt: now,
      data: input.data as Prisma.InputJsonValue,
    },
    update: {
      completedAt: now,
      data: input.data as Prisma.InputJsonValue,
    },
  });
}

async function saveWelcomeStep(input: {
  organizationId: string;
  payload: Record<string, unknown>;
}) {
  const clinicName = optionalString(input.payload, "clinicName");
  const timezone = optionalString(input.payload, "timezone");
  if (!clinicName || clinicName.length < 2) {
    throw new ApiError(400, "clinicName is required", "validation_error", {
      field: "clinicName",
    });
  }
  if (!timezone) {
    throw new ApiError(400, "timezone is required", "validation_error", { field: "timezone" });
  }

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      name: clinicName,
      timezone,
    },
  });

  return {
    clinicName,
    timezone,
  };
}

async function savePmsStep(input: {
  organizationId: string;
  payload: Record<string, unknown>;
}) {
  const provider = normalizePmsProvider(input.payload.provider);
  const apiKey = optionalString(input.payload, "apiKey");
  const webhookSecret = optionalString(input.payload, "webhookSecret");
  const baseUrl = optionalString(input.payload, "baseUrl");
  const runTestSync = input.payload.testSync === true;

  if (!provider) {
    throw new ApiError(400, "provider must be Jane App, Cliniko, or Mindbody", "validation_error", {
      field: "provider",
    });
  }
  if (!apiKey) {
    throw new ApiError(400, "apiKey is required", "validation_error", { field: "apiKey" });
  }

  const connection = await prisma.pmsConnection.upsert({
    where: {
      organizationId_provider: {
        organizationId: input.organizationId,
        provider: provider as PrismaPmsProvider,
      },
    },
    create: {
      organizationId: input.organizationId,
      provider: provider as PrismaPmsProvider,
      apiKeyEncrypted: encryptIntegrationSecret({ apiKey, baseUrl, webhookSecret }),
      status: baseUrl ? "pending" : "pending",
    },
    update: {
      apiKeyEncrypted: encryptIntegrationSecret({ apiKey, baseUrl, webhookSecret }),
      status: "pending",
    },
  });

  let testSync: { processed?: number; status: "not_run" | "passed" | "failed"; error?: string } = {
    status: "not_run",
  };
  if (runTestSync && baseUrl) {
    try {
      const repository = new PrismaPmsRepository();
      const result = await pollPmsConnection(repository, {
        id: connection.id,
        organizationId: connection.organizationId,
        provider: provider as PmsProvider,
        apiKeyEncrypted: connection.apiKeyEncrypted,
        lastSyncedAt: connection.lastSyncedAt,
        status: connection.status,
      });
      testSync = { status: "passed", processed: result.processed };
    } catch (error) {
      structuredLog("warn", "onboarding.pms_test_sync_failed", {
        organizationId: input.organizationId,
        provider,
        error: error instanceof Error ? error.message : String(error),
      });
      testSync = {
        status: "failed",
        error: error instanceof ApiError ? error.code : "pms_test_sync_failed",
      };
    }
  }

  const appointmentCount = await prisma.appointment.count({
    where: { organizationId: input.organizationId },
  });

  return {
    provider,
    connectionId: connection.id,
    status: connection.status,
    appointmentCount,
    testSync,
  };
}

async function savePhoneStep(input: {
  organizationId: string;
  payload: Record<string, unknown>;
}) {
  const phoneNumber = normalizePhoneNumber(
    optionalString(input.payload, "phoneNumber") ?? "",
  );
  const smsAutoReplyEnabled = input.payload.smsAutoReplyEnabled !== false;

  return {
    phoneNumber,
    smsAutoReplyEnabled,
    provisioning: "ready_for_twilio",
  };
}

async function saveRecallStep(input: {
  organizationId: string;
  payload: Record<string, unknown>;
}) {
  const appointmentId = optionalString(input.payload, "appointmentId");
  const appointment = await prisma.appointment.findFirst({
    where: {
      organizationId: input.organizationId,
      ...(appointmentId ? { id: appointmentId } : {}),
    },
    orderBy: { startAt: "asc" },
  });
  const firstName = appointment?.patientName.split(/\s+/)[0] ?? "there";
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  const preview = `Hi ${firstName}, this is ${organization?.name ?? "your clinic"}. We are confirming your upcoming appointment. Reply YES to confirm or call us to reschedule.`;

  return {
    appointmentId: appointment?.id ?? null,
    preview,
    sent: input.payload.sendPreview === true,
  };
}

export async function saveGuidedOnboardingStep(input: {
  organizationId: string;
  step: GuidedOnboardingStep;
  payload: Record<string, unknown>;
  userId: string;
}) {
  let result: Record<string, unknown>;

  if (input.step === "welcome") {
    result = await saveWelcomeStep(input);
  } else if (input.step === "pms") {
    result = await savePmsStep(input);
  } else if (input.step === "phone") {
    result = await savePhoneStep(input);
  } else if (input.step === "recall") {
    result = await saveRecallStep(input);
  } else {
    result = toSafeStepData(input.step, input.payload);
  }

  await saveProgress({
    organizationId: input.organizationId,
    step: input.step,
    data: { ...toSafeStepData(input.step, input.payload), ...result },
  });
  await recordProductEvent({
    organizationId: input.organizationId,
    event: `onboarding.${input.step}.completed`,
    properties: {
      actorUserId: input.userId,
      step: input.step,
    },
  });

  return {
    result,
    summary: await getGuidedOnboardingSummary(input.organizationId),
  };
}

function getSlackWebhookUrl() {
  return (
    process.env.INTERNAL_SLACK_WEBHOOK_URL?.trim() ??
    process.env.SLACK_WEBHOOK_URL?.trim()
  );
}

async function notifyInternalSlack(input: {
  organizationId: string;
  organizationName: string;
}) {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    return { status: "skipped" as const };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `Dash Dental clinic activated: ${input.organizationName}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Clinic activated*\n${input.organizationName}\nOrganization: ${input.organizationId}`,
          },
        },
      ],
    }),
    cache: "no-store",
  });

  return { status: response.ok ? ("sent" as const) : ("failed" as const) };
}

export async function completeGuidedOnboarding(input: {
  organizationId: string;
  userId: string;
}) {
  const now = new Date();
  const organization = await prisma.organization.update({
    where: { id: input.organizationId },
    data: { activatedAt: now },
    select: { id: true, name: true, activatedAt: true },
  });

  await saveProgress({
    organizationId: input.organizationId,
    step: "done",
    data: { activated: true },
  });
  await recordProductEvent({
    organizationId: input.organizationId,
    event: "onboarding.completed",
    properties: { actorUserId: input.userId },
  });
  const slack = await notifyInternalSlack({
    organizationId: organization.id,
    organizationName: organization.name,
  });

  return {
    activatedAt: organization.activatedAt?.toISOString() ?? now.toISOString(),
    slack,
    summary: await getGuidedOnboardingSummary(input.organizationId),
  };
}
