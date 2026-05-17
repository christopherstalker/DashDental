import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { MarketingLocalizedText } from "@/features/marketing/components/marketing-localized-text";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";

export function MarketingNav({
  launchPage,
  showLanguageSwitcher = false,
}: {
  launchPage?: string;
  showLanguageSwitcher?: boolean;
}) {
  return (
    <nav className="recovery-nav marketing-nav" aria-label="Primary navigation">
      <Link className="recovery-brand" href="/" aria-label="Dash Dental home">
        <span className="recovery-brand-icon" aria-hidden="true">
          <Image
            alt=""
            className="recovery-brand-mark-compact"
            height={160}
            loading="eager"
            src="/dental-recovery-mark.svg"
            unoptimized
            width={160}
          />
        </span>
        <span className="recovery-brand-wordmark">Dash Dental</span>
      </Link>

      <div className="recovery-nav-links">
        <Link href="/#product">
          <LocalizedText fallback="Product" k="common.nav.platform" />
        </Link>
        <Link href="/demo">
          <LocalizedText fallback="Demo" k="common.nav.demo" />
        </Link>
        <Link href="/pricing">
          <LocalizedText fallback="Pricing" k="common.nav.pricing" />
        </Link>
        <Link href="/security">
          <LocalizedText fallback="Security" k="common.nav.security" />
        </Link>
        <Link href="/support">
          <MarketingLocalizedText fallback="Support" k="support" />
        </Link>
      </div>

      <div className="recovery-nav-actions">
        {showLanguageSwitcher ? <LanguageSwitcher compact tone="dark" /> : null}
        <ThemeToggle compact />
        <Link className="recovery-ghost-button" href="/login">
          <LocalizedText fallback="Sign in" k="common.nav.login" />
        </Link>
        <Link
          className="recovery-white-button"
          data-launch-event="public.home.demo_clicked"
          data-launch-page={launchPage}
          data-launch-section="nav"
          data-launch-target="/support"
          href="/support#request"
        >
          <MarketingLocalizedText fallback="Book demo" k="bookDemo" />
        </Link>
      </div>
    </nav>
  );
}
