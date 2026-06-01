"use client";

import type { LeadStatus, Provider } from "@/domain/types";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import {
  type TranslationKey,
  translate,
} from "@/features/i18n/translations";

type RiskLevel = "clear" | "watch" | "high" | "critical";

const providerKeys: Record<Provider, TranslationKey> = {
  clinic_database: "dashboard.provider.clinicDatabase",
  instagram: "dashboard.provider.instagram",
  phone: "dashboard.provider.phone",
  telegram: "dashboard.provider.telegram",
  web_form: "dashboard.provider.webForm",
  whatsapp: "dashboard.provider.whatsapp",
};

const statusKeys: Record<LeadStatus, TranslationKey> = {
  at_risk: "dashboard.status.atRisk",
  booked: "dashboard.status.booked",
  in_conversation: "dashboard.status.inConversation",
  lost: "dashboard.status.lost",
  new: "dashboard.status.new",
  unanswered: "dashboard.status.unanswered",
};

const riskKeys: Record<RiskLevel, TranslationKey> = {
  clear: "dashboard.risk.clear",
  critical: "dashboard.risk.critical",
  high: "dashboard.risk.high",
  watch: "dashboard.risk.watch",
};

function pluralKey(count: number, singular: TranslationKey, plural: TranslationKey) {
  return count === 1 ? singular : plural;
}

function formatLocalizedDuration(minutes: number, languageCode: string) {
  const minuteUnit = translate("dashboard.unit.minuteShort", languageCode);
  const hourUnit = translate("dashboard.unit.hourShort", languageCode);
  const dayUnit = translate("dashboard.unit.dayShort", languageCode);

  if (minutes < 60) {
    return `${minutes} ${minuteUnit}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hourUnit} ${minutes % 60} ${minuteUnit}`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return `${days} ${dayUnit} ${restHours} ${hourUnit}`;
}

function formatDate(iso: string, languageCode: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(languageCode, options).format(new Date(iso));
}

export function LocalizedProviderName({ provider }: { provider: Provider }) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span suppressHydrationWarning>
      {translate(providerKeys[provider], languageCode)}
    </span>
  );
}

export function LocalizedLeadStatus({ status }: { status: LeadStatus }) {
  const languageCode = useCurrentLanguageCode();

  return <span suppressHydrationWarning>{translate(statusKeys[status], languageCode)}</span>;
}

export function LocalizedDuration({ minutes }: { minutes: number }) {
  const languageCode = useCurrentLanguageCode();

  return <span suppressHydrationWarning>{formatLocalizedDuration(minutes, languageCode)}</span>;
}

export function LocalizedPatientQueueMeta({
  messageCount,
  provider,
  waitingMinutes,
}: {
  messageCount: number;
  provider: Provider;
  waitingMinutes: number;
}) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span suppressHydrationWarning>
      <LocalizedProviderName provider={provider} /> {" - "}
      <LocalizedDuration minutes={waitingMinutes} />{" "}
      {translate("dashboard.queue.waiting", languageCode)} {" - "}
      {messageCount}{" "}
      {translate(
        pluralKey(
          messageCount,
          "dashboard.unit.messageSingular",
          "dashboard.unit.messagePlural",
        ),
        languageCode,
      )}
    </span>
  );
}

export function LocalizedRiskLabel({ risk }: { risk: RiskLevel }) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span suppressHydrationWarning>
      {translate(riskKeys[risk], languageCode)} {translate("dashboard.queue.risk", languageCode)}
    </span>
  );
}

export function LocalizedChannelLeakageMeta({
  atRisk,
  lostRevenue,
  total,
}: {
  atRisk: number;
  lostRevenue: string;
  total: number;
}) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span suppressHydrationWarning>
      {total}{" "}
      {translate(
        pluralKey(total, "dashboard.unit.leadSingular", "dashboard.unit.leadPlural"),
        languageCode,
      )}{" "}
      - {atRisk} {translate("dashboard.channel.atRisk", languageCode)} - {lostRevenue}{" "}
      {translate("dashboard.channel.lost", languageCode)}
    </span>
  );
}

export function LocalizedInboxPreviewMeta({
  messageCount,
  provider,
}: {
  messageCount: number;
  provider: Provider;
}) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span suppressHydrationWarning>
      <LocalizedProviderName provider={provider} /> {" - "}
      {messageCount}{" "}
      {translate(
        pluralKey(
          messageCount,
          "dashboard.unit.messageSingular",
          "dashboard.unit.messagePlural",
        ),
        languageCode,
      )}
    </span>
  );
}

