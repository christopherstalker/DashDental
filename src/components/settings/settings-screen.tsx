"use client";

import {
  BellRing,
  Check,
  CreditCard,
  FileText,
  Mail,
  Plug,
  Save,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getPlanCatalog } from "@/domain/business-rules";
import type { FeatureFlagKey, IntegrationStatus, Provider, Subscription } from "@/domain/types";

export interface SettingsIntegration {
  errorState?: string;
  healthScore: number;
  id: string;
  provider: Provider;
  status: IntegrationStatus;
}

export interface SettingsTemplate {
  category: string;
  id: string;
  title: string;
}

export interface SettingsTeamMember {
  email: string;
  id: string;
  name: string;
  role: string;
}

export interface SettingsDigest {
  enabled: boolean;
  recipientEmail: string;
}

export interface SettingsBilling {
  daysRemaining: number;
  plan: Subscription["plan"];
  planLabel: string;
  status: string;
}

type SettingsTab =
  | "general"
  | "team"
  | "templates"
  | "billing"
  | "integrations"
  | "notifications";

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Settings }> = [
  { id: "general", label: "General", icon: Settings },
  { id: "team", label: "Team", icon: Users },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "notifications", label: "Notifications", icon: BellRing },
];

const channels: Provider[] = ["whatsapp", "instagram", "telegram", "phone", "web_form", "clinic_database"];
const upgradeOrder: Subscription["plan"][] = ["starter", "growth", "scale"];

const providerLabels: Record<Provider, string> = {
  clinic_database: "Clinic DB",
  instagram: "Instagram",
  phone: "Missed calls",
  telegram: "Telegram",
  web_form: "Website form",
  whatsapp: "WhatsApp",
};

const providerCredentialLinks: Record<Provider, { href: string; label: string }> = {
  clinic_database: {
    href: "/integrations#clinic_database",
    label: "Configure DB access",
  },
  instagram: {
    href: "/integrations#instagram",
    label: "Configure API tokens",
  },
  phone: {
    href: "/integrations#phone",
    label: "Configure Twilio number",
  },
  telegram: {
    href: "/integrations#telegram",
    label: "Configure bot token",
  },
  web_form: {
    href: "/integrations#web_form",
    label: "Configure endpoint",
  },
  whatsapp: {
    href: "/integrations#whatsapp",
    label: "Configure API tokens",
  },
};

const defaultThresholds: Record<Provider, number> = {
  clinic_database: 60,
  instagram: 20,
  phone: 5,
  telegram: 15,
  web_form: 10,
  whatsapp: 15,
};

function statusBadge(status: IntegrationStatus): string {
  if (status === "active") return "ddr-badge-ok";
  if (status === "degraded" || status === "pending") return "ddr-badge-warm";
  return "ddr-badge-alert";
}

function featureEnabled(flags: Array<{ enabled: boolean; key: FeatureFlagKey }>, key: FeatureFlagKey): boolean {
  return flags.some((flag) => flag.key === key && flag.enabled);
}

function nextPlanFor(plan: Subscription["plan"]): Subscription["plan"] {
  const currentIndex = upgradeOrder.indexOf(plan);
  return upgradeOrder[Math.min(currentIndex + 1, upgradeOrder.length - 1)] ?? "scale";
}

