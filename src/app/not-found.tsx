import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/features/design-system/components/site-shell";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";

export default function NotFound() {
  return (
    <SiteShell>
      <main className="recovery-landing dash-marketing safe-fallback-page">
      <MarketingNav launchPage="/404" />
      <section className="safe-fallback-card safe-fallback-card-marketing">
        <div className="safe-fallback-mark">
          <ShieldCheck size={22} />
        </div>
        <p className="recovery-kicker">Page not found</p>
        <h1>This Dash Dental page does not exist.</h1>
        <p>
          The route may have moved. Start from the homepage or open the public sample
          recovery cockpit to preview the product without signing in.
        </p>
        <div className="safe-fallback-actions">
          <Link className="recovery-primary-button" href="/demo">
            Try sample dashboard
            <ArrowRight size={16} />
          </Link>
          <Link className="recovery-secondary-button" href="/">
            Back to homepage
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </main>
    </SiteShell>
  );
}
