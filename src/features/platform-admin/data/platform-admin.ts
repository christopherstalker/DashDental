import { fetchBackendAdminFromServer } from "@/server/backend-admin-client";

export interface PlatformFailureItem {
  id: string;
  kind: "receipt" | "outbox";
  organizationId: string | null;
  organizationName: string;
  provider: string | null;
  status: string;
  title: string;
  detail: string;
  occurredAt: string;
  correlationId: string | null;
}

export interface PlatformOrganizationSummary {
  id: string;
  name: string;
  status: string;
  timezone: string;
  currency: string;
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  activeIntegrations: number;
  degradedIntegrations: number;
  totalIntegrations: number;
  failedReceipts: number;
  pendingReceipts: number;
  failedOutbox: number;
  pendingOutbox: number;
  lastReceiptAt: string | null;
}

export interface PlatformRecoverySnapshot {
  checkedAt: string;
  receipts: {
    receivedBacklog: number;
    processingExpired: number;
    retryableFailed: number;
    deadLetter: number;
    recoverable: number;
  };
  outbox: {
    pendingBacklog: number;
    dispatchExpired: number;
    retryableFailed: number;
    deadLetter: number;
    recoverable: number;
  };
}

export interface PlatformQueueHealthSnapshot {
  checkedAt: string;
  queues: Array<{
    name: string;
    critical: boolean;
    paused: boolean;
    waiting: number;
    active: number;
    delayed: number;
    prioritized: number;
    failed: number;
    completed: number;
    pausedJobs: number;
    backlog: number;
  }>;
  totals: {
    backlog: number;
    failed: number;
    paused: number;
    criticalBacklog: number;
    criticalFailed: number;
  };
}

export interface PlatformReconciliationSnapshot {
  checkedAt: string;
  monitoredIntegrations: number;
  staleIntegrations: number;
  degradedBySilence: number;
  lateReceipts24h: number;
  unresolvedRecentReceipts: number;
  providerGaps: {
    unresolvedByProviderAccount: Array<{
      provider: string;
      providerAccountKey: string;
      receipts: number;
      latestReceivedAt: string | null;
      statuses: Record<string, number>;
      suspectedReason: string;
    }>;
    lateByProvider: Array<{
      provider: string;
      channelProvider: string | null;
      receipts: number;
      maxDelayMinutes: number;
      latestReceivedAt: string | null;
    }>;
  };
  stalePreview: Array<{
    integrationId: string;
    organizationId: string;
    provider: string;
    status: string;
    minutesSinceActivity: number;
    silenceThresholdMinutes: number;
    baselineReceipts: number;
    errorState: string | null;
  }>;
}

export interface PlatformRuntimeAlert {
  severity: "critical" | "warning" | "info";
  code: string;
  title: string;
  detail: string;
  runbook: string;
}

export interface PlatformOverviewResponse {
  generatedAt: string;
  stats: {
    organizations: number;
    degradedIntegrations: number;
    failedReceipts: number;
    failedOutbox: number;
    unresolvedReceipts: number;
  };
  runtime: {
    alerts: PlatformRuntimeAlert[];
    billing: {
      checkedAt: string;
      processing: number;
      staleProcessing: number;
      failed: number;
      skipped24h: number;
      processed24h: number;
      latestFailures: Array<{
        id: string;
        organizationId: string | null;
        providerEventId: string;
        providerEventType: string;
        errorMessage: string | null;
        updatedAt: string;
      }>;
    };
    dataLifecycle: {
      checkedAt: string;
      organizationId: string | null;
      policies: {
        operationalRetentionDays: number;
        billingRetentionDays: number;
        replayRetentionDays: number;
        integrationEventRetentionDays: number;
      };
      purgeable: {
        outboxEvents: number;
        webhookReceipts: number;
        billingEvents: number;
        replayAttempts: number;
        integrationEvents: number;
        total: number;
      };
      latestRuns: Array<{
        id: string;
        organizationId: string | null;
        dryRun: boolean;
        source: string;
        status: string;
        startedAt: string;
        completedAt: string | null;
        durationMs: number | null;
        errorMessage: string | null;
        resultJson: unknown;
      }>;
    };
    reconciliation: PlatformReconciliationSnapshot;
    projections: {
      checkedAt: string;
      conversations: number;
      conversationProjections: number;
      metricSnapshots: number;
      missingConversationProjections: number;
      staleConversationProjections: number;
    };
    recovery: PlatformRecoverySnapshot;
    queues: PlatformQueueHealthSnapshot;
    runbookHints: string[];
  };
  organizations: PlatformOrganizationSummary[];
  recentFailures: PlatformFailureItem[];
}

export interface PlatformTimelineItem {
  id: string;
  sourceId: string;
  kind: string;
  status: string;
  title: string;
  detail: string;
  correlationId: string | null;
  provider: string | null;
  externalEventId: string | null;
  occurredAt: string;
}

export interface PlatformReceiptSummary {
  id: string;
  provider: string;
  channelProvider: string | null;
  processingStatus: string;
  signatureStatus: string;
  externalEventId: string;
  correlationId: string;
  integrationId: string | null;
  receivedAt: string;
  occurredAt: string | null;
  firstProcessedAt: string | null;
  lastProcessedAt: string | null;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  payloadSummary: string | null;
  outboxEvents: Array<{
    id: string;
    eventName: string;
    status: string;
    aggregateType: string;
    aggregateId: string;
    dispatchedAt: string | null;
    attemptCount: number;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
  }>;
}

