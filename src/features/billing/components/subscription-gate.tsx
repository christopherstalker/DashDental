"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LockKeyhole, Plug, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";

const onboardingRoutes = ["/billing", "/setup", "/integrations"];

function isOnboardingRoute(pathname: string): boolean {
  return onboardingRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function SubscriptionGate({
  children,
  currentPeriodEnd,
  daysRemaining,
  hasWorkspaceAccess,
  paymentRequired,
  planLabel,
  status,
}: {
  children: ReactNode;
  currentPeriodEnd?: string;
  daysRemaining: number;
  hasWorkspaceAccess: boolean;
  paymentRequired: boolean;
  planLabel: string;
  status: string;
}) {
  const pathname = usePathname();
  const languageCode = useCurrentLanguageCode();

  if (hasWorkspaceAccess || !paymentRequired || isOnboardingRoute(pathname)) {
    return children;
  }

  return (
    <section className="view-grid subscription-lock-view">
      <section className="subscription-lock-card">
        <div className="subscription-lock-orbit" aria-hidden="true">
          <span />
        </div>
        <div className="subscription-lock-copy">
          <p className="eyebrow">
            <LocalizedText k="workspace.lock.eyebrow" />
          </p>
          <h1>
            <LocalizedText
              k={
                status === "expired"
                  ? "workspace.lock.expiredTitle"
                  : "workspace.lock.activateTitle"
              }
            />
          </h1>
          <p>
            <LocalizedText k="workspace.lock.setupOpen" />
          </p>
          <p className="subscription-lock-period">{planLabel}</p>
          {status !== "expired" && currentPeriodEnd ? (
            <p className="subscription-lock-period">
              <LocalizedText k="workspace.lock.currentPeriodEnds" />{" "}
              {formatPeriodDate(currentPeriodEnd, languageCode)}.
              {daysRemaining > 0
                ? ` ${daysRemaining} ${translate(
                    daysRemaining === 1
                      ? "dashboard.unit.daySingular"
                      : "dashboard.unit.dayPlural",
                    languageCode,
                  )} ${translate("dashboard.billing.remaining", languageCode)}.`
                : ""}
            </p>
          ) : null}
          <div className="subscription-lock-actions">
            <Link className="primary-button" href="/billing">
              <CreditCard size={16} />
              <LocalizedText k="workspace.lock.openBilling" />
            </Link>
            <Link className="secondary-button" href="/integrations">
              <Plug size={16} />
              <LocalizedText k="workspace.lock.prepareIntegrations" />
            </Link>
          </div>
        </div>
        <div className="subscription-lock-proof">
          <div>
            <LockKeyhole size={17} />
            <span>
              <LocalizedText k="workspace.lock.proofLockedLabel" />
            </span>
            <strong>
              <LocalizedText k="workspace.lock.proofLockedTitle" />
            </strong>
          </div>
          <div>
            <ShieldCheck size={17} />
            <span>
              <LocalizedText k="workspace.lock.proofOpenLabel" />
            </span>
            <strong>
              <LocalizedText k="workspace.lock.proofOpenTitle" />
            </strong>
          </div>
        </div>
      </section>
    </section>
  );
}

function formatPeriodDate(iso: string, languageCode: string): string {
  return new Intl.DateTimeFormat(languageCode, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}
