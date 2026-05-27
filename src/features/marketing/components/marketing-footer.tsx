import Link from "next/link";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { MarketingLocalizedText } from "@/features/marketing/components/marketing-localized-text";
import { privacyEmail, securityEmail, supportEmail } from "@/features/marketing/content/dash-dental";

const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/demo", label: "Sample dashboard" },
      { href: "/integrations-guide", label: "Integrations" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/support", label: "Support" },
      { href: "/about", label: "About" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="marketing-footer ddr-marketing-footer">
      <div className="marketing-footer-brand">
        <strong>Dash Dental</strong>
        <p>
          Missed-message recovery for dental clinics: prioritized patient queues, lead
          intake only, human-reviewed AI assistance, and clear privacy boundaries.
        </p>
      </div>

      <div className="marketing-footer-links">
        {footerGroups.map((group) => (
          <nav aria-label={group.title} key={group.title}>
            <strong>
              {group.title === "Product" ? (
                <LocalizedText fallback={group.title} k="common.nav.platform" />
              ) : (
                group.title
              )}
            </strong>
            {group.links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label === "How it works" ? (
                  <MarketingLocalizedText fallback={link.label} k="howItWorks" />
                ) : link.label === "Sample dashboard" ? (
                  <MarketingLocalizedText fallback={link.label} k="sampleDashboard" />
                ) : link.label === "Pricing" ? (
                  <LocalizedText fallback={link.label} k="common.nav.pricing" />
                ) : link.label === "Security" ? (
                  <LocalizedText fallback={link.label} k="common.nav.security" />
                ) : link.label === "Privacy" ? (
                  <LocalizedText fallback={link.label} k="common.cta.privacyPolicy" />
                ) : link.label === "Terms" ? (
                  <LocalizedText fallback={link.label} k="trust.link.terms.title" />
                ) : link.label === "Support" ? (
                  <MarketingLocalizedText fallback={link.label} k="support" />
                ) : link.label === "About" ? (
                  <MarketingLocalizedText fallback={link.label} k="about" />
                ) : (
                  link.label
                )}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="marketing-footer-contact">
        <strong>
          <MarketingLocalizedText fallback="Contact" k="contact" />
        </strong>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        <a href={`mailto:${securityEmail}`}>{securityEmail}</a>
        <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
      </div>

      <div className="marketing-footer-bottom">
        <span>Copyright 2026 Dash Dental. All rights reserved.</span>
        <span>No SOC 2, HIPAA, or ISO certification is claimed unless explicitly completed.</span>
      </div>
    </footer>
  );
}
