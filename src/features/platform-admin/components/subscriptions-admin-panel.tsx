"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CreditCard, DollarSign, Search, ShieldCheck, Users } from "lucide-react";
import { ManualSubscriptionGrantForm } from "@/features/billing/components/manual-subscription-grant-form";
import { MetricTile } from "@/features/design-system/components/metric-tile";
import { SurfaceCard } from "@/features/design-system/components/surface-card";
import type { PlatformCommercialOverview } from "@/features/platform-admin/data/commercial-admin";

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "No period";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapStatusTone(status: string): string {
  if (
    status === "expired" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "not_configured"
  ) {
    return "degraded";
  }

  if (status === "trialing" || status === "processing") {
    return "pending";
  }

  return "active";
}

export function SubscriptionsAdminPanel({
  overview,
}: {
  overview: PlatformCommercialOverview;
}) {
  const [query, setQuery] = useState("");
  const locked = overview.clinics.filter((clinic) =>
    ["expired", "past_due", "canceled", "not_configured"].includes(
      clinic.subscriptionStatus,
    ),
  ).length;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredClinics = useMemo(
    () =>
      normalizedQuery
        ? overview.clinics.filter((clinic) =>
            [
              clinic.id,
              clinic.name,
              clinic.plan,
              clinic.subscriptionStatus,
              clinic.latestBillingAuditAction,
              clinic.latestBillingReference,
            ]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(normalizedQuery)),
          )
        : overview.clinics,
    [normalizedQuery, overview.clinics],
  );

  return (
    <>
      <div className="metrics-row subscription-admin-metrics">
        <MetricTile
          icon={CreditCard}
          label="Active"
          subtitle={`${overview.stats.trialingSubscriptions} trialing, ${locked} need activation`}
          tone={locked > 0 ? "warning" : "neutral"}
          value={overview.stats.activeSubscriptions}
        />
        <MetricTile
          icon={DollarSign}
          label="Manual MRR"
          subtitle="Active manual subscriptions"
          value={`$${overview.stats.mrr}`}
        />
        <MetricTile
          icon={Users}
          label="Seats"
          subtitle="Used across all clinics"
          value={`${overview.stats.usedSeats}/${overview.stats.maxSeats || "?"}`}
        />
        <MetricTile
          icon={ShieldCheck}
          label="Clinics"
          subtitle="Registered tenant workspaces"
          value={overview.stats.clinics}
        />
      </div>

      <SurfaceCard
        description="Use this after payment is confirmed, or when a clinic needs a controlled read-only hold. Every change writes subscription state, plan limits, and audit history."
        eyebrow="Manual billing"
        title="Clinic subscriptions"
        wide
      >
        <div className="subscription-admin-toolbar">
          <div>
            <strong>Operator flow</strong>
            <span>
              Confirm invoice - grant or hold access - verify the clinic workspace - keep the
              invoice reference in audit metadata.
            </span>
          </div>
          <Link className="secondary-button compact-button" href="/platform">
            Back to support console
          </Link>
        </div>

        <label className="subscription-admin-search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Find clinic account</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find clinic by name, id, plan, status, or invoice reference"
            value={query}
          />
        </label>

        <div className="data-table subscription-admin-table">
          <div className="table-head platform-subscription-grid">
            <span>Clinic</span>
            <span>Status</span>
            <span>Usage</span>
            <span>Recovery</span>
            <span>Period</span>
            <span>Change access</span>
          </div>
          {filteredClinics.map((clinic) => (
            <div className="table-row platform-subscription-grid" key={clinic.id}>
              <div className="lead-name">
                <strong>{clinic.name}</strong>
                <span>{clinic.id}</span>
                <small>
                  {clinic.status} - {clinic.timezone}
                </small>
              </div>
              <div className="admin-cell-stack">
                <strong>{clinic.plan}</strong>
                <span className={`status-dot ${mapStatusTone(clinic.subscriptionStatus)}`}>
                  {clinic.subscriptionStatus.replaceAll("_", " ")}
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>
                  {clinic.usedSeats}/{clinic.maxSeats || "?"} seats
                </strong>
                <span>
                  {clinic.activeIntegrations} live channels, {clinic.openConversations} open
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>${clinic.recoverableRevenue}</strong>
                <span>
                  {clinic.leads7d} leads / {clinic.messages7d} messages in 7d
                </span>
              </div>
              <div className="admin-cell-stack">
                <strong>{clinic.daysRemaining}d left</strong>
                <span>{formatTimestamp(clinic.currentPeriodEnd)}</span>
                <small>
                  {clinic.latestBillingAuditAction
                    ? `${clinic.latestBillingAuditAction.replaceAll("_", " ")} · ${
                        clinic.latestBillingReference ?? "no reference"
                      }`
                    : "No billing audit yet"}
                </small>
              </div>
              <ManualSubscriptionGrantForm
                currentPlan={clinic.plan}
                organizationId={clinic.id}
              />
            </div>
          ))}
          {filteredClinics.length === 0 ? (
            <div className="empty-premium-row subscription-empty-row">
              <Search aria-hidden="true" size={18} />
              <span>No clinic matches this search.</span>
            </div>
          ) : null}
        </div>
      </SurfaceCard>
    </>
  );
}