export function LocalizedCalendarMonth({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const languageCode = useCurrentLanguageCode();
  const date = new Date(Date.UTC(year, month - 1, 1, 12));

  return (
    <span suppressHydrationWarning>
      {new Intl.DateTimeFormat(languageCode, {
        month: "long",
        year: "numeric",
      }).format(date)}
    </span>
  );
}

export function LocalizedWeekday({ weekdayIndex }: { weekdayIndex: number }) {
  const languageCode = useCurrentLanguageCode();
  const date = new Date(Date.UTC(2026, 0, 4 + weekdayIndex, 12));

  return (
    <span suppressHydrationWarning>
      {new Intl.DateTimeFormat(languageCode, { weekday: "short" }).format(date)}
    </span>
  );
}

export function LocalizedCompactDateTime({ iso }: { iso: string }) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span suppressHydrationWarning>
      {formatDate(iso, languageCode, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      })}
    </span>
  );
}

export function LocalizedBillingCalendarStatus({
  accessActive,
  daysRemaining,
  hasSubscription,
  periodEndIso,
  subscriptionActive,
  subscriptionTrialActive,
}: {
  accessActive: boolean;
  daysRemaining: number;
  hasSubscription: boolean;
  periodEndIso: string;
  subscriptionActive: boolean;
  subscriptionTrialActive: boolean;
}) {
  const languageCode = useCurrentLanguageCode();
  const periodEndLabel = periodEndIso
    ? formatDate(periodEndIso, languageCode, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const daysLabel = `${daysRemaining} ${translate(
    pluralKey(daysRemaining, "dashboard.unit.daySingular", "dashboard.unit.dayPlural"),
    languageCode,
  )}`;
  const titleKey = subscriptionTrialActive
    ? "dashboard.billing.freeTrialActive"
    : subscriptionActive
      ? "dashboard.billing.billingCountdownActive"
      : accessActive
        ? "dashboard.billing.demoAccessActive"
        : "dashboard.billing.billingLockActive";

  let detail = translate("dashboard.billing.noBillingPeriod", languageCode);
  if (hasSubscription && subscriptionActive && subscriptionTrialActive) {
    detail = `${translate("dashboard.billing.freeTrialEnds", languageCode)} ${periodEndLabel}; ${daysLabel} ${translate("dashboard.billing.remaining", languageCode)}.`;
  } else if (hasSubscription && subscriptionActive) {
    detail = `${translate("dashboard.billing.workspaceLocksAt", languageCode)} ${periodEndLabel}; ${daysLabel} ${translate("dashboard.billing.remaining", languageCode)}.`;
  } else if (hasSubscription && accessActive) {
    detail = translate("dashboard.billing.demoAccessOpen", languageCode);
  } else if (hasSubscription) {
    detail = `${translate("dashboard.billing.workspaceLocked", languageCode)} ${periodEndLabel}.`;
  }

  return (
    <>
      <strong suppressHydrationWarning>{translate(titleKey, languageCode)}</strong>
      <span suppressHydrationWarning>{detail}</span>
    </>
  );
}

export type OwnerBriefItem =
  | { count: number; type: "unanswered" }
  | { count: number; type: "pastSla" }
  | { provider?: Provider; type: "channel" }
  | { type: "value"; value: string };

export function LocalizedOwnerBriefLine({ item }: { item: OwnerBriefItem }) {
  const languageCode = useCurrentLanguageCode();

  if (item.type === "unanswered") {
    return (
      <span suppressHydrationWarning>
        {item.count}{" "}
        {translate(
          pluralKey(item.count, "dashboard.unit.leadSingular", "dashboard.unit.leadPlural"),
          languageCode,
        )}{" "}
        {translate("dashboard.ownerBrief.unansweredAction", languageCode)}
      </span>
    );
  }

  if (item.type === "pastSla") {
    return (
      <span suppressHydrationWarning>
        {item.count}{" "}
        {translate(
          pluralKey(item.count, "dashboard.unit.leadSingular", "dashboard.unit.leadPlural"),
          languageCode,
        )}{" "}
        {translate("dashboard.ownerBrief.pastSla", languageCode)}
      </span>
    );
  }

  if (item.type === "channel") {
    return (
      <span suppressHydrationWarning>
        {item.provider ? (
          <LocalizedProviderName provider={item.provider} />
        ) : (
          translate("dashboard.ownerBrief.noChannel", languageCode)
        )}{" "}
        {translate("dashboard.ownerBrief.inspectFirst", languageCode)}
      </span>
    );
  }

  return (
    <span suppressHydrationWarning>
      {translate("dashboard.ownerBrief.openRecoverableValue", languageCode)} {item.value};{" "}
      {translate("dashboard.ownerBrief.protectBeforeSpend", languageCode)}
    </span>
  );
}
