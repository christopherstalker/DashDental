import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
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
            <p className="premium-auth-kicker">Clinic revenue recovery cockpit</p>
            <h1>Sign in to the dashboard that finds missed patients first.</h1>
            <p className="login-subcopy">
              Open the command center for unanswered patient messages, SLA risk,
              human-reviewed AI reply drafts, and owner visibility. Dash Dental stays
              focused on lead intake and recovery, not clinical records.
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
            <div className="premium-auth-preview">
              <div className="premium-auth-preview-header">
                <span>Dashboard preview</span>
                <strong>Revenue recovery cockpit</strong>
              </div>
              <Image
                alt="Dash Dental dashboard preview"
                height={1080}
                priority
                src="/dashboard-preview.png"
                unoptimized
                width={1600}
              />
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