export interface PlatformIncidentDetail {
  receipt: {
    id: string;
    provider: string;
    channelProvider: string | null;
    processingStatus: string;
    signatureStatus: string;
    externalEventId: string;
    correlationId: string;
    receivedAt: string;
    occurredAt: string | null;
    retryCount: number;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    payloadJson: unknown;
  };
  outboxEvents: Array<{
    id: string;
    eventName: string;
    status: string;
    aggregateType: string;
    aggregateId: string;
    correlationId: string;
    occurredAt: string;
    dispatchedAt: string | null;
    attemptCount: number;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    payloadJson: unknown;
  }>;
  usageEvents: Array<{
    id: string;
    metric: string;
    quantity: number;
    occurredAt: string;
    sourceEntityType: string;
    sourceEntityId: string;
  }>;
  integrationEvents: Array<{
    id: string;
    provider: string;
    providerEventId: string;
    status: string;
    createdAt: string;
    processedAt: string | null;
    errorMessage: string | null;
  }>;
  replayAttempts: PlatformReplayAttempt[];
  relatedRecords: {
    contact: {
      id: string;
      displayName: string;
      phoneE164: string | null;
      emailLower: string | null;
      lifecycleStatus: string;
    } | null;
    contactIdentity: {
      id: string;
      provider: string;
      externalAccountId: string;
      externalContactId: string;
      externalThreadId: string;
    } | null;
    lead: {
      id: string;
      status: string;
      source: string;
      providerContactId: string;
      assignedTo: string | null;
      firstMessageAt: string;
    } | null;
    conversation: {
      id: string;
      provider: string;
      providerThreadId: string;
      status: string;
      lastMessageAt: string;
    } | null;
    message: {
      id: string;
      providerMessageId: string;
      direction: string;
      senderType: string;
      sentAt: string;
      text: string;
    } | null;
  };
}

export interface PlatformReplayAttempt {
  id: string;
  targetType: string;
  targetId: string;
  source: string;
  force: boolean;
  status: string;
  reason: string | null;
  requestedByUserId: string | null;
  correlationId: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  resultJson?: unknown;
}

export interface PlatformTenantDebugResponse {
  generatedAt: string;
  organization: {
    id: string;
    name: string;
    status: string;
    timezone: string;
    currency: string;
    averagePatientValue: number;
  };
  subscription: {
    plan: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    externalCustomerId: string;
    externalSubscriptionId: string;
  } | null;
  stats: {
    integrations: number;
    activeIntegrations: number;
    degradedIntegrations: number;
    receipts24h: number;
    inboundMessages24h: number;
    failedReceipts: number;
    failedOutbox: number;
    pendingOutbox: number;
  };
  runtime: {
    reconciliation: {
      checkedAt: string;
      staleIntegrations: number;
      lateReceipts24h: number;
      lateReceiptSamples: Array<{
        id: string;
        provider: string;
        channelProvider: string | null;
        externalEventId: string;
        receivedAt: string;
        occurredAt: string;
        delayMinutes: number;
        processingStatus: string;
      }>;
      failedReceipts24h: number;
      integrations: Array<{
        integrationId: string;
        provider: string;
        currentStatus: string;
        nextStatus: string;
        healthScore: number;
        errorState: string | null;
        isSilenceStale: boolean;
        minutesSinceActivity: number;
        silenceThresholdMinutes: number;
        baselineReceipts: number;
        lastSyncAt: string | null;
        lastReceiptAt: string | null;
      }>;
    };
    recovery: PlatformRecoverySnapshot;
    runbookHints: string[];
  };
  integrations: Array<{
    id: string;
    provider: string;
    status: string;
    externalAccountId: string;
    healthScore: number;
    errorState: string | null;
    lastSyncAt: string | null;
  }>;
  replayAttempts: PlatformReplayAttempt[];
  receipts: PlatformReceiptSummary[];
  timeline: PlatformTimelineItem[];
  selectedIncident: PlatformIncidentDetail | null;
}

export interface PlatformFailureDrillCatalogResponse {
  generatedAt: string;
  scenarios: Array<{
    scenario: string;
    provider: string;
    title: string;
    expectedSignal: string;
    destructive: boolean;
  }>;
}

export async function getPlatformOverviewData() {
  return fetchBackendAdminFromServer<PlatformOverviewResponse>(
    "/admin/overview",
    undefined,
    "super_admin",
  );
}

export async function getPlatformFailureDrillCatalogData() {
  return fetchBackendAdminFromServer<PlatformFailureDrillCatalogResponse>(
    "/admin/runtime/drills",
    undefined,
    "super_admin",
  );
}

export async function getPlatformTenantDebugData(
  organizationId: string,
  options?: {
    limit?: number;
    receiptId?: string;
  },
) {
  const params = new URLSearchParams();
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  if (options?.receiptId) {
    params.set("receiptId", options.receiptId);
  }

  const suffix = params.size ? `?${params}` : "";
  return fetchBackendAdminFromServer<PlatformTenantDebugResponse>(
    `/admin/organizations/${organizationId}/debug${suffix}`,
    undefined,
    "super_admin",
  );
}
