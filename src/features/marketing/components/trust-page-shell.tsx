import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import type { TranslationKey } from "@/features/i18n/translations";
import { MarketingLocalizedText } from "@/features/marketing/components/marketing-localized-text";
import { primaryCta, secondaryCta } from "@/features/marketing/content/dash-dental";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { MarketingFooter } from "@/features/marketing/components/marketing-footer";
import { policyEffectiveDate } from "@/features/marketing/content/trust";

export function TrustPageShell({
  children,
  description,
  kicker,
  launchPage,
  primaryActionHref = "/support#request",
  primaryActionLabel = primaryCta,
  primaryActionLabelKey,
  title,
  descriptionKey,
  heroPreview,
  kickerKey,
  titleKey,
}: {
  children: ReactNode;
  description: string;
  descriptionKey?: TranslationKey;
  heroPreview?: ReactNode;
  kicker: string;
  kickerKey?: TranslationKey;
  launchPage?: string;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  primaryActionLabelKey?: TranslationKey;
  title: string;
  titleKey?: TranslationKey;
}) {
  return (
    <main className="recovery-landing trust-page">
      <section className="recovery-hero trust-page-hero">
        <MarketingNav launchPage={launchPage} />

        <div className={`trust-page-hero-grid ${heroPreview ? "with-preview" : ""}`}>
          <div className="trust-page-intro">
            <p className="recovery-kicker">
              {kickerKey ? <LocalizedText fallback={kicker} k={kickerKey} /> : kicker}
            </p>
            <h1>{titleKey ? <LocalizedText fallback={title} k={titleKey} /> : title}</h1>
            <p>
              {descriptionKey ? (
                <LocalizedText fallback={description} k={descriptionKey} />
              ) : (
                description
              )}
            </p>
            <div className="recovery-hero-actions">
              <Link className="recovery-primary-button" href={primaryActionHref}>
                {primaryActionLabelKey ? (
                  <LocalizedText fallback={primaryActionLabel} k={primaryActionLabelKey} />
                ) : primaryActionLabel === primaryCta ? (
                  <MarketingLocalizedText fallback={primaryActionLabel} k="bookClinicDemo" />
                ) : (
                  primaryActionLabel
                )}
                <ArrowRight size={16} />
              </Link>
              <Link className="recovery-secondary-button" href="/demo">
                <MarketingLocalizedText fallback={secondaryCta} k="sampleDashboard" />
              </Link>
            </div>
            <div className="policy-updated">Effective date: {policyEffectiveDate}</div>
          </div>

          {heroPreview ? (
            <div className="trust-page-hero-preview">{heroPreview}</div>
          ) : null}
        </div>
      </section>

      <section className="trust-content">{children}</section>

      <MarketingFooter />
    </main>
  );
}
