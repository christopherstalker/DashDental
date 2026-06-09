"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import type { Subscription } from "@/domain/types";
import type { BillingInterval } from "@/server/validation";
import { BillingActionButton } from "./billing-action-button";
import { ManualInvoiceButton } from "./manual-invoice-button";

export interface BillingPlanOption {
  plan: Subscription["plan"];
  label: string;
  summary: string;
  monthlyPrice: number;
  annualPrice: number;
  limits: {
    maxUsers: number;
    maxIntegrations: number;
    monthlyMessages: number;
    monthlyAiRuns: number;
  };
  included: string[];
  isCurrentPlan: boolean;
}

export function BillingPlanSelector({
  annualCheckoutAvailable,
  checkoutAvailable,
  customerPortalAvailable,
  manualInvoiceAvailable,
  manualInvoiceVisible,
  options,
  organizationId,
  providerLabel,
  subscriptionPaidActive,
}: {
  annualCheckoutAvailable: boolean;
  checkoutAvailable: boolean;
  customerPortalAvailable: boolean;
  manualInvoiceAvailable: boolean;
  manualInvoiceVisible: boolean;
  options: BillingPlanOption[];
  organizationId: string;
  providerLabel: string;
  subscriptionPaidActive: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const intervalDisabled = interval === "yearly" && !annualCheckoutAvailable;
  const annualSavings = useMemo(() => {
    const growth = options.find((option) => option.plan === "growth");
    if (!growth) {
      return 0;
    }

    return Math.max(0, growth.monthlyPrice * 12 - growth.annualPrice);
  }, [options]);

  return (
    <div className="billing-plan-selector">
      <div className="billing-plan-toolbar">
        <div>
          <strong>Choose a production plan</strong>
          {checkoutAvailable ? (
            <p>
              Plans are paid after the 14-day trial. The checkout opens in {providerLabel};
              subscription updates sync back by webhook.
            </p>
          ) : manualInvoiceVisible ? (
            <p>
              Plans are paid by invoice after the 14-day trial. Request the target plan,
              then platform support activates access after payment confirmation.
            </p>
          ) : (
            <p>
              Plan changes are unavailable until billing is configured for this workspace.
            </p>
          )}
        </div>
        {checkoutAvailable ? (
          <div className="billing-period-toggle" role="tablist" aria-label="Billing period">
            <button
              aria-selected={interval === "monthly"}
              className={interval === "monthly" ? "active" : ""}
              onClick={() => setInterval("monthly")}
              role="tab"
              type="button"
            >
              Monthly
            </button>
            <button
              aria-selected={interval === "yearly"}
              className={interval === "yearly" ? "active" : ""}
              disabled={!annualCheckoutAvailable}
              onClick={() => setInterval("yearly")}
              role="tab"
              type="button"
            >
              Annual
              <span>Save 17%</span>
            </button>
          </div>
        ) : null}
      </div>

      {checkoutAvailable && !annualCheckoutAvailable ? (
        <div className="compact-alert warning aligned-left">
          <ShieldCheck size={16} />
          <span>Annual checkout is disabled until all Paddle yearly price IDs are configured.</span>
        </div>
      ) : checkoutAvailable && annualSavings > 0 ? (
        <div className="compact-alert info aligned-left">
          <Sparkles size={16} />
          <span>Annual billing saves about ${annualSavings.toLocaleString()} on the Pro plan.</span>
        </div>
      ) : null}

      <div className="plan-grid billing-plan-grid">
        {options.map((option) => {
          const currentPaidPlan = option.isCurrentPlan && subscriptionPaidActive;
          const selectedPrice = interval === "yearly" ? option.annualPrice : option.monthlyPrice;
          const monthlyEquivalent =
            interval === "yearly" ? Math.round(option.annualPrice / 12) : option.monthlyPrice;
          const actionDisabled =
            intervalDisabled || (!checkoutAvailable && !customerPortalAvailable);
          const actionMode = currentPaidPlan && customerPortalAvailable ? "portal" : "checkout";
          const actionLabel = currentPaidPlan
            ? customerPortalAvailable
              ? `Manage in ${providerLabel}`
              : "Current plan"
            : option.isCurrentPlan
              ? "Activate paid plan"
              : `Switch to ${option.label}`;

          return (
            <div
              className={`plan-option billing-plan-card ${
                option.isCurrentPlan ? "active" : ""
              } ${option.plan === "growth" ? "preferred" : ""}`}
              key={option.plan}
            >
              <div className="billing-plan-card-head">
                <div>
                  <strong>{option.label}</strong>
                  <p>{option.summary}</p>
                </div>
                {option.plan === "growth" ? <span className="status-badge ok">Best fit</span> : null}
                {option.isCurrentPlan ? <span className="status-badge info">Current</span> : null}
              </div>

              <div className="plan-price billing-plan-price">
                <span>${selectedPrice.toLocaleString()}</span>
                <small>/{interval === "yearly" ? "year" : "month"}</small>
              </div>
              {interval === "yearly" ? (
                <p className="billing-price-note">${monthlyEquivalent}/mo equivalent, billed yearly.</p>
              ) : (
                <p className="billing-price-note">Billed monthly after the free trial.</p>
              )}

              <div className="billing-plan-limits">
                <span>{option.limits.maxUsers} seats</span>
                <span>{option.limits.maxIntegrations} integrations</span>
                <span>{option.limits.monthlyMessages.toLocaleString()} messages/mo</span>
                <span>{option.limits.monthlyAiRuns.toLocaleString()} AI runs/mo</span>
              </div>

              <div className="plan-feature-list">
                {option.included.map((feature) => (
                  <small key={feature}>
                    <CheckCircle2 size={14} />
                    {feature}
                  </small>
                ))}
              </div>

              {checkoutAvailable || customerPortalAvailable ? (
                <BillingActionButton
                  className={option.plan === "growth" ? "primary-button" : "secondary-button"}
                  disabled={actionDisabled || (currentPaidPlan && !customerPortalAvailable)}
                  interval={actionMode === "checkout" ? interval : undefined}
                  label={actionLabel}
                  mode={actionMode}
                  organizationId={organizationId}
                  plan={actionMode === "checkout" ? option.plan : undefined}
                />
              ) : manualInvoiceVisible ? (
                <ManualInvoiceButton
                  className={option.plan === "growth" ? "primary-button" : "secondary-button"}
                  disabled={!manualInvoiceAvailable || currentPaidPlan}
                  label={
                    currentPaidPlan
                      ? "Plan active"
                      : option.isCurrentPlan
                        ? "Request invoice"
                        : `Request ${option.label} invoice`
                  }
                  organizationId={organizationId}
                  plan={option.plan}
                />
              ) : (
                <button className="secondary-button" disabled type="button">
                  Billing unavailable
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
