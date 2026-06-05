export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  CreditCard,
  Gauge,
  Plug,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  canAccess,
  formatCurrency,
  getSubscriptionDaysRemaining,
  getPlanCatalog,
  getPlanLimits,
  getSubscriptionAccessStatus,
  isSubscriptionAccessActive,
  isSubscriptionPaidActive,
} from "@/domain/business-rules";
import type { Subscription, UsageLimits } from "@/domain/types";
import {
  buildManualInvoiceSummary,
  getBillingProvider,
  getManualBillingDetails,
  getManualBillingMissingFields,
  getOnlineBillingProvider,
  getOnlineBillingProviderLabel,
  isManualBillingConfigured,
  shouldShowManualBilling,
} from "@/server/manual-billing";
import { isPaddleCheckoutConfigured } from "@/server/paddle";
import { isStripeConfigured } from "@/server/stripe";
import { BillingActionButton } from "@/features/billing/components/billing-action-button";
import { ManualInvoiceButton } from "@/features/billing/components/manual-invoice-button";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { PageHeader } from "@/features/design-system/components/page-header";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { getWorkspaceShellBootstrap } from "@/features/app-shell/data/workspace-bootstrap";

const plans: Subscription["plan"][] = ["starter", "growth", "scale"];
const publicPricingUrl = "https://dashdental.space/pricing";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[]; checkout?: string | string[]; plan?: string | string[] }>;
}) {
  const bootstrap = await getWorkspaceShellBootstrap("owner");
  const hasAccess = bootstrap.session ? canAccess("owner", bootstrap.session.role) : false;

  if (!hasAccess) {
    return <BillingAccessRequired />;
  }

  const organization = bootstrap.organization;
  const subscription =
    bootstrap.state.subscriptions.find((item) => item.organizationId === organization.id) ??
    createFallbackSubscription(organization.id);
  const activePlan = subscription.plan;
  const usage =
    bootstrap.state.usageLimits.find((item) => item.organizationId === organization.id) ??
    createFallbackUsage(organization.id, activePlan);
  const activeIntegrations = bootstrap.state.integrations.filter(
    (integration) =>
      integration.organizationId === organization.id && integration.status === "active",
  ).length;
  const billingProvider = getBillingProvider();
  const onlineBillingProvider = getOnlineBillingProvider();
  const onlineBillingProviderLabel = getOnlineBillingProviderLabel();
  const onlineBillingConfigured =
    onlineBillingProvider === "paddle"
      ? isPaddleCheckoutConfigured()
      : onlineBillingProvider === "stripe"
        ? isStripeConfigured()
        : false;
  const manualBillingDetails = getManualBillingDetails();
  const manualBillingConfigured = isManualBillingConfigured(manualBillingDetails);
  const manualBillingMissingFields = getManualBillingMissingFields(manualBillingDetails);
  const manualBillingVisible = shouldShowManualBilling();
  const canUseOnlineCheckout = Boolean(onlineBillingProvider && onlineBillingConfigured);
  const canUseManualBilling = manualBillingVisible && manualBillingConfigured;
  const callbackParams = await searchParams;
  const checkoutStatus = readQueryParam(callbackParams.checkout);
  const checkoutPlan = readQueryParam(callbackParams.plan);
  const portalStatus = readQueryParam(callbackParams.billing);
  const manualInvoice = buildManualInvoiceSummary({
    organization,
    plan: activePlan,
    details: manualBillingDetails,
  });
  const hasLiveOnlineCustomer = Boolean(
    subscription.externalCustomerId &&
      (onlineBillingProvider === "paddle"
        ? subscription.externalCustomerId.startsWith("ctm_")
        : !subscription.externalCustomerId.startsWith("cus_demo")),
  );
  const planCatalog = getPlanCatalog(activePlan);
  const nowIso = new Date().toISOString();
  const subscriptionAccessActive = isSubscriptionAccessActive(subscription, nowIso);
  const subscriptionPaidActive = isSubscriptionPaidActive(subscription, nowIso);
  const subscriptionAccessStatus = getSubscriptionAccessStatus(subscription, nowIso);
  const subscriptionDaysRemaining = getSubscriptionDaysRemaining(subscription, nowIso);
  const subscriptionDaysLabel = (
    <>
      {subscriptionDaysRemaining}{" "}
      <LocalizedText
        k={
          subscriptionDaysRemaining === 1
            ? "dashboard.unit.daySingular"
            : "dashboard.unit.dayPlural"
        }
      />
    </>
  );
  const subscriptionTrialActive = subscriptionAccessActive && subscriptionAccessStatus === "trialing";
  const estimatedRecoveredRevenue = organization.averagePatientValue * 8;
  const usageLines = [
    {
      icon: Users,
      label: "Seats used",
      labelKey: "billing.usage.seats",
      limit: usage.maxUsers,
      value: usage.periodUsageJson.users,
    },
    {
      icon: Plug,
      label: "Integrations",
      labelKey: "billing.usage.integrations",
      limit: usage.maxIntegrations,
      value: activeIntegrations,
    },
    {
      icon: Gauge,
      label: "Messages",
      labelKey: "billing.usage.messages",
      limit: usage.monthlyMessages,
      value: usage.periodUsageJson.messages,
    },
    {
      icon: Sparkles,
      label: "AI runs",
      labelKey: "billing.usage.aiRuns",
      limit: usage.monthlyAiRuns,
      value: usage.periodUsageJson.aiRuns,
    },
  ] satisfies Array<{
    icon: LucideIcon;
    label: string;
    labelKey: TranslationKey;
    limit: number;
    value: number;
  }>;

  return (
    <section className="view-grid billing-grid">
      <PageHeader
        actions={
          <div className="notice">
            <ShieldCheck size={16} />
            <span>
              {subscription.status} - {planCatalog.label}
            </span>
          </div>
        }
        description={<LocalizedText k="billing.header.description" />}
        eyebrow={<LocalizedText k="billing.header.eyebrow" />}
        title={<LocalizedText k="billing.header.title" />}
      />

      {checkoutStatus || portalStatus ? (
        <div
          className={`compact-alert aligned-left ${
            checkoutStatus === "cancelled" ? "warning" : "info"
          }`}
        >
          <CreditCard size={16} />
          <span>
            {checkoutStatus === "success"
              ? `Checkout completed for ${checkoutPlan ?? "selected"} plan. ${onlineBillingProviderLabel} webhook will activate the subscription after payment confirmation.`
              : checkoutStatus === "cancelled"
                ? "Checkout was cancelled. You can retry card checkout or use the bank-transfer invoice path."
                : "Billing portal closed. Subscription changes are reflected after provider confirmation."}
          </span>
        </div>
      ) : null}

      <section className="dashboard-command">
        <div>
          <p className="eyebrow">
            <LocalizedText k="billing.command.kicker" />
          </p>
          <strong>
            {planCatalog.label} <LocalizedText k="billing.common.plan" /> ${planCatalog.monthlyPrice}/
            <LocalizedText k="billing.common.monthShort" />.{" "}
            <LocalizedText k="billing.command.cover" />
          </strong>
          <p className="blueprint-copy">
            <LocalizedText k="billing.command.target" />{" "}
            {formatCurrency(estimatedRecoveredRevenue, organization)}.
          </p>
        </div>
        <div className="dashboard-command-actions">
          {canUseOnlineCheckout ? (
            <BillingActionButton
              className="primary-button"
              disabled={subscriptionPaidActive}
              label={
                subscriptionPaidActive ? (
                  <LocalizedText k="billing.action.planActive" />
                ) : (
                  <LocalizedText k="billing.action.launchCheckout" />
                )
              }
              mode="checkout"
              organizationId={organization.id}
              plan={activePlan}
            />
          ) : null}
          {manualBillingVisible ? (
            <ManualInvoiceButton
              className={canUseOnlineCheckout ? "secondary-button" : "primary-button"}
              disabled={!canUseManualBilling || subscriptionPaidActive}
              label={
                subscriptionPaidActive ? (
                  <LocalizedText k="billing.action.planActive" />
                ) : subscriptionTrialActive ? (
                  <LocalizedText k="billing.action.startPaidPlan" />
                ) : (
                  <LocalizedText k="billing.action.requestInvoice" />
                )
              }
              organizationId={organization.id}
              plan={activePlan}
            />
          ) : !canUseOnlineCheckout ? (
            <BillingActionButton
              className="primary-button"
              disabled={!onlineBillingConfigured || !hasLiveOnlineCustomer}
              label="Manage billing"
              mode="portal"
              organizationId={organization.id}
            />
          ) : null}
          {!manualBillingVisible && subscriptionPaidActive && hasLiveOnlineCustomer ? (
            <BillingActionButton
              className="secondary-button"
              label="Manage billing"
              mode="portal"
              organizationId={organization.id}
            />
          ) : null}
          <Link className="secondary-button" href={publicPricingUrl}>
            <LocalizedText k="billing.action.publicPricing" />
          </Link>
        </div>
      </section>

      <SurfaceCard
        description="Every new clinic starts with a 14-day free trial. When the period ends, inbox, dashboard, integrations, AI, exports, and settings lock immediately until a paid plan is active."
        eyebrow="Trial and payment"
        title="Free for 14 days, then Dash Dental is paid."
        wide
      >
        <div className="billing-purchase-flow">
          <div className="billing-value-note">
            <strong>Current payment route</strong>
            <p>
              Owners can start a paid plan from this Billing page before the trial expires.{" "}
              {onlineBillingProviderLabel} checkout is the self-serve path; manual bank transfer
              remains available when the release mode includes invoice fallback.
            </p>
          </div>
          <div className="billing-status-card manual-bank-card">
            <InfoLine
              label="Trial"
              value={
                subscriptionTrialActive
                  ? `${subscriptionDaysRemaining} days left`
                  : subscriptionAccessStatus === "expired"
                    ? "Expired - billing only"
                    : subscriptionAccessStatus.replaceAll("_", " ")
              }
            />
            <InfoLine label="Monthly amount" value={`${manualInvoice.currency} ${manualInvoice.amount}`} />
            <InfoLine label="Plan" value={manualInvoice.planLabel} />
            <InfoLine label="Payment reference" value={manualInvoice.paymentReference} />
          </div>
          <div className="billing-payment-steps">
            <span>1. Choose plan</span>
            <span>2. Request invoice or pay by bank transfer</span>
            <span>3. Platform admin confirms payment</span>
            <span>4. Workspace unlocks for the paid period</span>
          </div>
          <div className="dashboard-command-actions">
            {canUseOnlineCheckout ? (
              <BillingActionButton
                className="primary-button"
                disabled={subscriptionPaidActive}
                label={
                  subscriptionPaidActive ? (
                    <LocalizedText k="billing.action.planActive" />
                  ) : (
                    "Pay by card"
                  )
                }
                mode="checkout"
                organizationId={organization.id}
                plan={activePlan}
              />
            ) : null}
            {manualBillingVisible ? (
              <ManualInvoiceButton
                className={canUseOnlineCheckout ? "secondary-button" : "primary-button"}
                disabled={!canUseManualBilling || subscriptionPaidActive}
                label={
                  subscriptionPaidActive ? (
                    <LocalizedText k="billing.action.planActive" />
                  ) : (
                    "Start paid subscription"
                  )
                }
                organizationId={organization.id}
                plan={activePlan}
              />
            ) : !canUseOnlineCheckout ? (
              <BillingActionButton
                className="primary-button"
                disabled={!onlineBillingConfigured}
                label="Launch checkout"
                mode="checkout"
                organizationId={organization.id}
                plan={activePlan}
              />
            ) : null}
            <Link className="secondary-button" href={publicPricingUrl}>
              Compare plans
            </Link>
          </div>
        </div>
      </SurfaceCard>

      <div className="metrics-row">
        <MetricTile
          icon={CreditCard}
          label={<LocalizedText k="billing.metric.method" />}
          subtitle={
            subscriptionTrialActive
              ? <><LocalizedText k="billing.metric.freeTrialEnds" /> {subscriptionDaysLabel}</>
              : subscriptionAccessActive
                ? <>{subscriptionDaysLabel} <LocalizedText k="billing.metric.beforeLock" /></>
                : <><LocalizedText k="billing.metric.lockedAfter" /> {formatDate(subscription.currentPeriodEnd)}</>
          }
          value={manualBillingVisible ? <LocalizedText k="billing.metric.bankTransfer" /> : onlineBillingProviderLabel}
        />
        <MetricTile
          icon={CircleDollarSign}
          label={<LocalizedText k="billing.metric.monthlyPrice" />}
          subtitle={
            planCatalog.onboardingFee > 0
              ? <><LocalizedText k="billing.common.onboardingFrom" /> ${planCatalog.onboardingFee}</>
              : <LocalizedText k="billing.metric.onboardingIncluded" />
          }
          value={`$${planCatalog.monthlyPrice}`}
        />
        <MetricTile
          icon={Plug}
          label={<LocalizedText k="billing.metric.liveChannels" />}
          subtitle={<>{usage.maxIntegrations} <LocalizedText k="billing.metric.allowed" /></>}
          tone={activeIntegrations >= usage.maxIntegrations ? "warning" : "neutral"}
          value={`${activeIntegrations}/${usage.maxIntegrations}`}
        />
        <MetricTile
          icon={Sparkles}
          label={<LocalizedText k="billing.metric.aiUsage" />}
          subtitle={<LocalizedText k="billing.metric.includedRuns" />}
          tone={usage.periodUsageJson.aiRuns / usage.monthlyAiRuns >= 0.8 ? "warning" : "neutral"}
          value={`${usage.periodUsageJson.aiRuns}/${usage.monthlyAiRuns}`}
        />
      </div>

      <section className="radar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <LocalizedText k="billing.section.current" />
            </p>
            <h2>
              {planCatalog.label} <LocalizedText k="billing.common.plan" />
            </h2>
            <p className="blueprint-copy">
              <LocalizedText k={getPlanSummaryKey(activePlan)} />
            </p>
          </div>
          <span className={`status-dot ${subscriptionAccessStatus}`}>
            {subscriptionAccessStatus}
          </span>
        </div>
        <div className="billing-status-card">
          <div className="billing-price-lockup">
            <strong>
              ${planCatalog.monthlyPrice}/<LocalizedText k="billing.common.monthShort" />
            </strong>
            <span>
              {formatCurrency(estimatedRecoveredRevenue, organization)}{" "}
              <LocalizedText k="billing.common.targetRecovery" />{" "}
              {formatCurrency(planCatalog.monthlyPrice, organization)}{" "}
              <LocalizedText k="billing.common.monthlyCost" />
          </span>
        </div>
          <InfoLine
            label={<LocalizedText k="billing.section.provider" />}
            value={
              manualBillingVisible ? (
                <>IBAN / SWIFT <LocalizedText k="billing.metric.bankTransfer" /></>
              ) : (
                `${onlineBillingProviderLabel} Billing`
              )
            }
          />
          {manualBillingVisible ? (
            <>
              <InfoLine label={<LocalizedText k="billing.section.paymentReference" />} value={manualInvoice.paymentReference} />
              <InfoLine label={<LocalizedText k="billing.section.recipient" />} value={manualBillingDetails.recipientName || <LocalizedText k="common.status.notConfigured" />} />
              <InfoLine label="IBAN" value={manualBillingDetails.iban || <LocalizedText k="common.status.notConfigured" />} />
              <InfoLine label="SWIFT / BIC" value={manualBillingDetails.swiftBic || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.section.bank" />} value={manualBillingDetails.bankName || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.manual.correspondentBank" />} value={manualBillingDetails.correspondentBank || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.manual.intermediaryBank" />} value={manualBillingDetails.intermediaryBank || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.section.support" />} value={manualBillingDetails.supportEmail} />
            </>
          ) : (
            <InfoLine label={`${onlineBillingProviderLabel} customer`} value={hasLiveOnlineCustomer ? subscription.externalCustomerId : <LocalizedText k="billing.common.notConnected" />} />
          )}
          <InfoLine label={<LocalizedText k="billing.section.currentPeriod" />} value={`${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`} />
          <InfoLine label={<LocalizedText k="billing.section.billingStatus" />} value={subscriptionAccessStatus.replaceAll("_", " ")} />
          <InfoLine
            label={<LocalizedText k="billing.section.dashboardLock" />}
            value={
              subscriptionTrialActive
                ? <>{subscriptionDaysLabel} <LocalizedText k="billing.section.freeTrialRemaining" /></>
                : subscriptionAccessActive
                  ? <>{subscriptionDaysLabel} <LocalizedText k="billing.section.remaining" /></>
                : <LocalizedText k="billing.section.lockedUntilRenewal" />
            }
          />
          {manualBillingVisible && !manualBillingConfigured ? (
            <div className="limit-alert warning">
              <AlertTriangle size={16} />
              <span>
                <LocalizedText k="billing.common.manualBillingEnvWarning" />
                {manualBillingMissingFields.length > 0 ? ` (${manualBillingMissingFields.join(", ")})` : ""}
              </span>
            </div>
          ) : null}
          {!manualBillingVisible && !onlineBillingConfigured ? (
            <div className="limit-alert warning">
              <AlertTriangle size={16} />
              <span>
                Configure {onlineBillingProviderLabel} API key, client token, webhook secret, and price IDs before enabling self-serve checkout.
              </span>
            </div>
          ) : null}
        </div>
        <div className="usage-list">
          {usageLines.map((line) => (
            <UsageLine
              key={line.label}
              label={<LocalizedText k={line.labelKey} />}
              limit={line.limit}
              value={line.value}
            />
          ))}
        </div>
      </section>

      {manualBillingVisible ? (
        <SurfaceCard
          description={<LocalizedText k="billing.manual.description" />}
          eyebrow={<LocalizedText k="billing.manual.eyebrow" />}
          title={<LocalizedText k="billing.manual.title" />}
          wide
        >
          <div className="manual-billing-grid">
            <div className="billing-value-note">
              <strong>
                {manualInvoice.amount} {manualInvoice.currency} / <LocalizedText k="billing.manual.month" /> - {planCatalog.label}
              </strong>
              <p>
                {manualBillingDetails.instructions ===
                "Send a bank transfer using the payment reference. Access is activated after payment confirmation." ? (
                  <LocalizedText k="billing.manual.instructionsFallback" />
                ) : (
                  manualBillingDetails.instructions
                )}
              </p>
              <p>
                <LocalizedText k="billing.section.paymentReference" />: <code>{manualInvoice.paymentReference}</code>
              </p>
            </div>
            <div className="billing-status-card manual-bank-card">
              <InfoLine label={<LocalizedText k="billing.manual.recipient" />} value={manualBillingDetails.recipientName || <LocalizedText k="common.value.addEnvValue" />} />
              <InfoLine label="IBAN" value={manualBillingDetails.iban || <LocalizedText k="common.value.addEnvValue" />} />
              <InfoLine label="SWIFT / BIC" value={manualBillingDetails.swiftBic || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.manual.bankName" />} value={manualBillingDetails.bankName || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.manual.bankAddress" />} value={manualBillingDetails.bankAddress || <LocalizedText k="common.value.optional" />} />
              <InfoLine label={<LocalizedText k="billing.manual.recipientAddress" />} value={manualBillingDetails.recipientAddress || <LocalizedText k="common.value.optional" />} />
            </div>
            {manualBillingDetails.correspondentBank ||
            manualBillingDetails.intermediaryBank ? (
              <div className="billing-status-card manual-bank-card">
                <InfoLine label={<LocalizedText k="billing.manual.correspondentAccount" />} value={manualBillingDetails.correspondentAccount || <LocalizedText k="common.value.optional" />} />
                <InfoLine label={<LocalizedText k="billing.manual.correspondentBank" />} value={manualBillingDetails.correspondentBank || <LocalizedText k="common.value.optional" />} />
                <InfoLine label={<LocalizedText k="billing.manual.correspondentSwift" />} value={manualBillingDetails.correspondentSwiftBic || <LocalizedText k="common.value.optional" />} />
                <InfoLine label={<LocalizedText k="billing.manual.intermediaryAccount" />} value={manualBillingDetails.intermediaryAccount || <LocalizedText k="common.value.optional" />} />
                <InfoLine label={<LocalizedText k="billing.manual.intermediaryBank" />} value={manualBillingDetails.intermediaryBank || <LocalizedText k="common.value.optional" />} />
                <InfoLine label={<LocalizedText k="billing.manual.intermediarySwift" />} value={manualBillingDetails.intermediarySwiftBic || <LocalizedText k="common.value.optional" />} />
              </div>
            ) : null}
            <div className="compact-alert info aligned-left manual-billing-span">
              <ReceiptText size={16} />
              <span>
                <LocalizedText k="billing.manual.providerMode" /> {billingProvider}.{" "}
                <LocalizedText k="billing.manual.audit" />
              </span>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard
        description={<LocalizedText k="billing.guardrails.description" />}
        eyebrow={<LocalizedText k="billing.guardrails.eyebrow" />}
        title={<LocalizedText k="billing.guardrails.title" />}
      >
        <div className="limit-alert-list">
          {usageLines.map((line) => {
            const percent = getUsagePercent(line.value, line.limit);

            return (
              <div
                className={`limit-alert ${percent >= 90 ? "danger" : percent >= 75 ? "warning" : "ok"}`}
                key={line.label}
              >
                <line.icon size={16} />
                <strong><LocalizedText k={line.labelKey} /></strong>
                <span>
                  {line.value.toLocaleString()} / {line.limit.toLocaleString()}{" "}
                  <LocalizedText k="billing.guardrails.used" />
                </span>
              </div>
            );
          })}
        </div>
        <div className="billing-value-note">
          <strong><LocalizedText k="billing.guardrails.logicTitle" /></strong>
          <p>
            <LocalizedText k="billing.guardrails.logicCopy" />
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard
        description={<LocalizedText k="billing.plans.description" />}
        eyebrow={<LocalizedText k="billing.plans.eyebrow" />}
        title={<LocalizedText k="billing.plans.title" />}
        wide
      >
        <div className="plan-grid">
          {plans.map((plan) => {
            const catalog = getPlanCatalog(plan);
            const limits = getPlanLimits(plan);
            const isCurrentPlan = plan === activePlan;

            return (
              <div className={`plan-option ${isCurrentPlan ? "active" : ""}`} key={plan}>
                <strong>{catalog.label}</strong>
                <div className="plan-price">
                  ${catalog.monthlyPrice}/<LocalizedText k="billing.common.monthShort" />
                </div>
                <p className="plan-summary">
                  <LocalizedText k={getPlanSummaryKey(plan)} />
                </p>
                <span>{limits.maxUsers} <LocalizedText k="billing.plans.teamSeats" /></span>
                <span>{limits.maxIntegrations} <LocalizedText k="billing.plans.liveIntegrations" /></span>
                <span>{limits.monthlyMessages.toLocaleString()} <LocalizedText k="billing.plans.monthlyMessages" /></span>
                <span>{limits.monthlyAiRuns.toLocaleString()} <LocalizedText k="billing.plans.aiRuns" /></span>
                <span>
                  {catalog.onboardingFee > 0
                    ? <><LocalizedText k="billing.common.onboardingFrom" /> ${catalog.onboardingFee}</>
                    : <LocalizedText k="billing.metric.onboardingIncluded" />}
                </span>
                <div className="plan-feature-list">
                  {getPlanFeatureKeys(plan).map((key) => (
                    <small key={key}>
                      <LocalizedText k={key} />
                    </small>
                  ))}
                </div>
                {canUseOnlineCheckout ? (
                  <BillingActionButton
                    disabled={isCurrentPlan && subscriptionPaidActive}
                    label={
                      isCurrentPlan && subscriptionPaidActive
                        ? <LocalizedText k="billing.action.currentPlan" />
                        : <LocalizedText k="billing.action.launchCheckout" />
                    }
                    mode="checkout"
                    organizationId={organization.id}
                    plan={plan}
                  />
                ) : null}
                {manualBillingVisible ? (
                  <ManualInvoiceButton
                    disabled={
                      !canUseManualBilling ||
                      (isCurrentPlan && subscriptionPaidActive)
                    }
                    label={
                      isCurrentPlan && subscriptionPaidActive
                        ? <LocalizedText k="billing.action.currentPlan" />
                        : isCurrentPlan && subscriptionTrialActive
                          ? <LocalizedText k="billing.action.startPaidPlan" />
                        : <LocalizedText k="billing.action.requestInvoice" />
                    }
                    organizationId={organization.id}
                    plan={plan}
                  />
                ) : !canUseOnlineCheckout ? (
                  <BillingActionButton
                    disabled={!onlineBillingConfigured || isCurrentPlan}
                    label={isCurrentPlan ? <LocalizedText k="billing.action.currentPlan" /> : <LocalizedText k="billing.action.launchCheckout" />}
                    mode="checkout"
                    organizationId={organization.id}
                    plan={plan}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </SurfaceCard>
    </section>
  );
}

function BillingAccessRequired() {
  return (
    <section className="view-grid">
      <PageHeader
        description={<LocalizedText k="billing.access.description" />}
        eyebrow={<LocalizedText k="billing.header.eyebrow" />}
        title={<LocalizedText k="billing.access.title" />}
      />
      <section className="empty-state">
        <ShieldCheck size={34} />
        <h2><LocalizedText k="billing.access.requires" /></h2>
        <p><LocalizedText k="billing.access.body" /></p>
        <Link className="primary-button" href="/">
          <LocalizedText k="dashboard.access.goLogin" />
        </Link>
      </section>
    </section>
  );
}

function InfoLine({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="info-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UsageLine({ label, limit, value }: { label: ReactNode; limit: number; value: number }) {
  const percent = getUsagePercent(value, limit);

  return (
    <div className="usage-line">
      <div>
        <span>{label}</span>
        <strong>
          {value.toLocaleString()} / {limit.toLocaleString()}
        </strong>
      </div>
      <div className="usage-track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function getUsagePercent(value: number, limit: number) {
  return Math.min(100, Math.round((value / Math.max(1, limit)) * 100));
}

function createFallbackSubscription(organizationId: string): Subscription {
  const nowIso = new Date().toISOString();

  return {
    id: `sub-${organizationId || "fallback"}`,
    organizationId,
    provider: "manual",
    plan: "starter",
    status: "past_due",
    currentPeriodStart: nowIso,
    currentPeriodEnd: nowIso,
    externalCustomerId: "",
    externalSubscriptionId: "",
  };
}

function createFallbackUsage(
  organizationId: string,
  plan: Subscription["plan"],
): UsageLimits {
  const limits = getPlanLimits(plan);

  return {
    id: `usage-${organizationId || "fallback"}`,
    organizationId,
    ...limits,
    periodUsageJson: {
      users: 0,
      integrations: 0,
      messages: 0,
      aiRuns: 0,
    },
  };
}

function getPlanSummaryKey(plan: Subscription["plan"]): TranslationKey {
  switch (plan) {
    case "growth":
      return "billing.plan.growth.summary";
    case "scale":
      return "billing.plan.scale.summary";
    case "starter":
      return "billing.plan.starter.summary";
  }
}

function getPlanFeatureKeys(plan: Subscription["plan"]): TranslationKey[] {
  switch (plan) {
    case "growth":
      return [
        "billing.plan.growth.feature1",
        "billing.plan.growth.feature2",
        "billing.plan.growth.feature3",
        "billing.plan.growth.feature4",
      ];
    case "scale":
      return [
        "billing.plan.scale.feature1",
        "billing.plan.scale.feature2",
        "billing.plan.scale.feature3",
        "billing.plan.scale.feature4",
      ];
    case "starter":
      return [
        "billing.plan.starter.feature1",
        "billing.plan.starter.feature2",
        "billing.plan.starter.feature3",
        "billing.plan.starter.feature4",
      ];
  }
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function readQueryParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

