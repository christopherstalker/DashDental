import type { Integration, IntegrationEvent, IntegrationStatus, Provider } from "@/domain/types";

export type OperationalTone = "live" | "setup" | "attention" | "offline";

export interface IntegrationOperationalState {
  eventSummary: string;
  failedEvents: number;
  lastActivityLabel: string;
  nextAction: string;
  processedEvents: number;
  reliabilityLabel: string;
  statusLabel: string;
  tone: OperationalTone;
  totalEvents: number;
}

const providerLabels: Record<Provider, string> = {
  clinic_database: "Clinic DB",
  instagram: "Instagram",
  phone: "Phone",
  telegram: "Telegram",
  web_form: "Website form",
  whatsapp: "WhatsApp",
};

function eventTime(event: Pick<IntegrationEvent, "createdAt" | "processedAt">): number {
  const parsed = Date.parse(event.processedAt ?? event.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRelativeTime(iso?: string, nowMs = Date.now()): string {
  if (!iso) {
    return "No activity yet";
  }

  const value = Date.parse(iso);
  if (!Number.isFinite(value)) {
    return "Unknown";
  }

  const minutes = Math.max(0, Math.round((nowMs - value) / 60000));
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function toneForStatus(status: IntegrationStatus | "not_created"): OperationalTone {
  if (status === "active") {
    return "live";
  }
  if (status === "degraded") {
    return "attention";
  }
  if (status === "disconnected") {
    return "offline";
  }

  return "setup";
}

function statusLabelFor(input: {
  integration?: Integration;
  status: IntegrationStatus | "not_created";
  failedEvents: number;
}): string {
  if (input.status === "active" && input.failedEvents === 0) {
    return "Live and healthy";
  }
  if (input.status === "active") {
    return "Live with recent warnings";
  }
  if (input.status === "degraded") {
    return "Needs attention";
  }
  if (input.status === "disconnected") {
    return "Disconnected";
  }
  if (input.integration?.encryptedCredentials) {
    return "Credentials saved, awaiting test";
  }

  return "Setup required";
}

function nextActionFor(input: {
  provider: Provider;
  integration?: Integration;
  status: IntegrationStatus | "not_created";
  failedEvents: number;
  totalEvents: number;
}): string {
  if (input.status === "active" && input.failedEvents === 0 && input.totalEvents > 0) {
    return "Keep monitoring weekly and run a test before campaigns.";
  }
  if (input.status === "active") {
    return "Review failed events, then send a fresh test lead.";
  }
  if (input.status === "degraded") {
    return input.integration?.errorState ?? "Fix provider credentials or webhook delivery.";
  }
  if (input.status === "disconnected") {
    return `Reconnect ${providerLabels[input.provider]} before routing patient traffic.`;
  }
  if (input.integration?.encryptedCredentials) {
    return "Send a test event and confirm it appears in Inbox and Dashboard.";
  }

  return `Add ${providerLabels[input.provider]} credentials and save the connection.`;
}

export function buildIntegrationOperationalState(input: {
  events: IntegrationEvent[];
  integration?: Integration;
  nowMs?: number;
  provider: Provider;
}): IntegrationOperationalState {
  const scopedEvents = input.events
    .filter((event) => event.provider === input.provider)
    .toSorted((left, right) => eventTime(right) - eventTime(left));
  const processedEvents = scopedEvents.filter((event) => event.status === "processed").length;
  const failedEvents = scopedEvents.filter(
    (event) => event.status === "failed" || event.status === "dead_letter",
  ).length;
  const status = input.integration?.status ?? "not_created";
  const totalEvents = scopedEvents.length;
  const latestEvent = scopedEvents.at(0);
  const lastActivityIso = input.integration?.lastSyncAt ?? latestEvent?.processedAt ?? latestEvent?.createdAt;
  const reliability = totalEvents ? Math.round((processedEvents / totalEvents) * 100) : undefined;
  const failedSuffix = failedEvents ? `, ${failedEvents} failed` : "";

  return {
    eventSummary: totalEvents
      ? `${processedEvents}/${totalEvents} processed${failedSuffix}`
      : "No events received",
    failedEvents,
    lastActivityLabel: formatRelativeTime(lastActivityIso, input.nowMs),
    nextAction: nextActionFor({
      failedEvents,
      integration: input.integration,
      provider: input.provider,
      status,
      totalEvents,
    }),
    processedEvents,
    reliabilityLabel: reliability === undefined ? "No traffic yet" : `${reliability}% reliable`,
    statusLabel: statusLabelFor({
      failedEvents,
      integration: input.integration,
      status,
    }),
    tone: failedEvents > 0 && status === "active" ? "attention" : toneForStatus(status),
    totalEvents,
  };
}