export function SettingsScreen({
  billing,
  digest,
  featureFlags,
  integrations,
  organizationId,
  organizationName,
  team,
  templates,
  timezone,
}: {
  billing: SettingsBilling;
  digest: SettingsDigest;
  featureFlags: Array<{ enabled: boolean; key: FeatureFlagKey }>;
  integrations: SettingsIntegration[];
  organizationId: string;
  organizationName: string;
  team: SettingsTeamMember[];
  templates: SettingsTemplate[];
  timezone: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [billingState, setBillingState] = useState(billing);
  const [channelState, setChannelState] = useState(integrations);
  const [loadingChannelId, setLoadingChannelId] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [weeklyDigest, setWeeklyDigest] = useState(digest);
  const [notificationState, setNotificationState] = useState({
    push: featureEnabled(featureFlags, "sla_push_alerts"),
    sound: featureEnabled(featureFlags, "sound_alerts"),
  });
  const integrationByProvider = useMemo(
    () => new Map(channelState.map((integration) => [integration.provider, integration])),
    [channelState],
  );

  async function toggleIntegration(integration: SettingsIntegration) {
    const nextStatus: IntegrationStatus = integration.status === "active" ? "disconnected" : "active";
    setLoadingChannelId(integration.id);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}/status`, {
        body: JSON.stringify({ status: nextStatus }),
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not update channel status.");
      }

      setChannelState((current) =>
        current.map((item) =>
          item.id === integration.id
            ? {
                ...item,
                errorState: nextStatus === "active" ? undefined : item.errorState,
                healthScore: nextStatus === "active" ? 96 : 0,
                status: nextStatus,
              }
            : item,
        ),
      );
      setStatusMessage({ kind: "success", text: `${providerLabels[integration.provider]} updated.` });
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not update channel status.",
      });
    } finally {
      setLoadingChannelId(null);
    }
  }

  function saveLocalSettings() {
    if (weeklyDigest.enabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(weeklyDigest.recipientEmail)) {
      setStatusMessage({ kind: "error", text: "Enter a valid weekly digest recipient email." });
      return;
    }

    setStatusMessage({ kind: "success", text: "Settings saved for this clinic workspace." });
  }

  async function upgradePlan() {
    const nextPlan = nextPlanFor(billingState.plan);

    if (nextPlan === billingState.plan) {
      setStatusMessage({ kind: "success", text: "You are already on the highest plan." });
      return;
    }

    setUpgradingPlan(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/v1/billing/subscription/plan", {
        body: JSON.stringify({ organizationId, plan: nextPlan }),
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not upgrade plan.");
      }

      const catalog = getPlanCatalog(nextPlan);
      setBillingState((current) => ({
        ...current,
        plan: nextPlan,
        planLabel: catalog.label,
      }));
      setStatusMessage({ kind: "success", text: `Plan upgraded to ${catalog.label}.` });
      window.setTimeout(() => router.refresh(), 250);
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not upgrade plan.",
      });
    } finally {
      setUpgradingPlan(false);
    }
  }

  return (
    <section className="ddr-settings-page" aria-label="Workspace settings">
      <div className="ddr-page-heading">
        <div>
          <span className="ddr-badge ddr-badge-info">Settings</span>
          <h1>Clinic workspace settings</h1>
          <p>Manage channels, SLA rules, templates, billing, and owner notifications.</p>
        </div>
        <button className="ddr-button ddr-button-primary" onClick={saveLocalSettings} type="button">
          <Save size={15} />
          Save changes
        </button>
      </div>

      {statusMessage ? (
        <div className={`ddr-settings-status ${statusMessage.kind}`} role={statusMessage.kind === "error" ? "alert" : "status"}>
          {statusMessage.text}
        </div>
      ) : null}

      <div className="ddr-settings-layout">
        <aside className="ddr-settings-subnav" aria-label="Settings sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                aria-pressed={activeTab === tab.id}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        <div className="ddr-settings-content">
          {activeTab === "general" ? (
            <article className="ddr-card ddr-settings-panel">
              <div className="ddr-card-heading">
                <h2>General</h2>
                <p>Core workspace identity and operating timezone.</p>
              </div>
              <div className="ddr-settings-grid">
                <label className="ddr-field">
                  <span>Clinic name</span>
                  <input value={organizationName} readOnly />
                </label>
                <label className="ddr-field">
                  <span>Timezone</span>
                  <input value={timezone} readOnly />
                </label>
              </div>
            </article>
          ) : null}

          {activeTab === "team" ? (
            <article className="ddr-card ddr-settings-panel">
              <div className="ddr-card-heading">
                <h2>Team</h2>
                <p>Active staff members who can own patient conversations.</p>
              </div>
              <div className="ddr-table-wrap">
                <table className="ddr-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{member.email}</td>
                        <td>{member.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}

          {activeTab === "templates" ? (
            <article className="ddr-card ddr-settings-panel">
              <div className="ddr-card-heading">
                <h2>Templates</h2>
                <p>Saved replies available from the inbox composer.</p>
              </div>
              <div className="ddr-template-settings-grid">
                {templates.map((template) => (
                  <div className="ddr-template-setting-card" key={template.id}>
                    <strong>{template.title}</strong>
                    <span className="ddr-badge ddr-badge-info">{template.category}</span>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeTab === "billing" ? (
            <article className="ddr-card ddr-settings-panel">
              <div className="ddr-card-heading">
                <h2>Billing</h2>
                <p>Release pricing with clear limits, active billing state, and instant plan changes.</p>
              </div>
              <div className="ddr-billing-summary">
                <div>
                  <span>Current plan</span>
                  <strong>{billingState.planLabel}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{billingState.status}</strong>
                </div>
                <div>
                  <span>Days remaining</span>
                  <strong>{billingState.daysRemaining}</strong>
                </div>
                <button
                  className="ddr-button ddr-button-primary"
                  disabled={upgradingPlan || billingState.plan === "scale"}
                  onClick={() => void upgradePlan()}
                  type="button"
                >
                  {upgradingPlan
                    ? "Upgrading..."
                    : billingState.plan === "scale"
                      ? "Highest plan"
                      : `Upgrade to ${getPlanCatalog(nextPlanFor(billingState.plan)).label}`}
                </button>
              </div>
            </article>
          ) : null}

          {activeTab === "integrations" ? (
            <article className="ddr-card ddr-settings-panel">
              <div className="ddr-card-heading">
                <h2>Connected channels</h2>
                <p>Toggle channel availability and watch health status.</p>
              </div>
              <div className="ddr-channel-card-grid">
                {channels.map((provider) => {
                  const integration = integrationByProvider.get(provider);
                  const active = integration?.status === "active";

                  return (
                    <div className="ddr-channel-card" key={provider}>
                      <div>
                        <strong>{providerLabels[provider]}</strong>
                        <span>{integration ? `${integration.healthScore}% health` : "Not configured"}</span>
                      </div>
                      {integration ? (
                        <span className={`ddr-badge ${statusBadge(integration.status)}`}>{integration.status}</span>
                      ) : (
                        <span className="ddr-badge ddr-badge-info">Setup</span>
                      )}
                      <button
                        aria-pressed={active}
                        className="ddr-switch"
                        disabled={!integration || loadingChannelId === integration.id}
                        onClick={() => integration && void toggleIntegration(integration)}
                        type="button"
                      >
                        <span />
                      </button>
                      {integration?.errorState ? <p>{integration.errorState}</p> : null}
                      <div className="ddr-channel-card-actions">
                        <Link className="ddr-button ddr-button-ghost" href={providerCredentialLinks[provider].href}>
                          {providerCredentialLinks[provider].label}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}

          {activeTab === "notifications" ? (
            <article className="ddr-card ddr-settings-panel">
              <div className="ddr-card-heading">
                <h2>Notifications</h2>
                <p>SLA thresholds, browser alerts, sound alerts, and owner weekly digest.</p>
              </div>
              <div className="ddr-settings-grid">
                <div className="ddr-settings-section">
                  <h3>SLA rules</h3>
                  {channels.slice(0, 4).map((provider) => (
                    <label className="ddr-threshold-row" key={provider}>
                      <span>{providerLabels[provider]}</span>
                      <input
                        min={5}
                        onChange={(event) =>
                          setThresholds((current) => ({
                            ...current,
                            [provider]: Number(event.target.value),
                          }))
                        }
                        step={5}
                        type="number"
                        value={thresholds[provider]}
                      />
                      <span>min</span>
                    </label>
                  ))}
                </div>

                <div className="ddr-settings-section">
                  <h3>Weekly digest</h3>
                  <label className="ddr-check-row">
                    <input
                      checked={weeklyDigest.enabled}
                      onChange={(event) =>
                        setWeeklyDigest((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    Send weekly owner digest
                  </label>
                  <label className="ddr-field">
                    <span>Recipient email</span>
                    <input
                      onChange={(event) =>
                        setWeeklyDigest((current) => ({
                          ...current,
                          recipientEmail: event.target.value,
                        }))
                      }
                      value={weeklyDigest.recipientEmail}
                    />
                  </label>
                </div>

                <div className="ddr-settings-section">
                  <h3>Reception alerts</h3>
                  <label className="ddr-check-row">
                    <input
                      checked={notificationState.push}
                      onChange={(event) =>
                        setNotificationState((current) => ({ ...current, push: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    Browser push alerts
                  </label>
                  <label className="ddr-check-row">
                    <input
                      checked={notificationState.sound}
                      onChange={(event) =>
                        setNotificationState((current) => ({ ...current, sound: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    Sound alerts
                  </label>
                </div>
              </div>
            </article>
          ) : null}
        </div>
      </div>

      <div className="ddr-settings-footnote">
        <ShieldCheck size={15} />
        Workspace changes are scoped to this clinic tenant.
        <Mail size={15} />
        Owner digest can be connected to the weekly email job.
        <Check size={15} />
        Channel toggles use existing integration health APIs.
      </div>
    </section>
  );
}
