import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Zap,
} from "lucide-react";

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
            <em className="dd-beta-badge">Beta</em>
          </Link>
          <div className="premium-auth-actions">
            <Link href="/pricing">Pricing</Link>
            <Link className="premium-auth-login" href="/login">
              Sign in
            </Link>
          </div>
        </header>

        <div className="premium-auth-grid">
          <div className="login-copy premium-auth-copy">
            <p className="premium-auth-kicker">Secure beta access</p>
            <h1>Open the recovery cockpit your clinic assigned to you.</h1>
            <p className="login-subcopy">
              Dash Dental separates your personal account from clinic data. Sign in,
              choose an assigned workspace, and recover missed inquiries without mixing
              patient intake with clinical records.
            </p>
            <div className="premium-auth-proof">
              <span>
                <CheckCircle2 size={15} />
                Lead intake only
              </span>
              <span>
                <CreditCard size={15} />
                Beta workspace
              </span>
              <span>
                <Zap size={15} />
                Human-reviewed AI drafts
              </span>
            </div>

            <div className="premium-auth-console" aria-label="Dash Dental access preview">
              <div className="premium-auth-preview-header">
                <span>Access preview</span>
                <strong>Revenue recovery cockpit</strong>
              </div>
              <div className="premium-auth-console-grid">
                <div className="premium-auth-console-card accent">
                  <span>
                    <BarChart3 size={15} />
                    Revenue at risk
                  </span>
                  <strong>$7.8k</strong>
                  <em>4 patients need action</em>
                </div>
                <div className="premium-auth-console-card">
                  <span>
                    <TimerReset size={15} />
                    Avg first response
                  </span>
                  <strong>11m</strong>
                  <em>inside target</em>
                </div>
              </div>
              <div className="premium-auth-queue">
                {[
                  ["WhatsApp", "Implant consult waiting", "High SLA risk"],
                  ["Instagram", "Whitening quote request", "AI draft ready"],
                  ["Web form", "Emergency appointment", "Owner visible"],
                ].map(([channel, intent, status]) => (
                  <div className="premium-auth-queue-row" key={intent}>
                    <span>
                      <MessageCircle size={14} />
                      {channel}
                    </span>
                    <strong>{intent}</strong>
                    <em>{status}</em>
                  </div>
                ))}
              </div>
              <div className="premium-auth-console-footer">
                <span>
                  <Sparkles size={15} />
                  Human approval required
                </span>
                <strong>
                  Open priority queue
                  <ArrowRight size={14} />
                </strong>
              </div>
            </div>
          </div>

          <div className="premium-auth-form-column">{children}</div>
        </div>
      </section>
    </div>
  );
}
