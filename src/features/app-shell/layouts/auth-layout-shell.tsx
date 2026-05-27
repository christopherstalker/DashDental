import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  CreditCard,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  UserCheck,
  Zap,
} from "lucide-react";
import { AuthAccountNav } from "../components/auth-account-nav";

const authPreviewThreads = [
  {
    accent: "alert",
    initials: "MK",
    message: "Veneers pricing",
    name: "Mila K.",
    time: "12m",
  },
  {
    accent: "warm",
    initials: "ON",
    message: "Implant consult",
    name: "Oleh N.",
    time: "31m",
  },
  {
    accent: "ok",
    initials: "EP",
    message: "Emergency tooth pain",
    name: "Eva P.",
    time: "4m",
  },
] as const;

const authPreviewNavItems: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Inbox, label: "Inbox" },
  { icon: Clock3, label: "SLA" },
  { icon: BellRing, label: "Alerts" },
];

function AuthDashboardPreview() {
  return (
    <div className="premium-auth-dashboard-preview" aria-label="Dash Dental dark dashboard preview">
      <aside className="premium-auth-dashboard-sidebar">
        <div className="premium-auth-dashboard-logo">
          <Zap size={13} />
          <span>Dash Dental</span>
        </div>
        {authPreviewNavItems.map(({ icon: Icon, label }) => (
          <span className={label === "Inbox" ? "active" : ""} key={label}>
            <Icon size={13} />
            {label}
          </span>
        ))}
      </aside>

      <section className="premium-auth-dashboard-main">
        <div className="premium-auth-dashboard-topbar">
          <span>Workspace / Inbox</span>
          <b>3 open</b>
        </div>

        <div className="premium-auth-dashboard-metrics">
          <article>
            <small>Response rate</small>
            <strong>94%</strong>
          </article>
          <article>
            <small>Avg response</small>
            <strong>8m</strong>
          </article>
          <article>
            <small>Booked today</small>
            <strong>7</strong>
          </article>
        </div>

        <div className="premium-auth-dashboard-workspace">
          <div className="premium-auth-thread-list">
            {authPreviewThreads.map((thread) => (
              <article className={thread.accent} key={thread.name}>
                <span>{thread.initials}</span>
                <div>
                  <strong>{thread.name}</strong>
                  <small>{thread.message}</small>
                </div>
                <b>{thread.time}</b>
              </article>
            ))}
          </div>

          <div className="premium-auth-thread-panel">
            <div className="premium-auth-thread-header">
              <span>
                <MessageCircle size={13} />
                Mila K.
              </span>
              <b>SLA 3 min</b>
            </div>
            <p className="incoming">Hi, do you have veneer consult slots this week?</p>
            <p className="outgoing">Yes, we can offer today at 16:30 or tomorrow morning.</p>
            <div className="team-note">
              <UserCheck size={13} />
              Team note: mention financing options.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AuthLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-shell premium-auth-shell">
      <div className="auth-noise" />
      <section className="login-panel premium-auth-panel">
        <header className="premium-auth-nav">
          <Link className="premium-auth-brand" href="/">
            <span>
              <ShieldCheck size={17} />
            </span>
            <strong>Dash Dental</strong>
          </Link>
          <AuthAccountNav />
        </header>

        <div className="premium-auth-grid">
          <div className="login-copy premium-auth-copy">
            <p className="premium-auth-kicker">Dash Dental account setup</p>
            <h1>Create an account first. Open the dashboard from your workspace hub.</h1>
            <p className="login-subcopy">
              The public site stays focused on the product. Your account holds clinic
              workspaces, role access, setup progress, and the path into the operational
              dashboard after authentication.
            </p>
            <div className="premium-auth-proof">
              <span>
                <CheckCircle2 size={15} />
                Lead intake only
              </span>
              <span>
                <CreditCard size={15} />
                Active release plan
              </span>
              <span>
                <Zap size={15} />
                Setup checklist included
              </span>
            </div>
            <div className="premium-auth-preview">
              <div className="premium-auth-preview-header">
                <span>Current dashboard preview</span>
                <strong>Live recovery cockpit</strong>
              </div>
              <AuthDashboardPreview />
              <div className="premium-auth-float one">
                <Sparkles size={16} />
                <span>AI brief ready</span>
              </div>
              <div className="premium-auth-float two">
                <ArrowRight size={16} />
                <span>$1.8k recoverable</span>
              </div>
            </div>
          </div>

          <div className="premium-auth-form-column">{children}</div>
        </div>
      </section>
    </div>
  );
}
