"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Role } from "@/domain/types";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";

const billingOnlyRoutes = ["/billing"];

function isOnboardingRoute(pathname: string): boolean {
  return billingOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export interface BillingLockPaymentDetails {
  amount: number;
  bankName?: string;
  currency: string;
  iban?: string;
  instructions?: string;
  isConfigured: boolean;
  missingFields?: string[];
  paymentReference: string;
  planLabel: string;
  recipientName?: string;
  supportEmail: string;
  swiftBic?: string;
}

export function SubscriptionGate({
  children,
  currentPeriodEnd,
  daysRemaining,
  hasWorkspaceAccess,
  lockPaymentDetails,
  paymentRequired,
  planLabel,
  role,
  status,
}: {
  children: ReactNode;
  currentPeriodEnd?: string;
  daysRemaining: number;
  hasWorkspaceAccess: boolean;
  lockPaymentDetails?: BillingLockPaymentDetails;
  paymentRequired: boolean;
  planLabel: string;
  role?: Role;
  status: string;
}) {
  const pathname = usePathname();
  const languageCode = useCurrentLanguageCode();

  if (hasWorkspaceAccess || !paymentRequired || isOnboardingRoute(pathname)) {
    return children;
  }

  const canViewBillingDetails = role === "owner" || role === "admin" || role === "super_admin";

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
            {canViewBillingDetails
              ? "Your trial or billing period has ended. Workspace data is locked immediately; billing remains open so an owner can activate the plan."
              : "Workspace data is locked because billing requires an owner or admin. Ask the billing owner to activate the plan from the account hub."}
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
          {canViewBillingDetails && lockPaymentDetails ? (
            <div className="subscription-lock-payment">
              {lockPaymentDetails.isConfigured ? (
                <>
                  <span>Manual bank transfer</span>
                  <dl>
                    <div>
                      <dt>Recipient</dt>
                      <dd>{lockPaymentDetails.recipientName}</dd>
                    </div>
                    <div>
                      <dt>IBAN</dt>
                      <dd>{lockPaymentDetails.iban}</dd>
                    </div>
                    <div>
                      <dt>SWIFT/BIC</dt>
                      <dd>{lockPaymentDetails.swiftBic || "Contact billing"}</dd>
                    </div>
                    <div>
                      <dt>Amount</dt>
                      <dd>
                        {lockPaymentDetails.currency} {lockPaymentDetails.amount}
                      </dd>
                    </div>
                    <div>
                      <dt>Reference</dt>
                      <dd>{lockPaymentDetails.paymentReference}</dd>
                    </div>
                  </dl>
                  <p>{lockPaymentDetails.instructions}</p>
                </>
              ) : (
                <>
                  <span>Billing configuration required</span>
                  <p>
                    Bank transfer details are not configured yet. Missing:{" "}
                    {(lockPaymentDetails.missingFields ?? []).join(", ") || "manual billing envs"}.
                    Contact {lockPaymentDetails.supportEmail}.
                  </p>
                </>
              )}
            </div>
          ) : null}
          <div className="subscription-lock-actions">
            <Link className="primary-button" href="/billing">
              <CreditCard size={16} />
              <LocalizedText k="workspace.lock.openBilling" />
            </Link>
            <Link className="secondary-button" href="/workspaces">
              <ShieldCheck size={16} />
              Account hub
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
