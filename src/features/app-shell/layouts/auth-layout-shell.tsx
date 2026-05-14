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
            <p className="premium-auth-kicker">Dash Dental missed-message recovery</p>
            <h1>Start a clinic recovery workspace without replacing your CRM.</h1>
            <p className="login-subcopy">
              Create a protected workspace for unanswered patient messages, response-time
              risk, safe AI-assisted reply drafts (human-reviewed before sending), and
              owner visibility. No CRM migration required — start with one channel and a
              work email.
            </p>
            <div className="premium-auth-proof">
              <span>
                <CheckCircle2 size={15} />
                Lead intake only
              </span>
              <span>
                <CreditCard size={15} />
                14-day guided trial
              </span>
              <span>
                <Zap size={15} />
                Setup checklist included
              </span>
            </div>
            <div className="premium-auth-preview">
              <div className="premium-auth-preview-header">
                <span>Real dashboard preview</span>
                <strong>Live recovery cockpit</strong>
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
