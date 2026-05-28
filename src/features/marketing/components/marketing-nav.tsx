import Image from "next/image";
import Link from "next/link";
import { PublicAccountCta } from "@/components/marketing/public-account-cta";
import { ThemeColorPicker } from "@/components/ui/theme-color-picker";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function MarketingNav({
  launchPage,
}: {
  launchPage?: string;
}) {
  return (
    <nav className="recovery-nav marketing-nav ddr-marketing-nav" aria-label="Primary navigation">
      <Link className="recovery-brand" href="/" aria-label="Dash Dental home">
        <span className="recovery-brand-icon" aria-hidden="true">
          <Image
            alt=""
            className="recovery-brand-mark-compact"
            height={160}
            loading="eager"
            src="/dental-recovery-mark.png"
            unoptimized
            width={160}
          />
        </span>
        <span className="recovery-brand-wordmark">Dash Dental</span>
      </Link>

      <div className="recovery-nav-links">
        <Link href="/#product">Product</Link>
        <Link href="/demo">Demo</Link>
        <Link href="/pricing">
          <LocalizedText fallback="Pricing" k="common.nav.pricing" />
        </Link>
        <Link href="/integrations-guide">Integrations</Link>
        <Link href="/security">
          <LocalizedText fallback="Security" k="common.nav.security" />
        </Link>
        <Link href="/support">Support</Link>
      </div>

      <div className="recovery-nav-actions">
        <ThemeColorPicker />
        <ThemeToggle />
        <Link
          className="ddr-button ddr-button-ghost"
          href="/login"
        >
          Sign in
        </Link>
        <PublicAccountCta
          className="recovery-white-button ddr-button ddr-button-primary"
          data-launch-event="public.home.account_clicked"
          data-launch-page={launchPage}
          data-launch-section="nav"
          data-launch-target="/register"
          guestLabel="Create account"
        />
      </div>
    </nav>
  );
}
