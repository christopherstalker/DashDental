import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CreditCard,
  Database,
  FileText,
  Inbox,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageCircle,
  PlugZap,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  UserCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getPlanCatalog, getPlanLimits } from "@/domain/business-rules";
import type { Subscription } from "@/domain/types";
import {
  integrationRows,
  pilotCta,
  privacyEmail,
  sampleConversations,
  securityEmail,
  supportEmail,
} from "@/features/marketing/content/dash-dental";
import {
  faqItems,
  policyEffectiveDate,
  privacySections,
  termsSections,
} from "@/features/marketing/content/trust";
import {
  SupportRequestForm,
  type InitialSupportRequest,
} from "@/features/support/components/support-request-form";
import { PublicAccountCta } from "./public-account-cta";

type RouteTone = "demo" | "docs" | "pricing" | "security" | "support" | "trust";

export type RedesignPageSection = {
  body?: string;
  cta?: {
    href: string;
    label: string;
  };
  eyebrow?: string;
  items?: Array<{
    body: string;
    icon?: LucideIcon;
    label?: string;
    title: string;
  }>;
  table?: {
    columns: string[];
    rows: string[][];
  };
  title: string;
};

export type RedesignContentPageProps = {
  body: string;
  current: RouteTone;
  eyebrow: string;
  primary?: {
    href: string;
    label: string;
  };
  secondary?: {
    href: string;
    label: string;
  };
  sections: RedesignPageSection[];
  title: string;
};

const navLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/demo", label: "Demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/support", label: "Support" },
] as const;

const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/demo", label: "Sample dashboard" },
      { href: "/pricing", label: "Pricing" },
      { href: "/integrations-guide", label: "Integrations" },
      { href: "/docs", label: "Docs" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/register", label: "Create account" },
      { href: "/login", label: "Sign in" },
      { href: "/workspaces", label: "Account hub" },
      { href: "/trial", label: "Launch details" },
    ],
  },
] as const;

const formatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function channelClass(channel: string): string {
  const normalized = channel.toLowerCase();

  if (normalized.includes("whatsapp")) return "whatsapp";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("telegram")) return "telegram";
  return "web_form";
}

function isActiveLink(current: RouteTone, href: string): boolean {
  if (current === "pricing") return href === "/pricing";
  if (current === "demo") return href === "/demo";
  if (current === "security") return href === "/security";
  if (current === "support") return href === "/support";
  return false;
}

export function MarketingRedesignShell({
  children,
  current,
}: {
  children: React.ReactNode;
  current: RouteTone;
}) {
  return (
    <main className="ddr-reset ddr-public-page">
      <header className="ddr-public-nav">
        <Link className="ddr-public-brand" href="/" aria-label="Dash Dental home">
          <span>
            <Image alt="" height={52} src="/dental-recovery-mark.png" unoptimized width={52} />
          </span>
          <strong>Dash Dental</strong>
        </Link>

        <nav aria-label="Primary navigation" className="ddr-public-links">
          {navLinks.map((link) => (
            <Link aria-current={isActiveLink(current, link.href) ? "page" : undefined} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ddr-public-actions">
          <ThemeToggle />
          <PublicAccountCta className="ddr-button ddr-button-primary" />
        </div>
      </header>

      {children}

      <footer className="ddr-public-footer">
        <div>
          <Link className="ddr-public-brand" href="/">
            <span>
              <Image alt="" height={52} src="/dental-recovery-mark.png" unoptimized width={52} />
            </span>
            <strong>Dash Dental</strong>
          </Link>
          <p>Unified patient inquiry recovery for dental clinics. Dash Dental (c) 2026.</p>
        </div>
        {footerGroups.map((group) => (
          <nav aria-label={group.title} key={group.title}>
            <strong>{group.title}</strong>
            {group.links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </footer>
    </main>
  );
}

function QueueVisual() {
  return (
    <aside className="ddr-public-visual" aria-label="Recovery queue preview">
      <div className="ddr-public-window">
        <div className="ddr-public-window-head">
          <span>Live recovery queue</span>
          <b>SLA-first</b>
        </div>
        <div className="ddr-public-queue">
          {sampleConversations.slice(0, 4).map((conversation) => (
            <article className="ddr-public-queue-row" key={conversation.intent}>
              <span className={`ddr-channel-dot ${channelClass(conversation.channel)}`}>{conversation.initials}</span>
              <div>
                <strong>{conversation.intent}</strong>
                <small>
                  {conversation.channel} - {conversation.waiting}
                </small>
              </div>
              <b>{conversation.value}</b>
            </article>
          ))}
        </div>
        <div className="ddr-public-ai-note">
          <Sparkles size={16} />
          <p>Drafts stay assistive. Staff reviews before any message is sent.</p>
        </div>
      </div>
    </aside>
  );
}

function SecurityVisual() {
  return (
    <aside className="ddr-public-visual" aria-label="Security controls preview">
      <div className="ddr-public-window">
        <div className="ddr-public-window-head">
          <span>Trust controls</span>
          <b>No compliance theater</b>
        </div>
        {[
          ["Tenant isolation", "Workspace-scoped access"],
          ["Human-reviewed AI", "Drafts do not send alone"],
          ["Data minimization", "Lead intake, not EHR"],
          ["Audit posture", "Events and admin actions logged"],
        ].map(([title, body]) => (
          <article className="ddr-public-control-row" key={title}>
            <ShieldCheck size={17} />
            <div>
              <strong>{title}</strong>
              <small>{body}</small>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function SupportVisual() {
  return (
    <aside className="ddr-public-visual" aria-label="Support workflow preview">
      <div className="ddr-public-window">
        <div className="ddr-public-window-head">
          <span>Support intake</span>
          <b>Context first</b>
        </div>
        {[
          ["Channel setup", "Provider, timestamp, affected clinic"],
          ["Billing", "Plan, invoice, workspace status"],
          ["AI drafts", "Prompt version, example thread"],
          ["Incident", "Severity, user, workspace, time"],
        ].map(([title, body]) => (
          <article className="ddr-public-control-row" key={title}>
            <LifeBuoy size={17} />
            <div>
              <strong>{title}</strong>
              <small>{body}</small>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

export function RedesignContentPage({
  body,
  current,
  eyebrow,
  primary,
  secondary,
  sections,
  title,
}: RedesignContentPageProps) {
  return (
    <MarketingRedesignShell current={current}>
      <section className="ddr-public-hero">
        <div>
          <span className="ddr-public-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{body}</p>
          <div className="ddr-public-hero-actions">
            {primary ? (
              <Link className="ddr-button ddr-button-primary" href={primary.href}>
                {primary.label}
                <ArrowRight size={15} />
              </Link>
            ) : null}
            {secondary ? (
              <Link className="ddr-button ddr-button-ghost" href={secondary.href}>
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
        <QueueVisual />
      </section>
      {sections.map((section) => (
        <section className="ddr-public-section" key={section.title}>
          <div className="ddr-public-section-head">
            {section.eyebrow ? <span>{section.eyebrow}</span> : null}
            <h2>{section.title}</h2>
            {section.body ? <p>{section.body}</p> : null}
          </div>
          {section.items ? (
            <div className="ddr-public-grid">
              {section.items.map((item) => {
                const Icon = item.icon ?? CheckCircle2;

                return (
                  <article className="ddr-public-card" key={item.title}>
                    <span className="ddr-public-icon">
                      <Icon size={18} />
                    </span>
                    {item.label ? <small>{item.label}</small> : null}
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                );
              })}
            </div>
          ) : null}
          {section.table ? <PublicTable table={section.table} /> : null}
          {section.cta ? (
            <Link className="ddr-button ddr-button-ghost" href={section.cta.href}>
              {section.cta.label}
              <ArrowRight size={15} />
            </Link>
          ) : null}
        </section>
      ))}
    </MarketingRedesignShell>
  );
}

function PublicTable({
  table,
}: {
  table: {
    columns: string[];
    rows: string[][];
  };
}) {
  return (
    <div className="ddr-public-table-wrap">
      <table className="ddr-public-table">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => (
                <td data-label={table.columns[index]} key={`${cell}-${index}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingRedesignPage() {
  const plans: Subscription["plan"][] = ["starter", "growth", "scale"];
  const rows = [
    ["Best for", "Single clinic launch", "Busy clinic", "Clinic group"],
    ["Connected channels", "5", "5", "12"],
    ["Team seats", "4", "10", "30"],
    ["Monthly messages", "2,000", "10,000", "40,000"],
    ["AI-assisted drafts", "120/mo", "600/mo", "2,500/mo"],
    ["Launch help", "Guided setup", "Priority onboarding", "Rollout planning"],
  ];

  return (
    <MarketingRedesignShell current="pricing">
      <section className="ddr-public-hero">
        <div>
          <span className="ddr-public-eyebrow">Clinic recovery pricing</span>
          <h1>Choose the smallest plan that proves the recovery workflow.</h1>
          <p>
            Start with one patient channel, prove the daily workflow, then add channels, staff, AI capacity,
            and owner reporting as clinic volume grows.
          </p>
          <div className="ddr-public-hero-actions">
            <Link className="ddr-button ddr-button-primary" href="/register">
              Create account
              <ArrowRight size={15} />
            </Link>
            <Link className="ddr-button ddr-button-ghost" href="/demo">
              View sample dashboard
            </Link>
          </div>
        </div>
        <QueueVisual />
      </section>

      <section className="ddr-public-section">
        <div className="ddr-public-section-head">
          <span>Plans</span>
          <h2>Release pricing: clear, low-friction, and easy to explain.</h2>
          <p>Annual billing includes a 17% discount. Guided onboarding can be added for $200-500.</p>
        </div>
        <div className="ddr-public-pricing-grid">
          {plans.map((plan) => {
            const catalog = getPlanCatalog(plan);
            const limits = getPlanLimits(plan);
            const featured = plan === "growth";

            return (
              <article className={`ddr-public-price-card ${featured ? "featured" : ""}`} key={plan}>
                {featured ? <span className="ddr-badge ddr-badge-ok">Most popular</span> : null}
                <h3>{catalog.label}</h3>
                <p>{catalog.summary}</p>
                <strong>
                  {formatter.format(catalog.monthlyPrice)}
                  <span>/mo</span>
                </strong>
                <ul>
                  {catalog.included.map((item) => (
                    <li key={item}>
                      <Check size={15} />
                      {item}
                    </li>
                  ))}
                  <li>
                    <Check size={15} />
                    {limits.maxUsers} seats, {limits.maxIntegrations} integrations
                  </li>
                </ul>
                <Link className="ddr-button ddr-button-primary" href="/register">
                  Create account
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ddr-public-section">
        <div className="ddr-public-section-head">
          <span>Comparison</span>
          <h2>Pick by front-desk pressure, not vague software tiers.</h2>
          <p>Higher plans increase channel, seat, message, and AI capacity while preserving the same workflow.</p>
        </div>
        <PublicTable table={{ columns: ["Capability", "Starter", "Pro", "Enterprise"], rows }} />
      </section>
    </MarketingRedesignShell>
  );
}

export function DemoRedesignPage() {
  return (
    <MarketingRedesignShell current="demo">
      <section className="ddr-public-hero">
        <div>
          <span className="ddr-public-eyebrow">Sample recovery cockpit</span>
          <h1>Try the product workflow before creating an account.</h1>
          <p>
            The sample shows how Dash Dental ranks unanswered patients, exposes response-time risk,
            prepares safe drafts, and keeps ownership clear for reception teams.
          </p>
          <div className="ddr-public-hero-actions">
            <Link className="ddr-button ddr-button-primary" href="/demo/start">
              Open live demo
              <ArrowRight size={15} />
            </Link>
            <Link className="ddr-button ddr-button-ghost" href="/register">
              {pilotCta}
            </Link>
          </div>
        </div>
        <QueueVisual />
      </section>

      <section className="ddr-public-section">
        <div className="ddr-public-section-head">
          <span>Demo workflow</span>
          <h2>A no-login view of the same operating rhythm reception uses.</h2>
          <p>Illustrative clinic data only. No live patient records are loaded in this public sample.</p>
        </div>
        <div className="ddr-public-demo-console">
          <div className="ddr-public-demo-main">
            <div className="ddr-public-window-head">
              <span>Priority queue</span>
              <b>Review first</b>
            </div>
            {sampleConversations.map((conversation) => (
              <article className="ddr-public-queue-row" key={conversation.intent}>
                <span className={`ddr-channel-dot ${channelClass(conversation.channel)}`}>{conversation.initials}</span>
                <div>
                  <strong>{conversation.name}</strong>
                  <small>{conversation.intent}</small>
                </div>
                <b>{conversation.value}</b>
              </article>
            ))}
          </div>
          <aside className="ddr-public-demo-side">
            <span>
              <Sparkles size={16} />
              AI draft panel
            </span>
            <p>{sampleConversations[1]?.draft}</p>
            <small>Draft only. Staff review required before sending.</small>
          </aside>
        </div>
      </section>
    </MarketingRedesignShell>
  );
}

export function SecurityRedesignPage() {
  const cards: Array<{ body: string; icon: LucideIcon; title: string }> = [
    {
      body: "Clinic workspaces are scoped by organization, role, and active membership.",
      icon: LockKeyhole,
      title: "Tenant isolation",
    },
    {
      body: "Summaries and drafts are assistive. Staff must review patient communication.",
      icon: Bot,
      title: "Human-reviewed AI",
    },
    {
      body: "Use Dash Dental for lead intake and recovery work, not unnecessary clinical history.",
      icon: Inbox,
      title: "Data minimization",
    },
    {
      body: `Security issues go to ${securityEmail}; privacy requests go to ${privacyEmail}.`,
      icon: AlertTriangle,
      title: "Incident path",
    },
  ];

  return (
    <MarketingRedesignShell current="security">
      <section className="ddr-public-hero">
        <div>
          <span className="ddr-public-eyebrow">Security and trust</span>
          <h1>Lead recovery should be useful, limited, and explainable.</h1>
          <p>
            Dash Dental is designed for patient inquiry intake, response workflows, and owner visibility.
            It is not an EHR, and AI does not send patient messages without staff review.
          </p>
          <div className="ddr-public-hero-actions">
            <Link className="ddr-button ddr-button-primary" href={`mailto:${securityEmail}`}>
              Contact security
              <ArrowRight size={15} />
            </Link>
            <Link className="ddr-button ddr-button-ghost" href="/privacy">
              Read privacy
            </Link>
          </div>
        </div>
        <SecurityVisual />
      </section>
      <section className="ddr-public-section">
        <div className="ddr-public-section-head">
          <span>Boundaries</span>
          <h2>No vague compliance claims, no autonomous clinical messaging.</h2>
          <p>The trust page is intentionally plain: what the product does, what it does not do, and who to contact.</p>
        </div>
        <div className="ddr-public-grid">
          {cards.map((card) => (
            <article className="ddr-public-card" key={card.title}>
              <span className="ddr-public-icon">
                <card.icon size={18} />
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingRedesignShell>
  );
}

export function SupportRedesignPage({
  initialRequest,
}: {
  initialRequest?: InitialSupportRequest;
}) {
  const cards: Array<{ body: string; icon: LucideIcon; title: string }> = [
    {
      body: "WhatsApp, Instagram, Telegram, website forms, and test submissions.",
      icon: PlugZap,
      title: "Channel setup",
    },
    {
      body: "Login, invites, roles, workspaces, and staff membership.",
      icon: UserCheck,
      title: "Workspace access",
    },
    {
      body: "Plan status, invoices, account access, and upgrade questions.",
      icon: CreditCard,
      title: "Billing",
    },
    {
      body: "Unsafe tone, missing context, summaries, and prompt behavior.",
      icon: Sparkles,
      title: "AI drafts",
    },
  ];

  return (
    <MarketingRedesignShell current="support">
      <section className="ddr-public-hero">
        <div>
          <span className="ddr-public-eyebrow">Support center</span>
          <h1>Get help launching and running Dash Dental.</h1>
          <p>
            Use one support path for onboarding, channels, billing, AI draft issues, privacy requests, and incident reports.
            Add context so support can reproduce the issue quickly.
          </p>
          <div className="ddr-public-hero-actions">
            <Link className="ddr-button ddr-button-primary" href="#request">
              Send support request
              <ArrowRight size={15} />
            </Link>
            <Link className="ddr-button ddr-button-ghost" href={`mailto:${supportEmail}`}>
              Email support
            </Link>
          </div>
        </div>
        <SupportVisual />
      </section>

      <section className="ddr-public-section">
        <div className="ddr-public-section-head">
          <span>Support paths</span>
          <h2>Route the request by the operational problem.</h2>
          <p>Include provider, timestamp, affected workspace, expected result, and what actually happened.</p>
        </div>
        <div className="ddr-public-grid">
          {cards.map((card) => (
            <article className="ddr-public-card" key={card.title}>
              <span className="ddr-public-icon">
                <card.icon size={18} />
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ddr-public-section ddr-public-form-section" id="request">
        <div className="ddr-public-section-head">
          <span>Request</span>
          <h2>Send context that helps support act.</h2>
          <p>Support can move faster when the request includes the clinic, channel, urgency, and expected outcome.</p>
        </div>
        <div className="ddr-public-form-card">
          <SupportRequestForm initialRequest={initialRequest} />
        </div>
      </section>
    </MarketingRedesignShell>
  );
}

export const staticPageContent = {
  about: {
    body:
      "Dash Dental is built for clinics where reception is already busy and patient demand arrives through scattered message channels.",
    current: "trust" as RouteTone,
    eyebrow: "About Dash Dental",
    sections: [
      {
        body: "The product is intentionally narrow: patient inquiry recovery, response-time risk, team ownership, and owner visibility.",
        eyebrow: "Focus",
        items: [
          { body: "Unanswered DMs, forms, and callbacks become one recovery queue.", icon: Inbox, title: "One patient intake surface" },
          { body: "Owners see leakage without turning reception into a finance dashboard.", icon: TrendingUp, title: "Owner-level visibility" },
          { body: "AI helps summarize and draft. Staff remains in control.", icon: Bot, title: "Human-reviewed AI" },
        ],
        title: "Built around one daily clinic workflow.",
      },
      {
        body: "Dash Dental is not a full EHR, not a clinical decision engine, and not a CRM migration project.",
        eyebrow: "Boundaries",
        items: [
          { body: "Keep medical records and diagnosis workflows in the systems designed for them.", icon: LockKeyhole, title: "Not a medical record" },
          { body: "Owners should see missed-message risk without forcing reception into a finance dashboard.", icon: TrendingUp, title: "Not business bloat" },
          { body: "The front desk stays responsible for patient replies and booking decisions.", icon: UserCheck, title: "Not autonomous messaging" },
        ],
        title: "Focused boundaries make the product easier to trust.",
      },
    ],
    title: "Built for dental teams that cannot afford to miss patient messages.",
  },
  docs: {
    body:
      "Use these docs as an operating guide for setup, channel checks, staff workflow, owner reports, and safe AI usage.",
    current: "docs" as RouteTone,
    eyebrow: "Product docs",
    sections: [
      {
        body: "Start narrow, validate real message flow, then add more channels and automation.",
        eyebrow: "Launch sequence",
        items: [
          { body: "Know if unanswered patients and money at risk are rising today.", icon: TrendingUp, title: "Read owner metrics" },
          { body: "Work the highest-risk unanswered patients before lower-value follow-up.", icon: Inbox, title: "Clear recovery queue" },
          { body: "Keep channel, patient context, suggested reply, and delivery state together.", icon: MessageCircle, title: "Use the inbox" },
          { body: "Summaries and drafts help reception move faster without automatic sends.", icon: Bot, title: "Review AI assist" },
          { body: "Keep roles, seats, setup, and plan limits visible before they block work.", icon: Users, title: "Check setup health" },
          { body: "Human review is required before sending patient replies.", icon: ShieldCheck, title: "Respect boundaries" },
        ],
        title: "Use Dash Dental as a daily missed-message recovery dashboard.",
      },
    ],
    title: "Use Dash Dental as a daily missed-message recovery dashboard.",
  },
  faq: {
    body:
      "Short answers for clinic owners and reception leads evaluating the product before connecting live patient channels.",
    current: "trust" as RouteTone,
    eyebrow: "FAQ",
    sections: [
      {
        items: faqItems.map((item) => ({
          body: item.answer,
          icon: CheckCircle2,
          title: item.question,
        })),
        title: "Everything a clinic asks before trusting a new recovery inbox.",
      },
    ],
    title: "Everything a clinic asks before trusting a new recovery inbox.",
  },
  integrations: {
    body:
      "Start with one channel, prove the workflow, then add the next source of patient demand.",
    current: "docs" as RouteTone,
    eyebrow: "Integrations",
    sections: [
      {
        body: "Each integration should be tested with sample messages before live clinic routing.",
        items: integrationRows.map((row) => ({
          body: `${row.captures} ${row.notes}`,
          icon: PlugZap,
          label: row.status,
          title: row.channel,
        })),
        table: {
          columns: ["Channel", "Captures", "Setup", "Status"],
          rows: integrationRows.map((row) => [row.channel, row.captures, row.setup, row.status]),
        },
        title: "Meet patients where they already message you.",
      },
    ],
    title: "Meet patients where they already message you.",
  },
  privacy: {
    body:
      "Patient communication data should stay limited, useful, and explainable to clinic teams.",
    current: "security" as RouteTone,
    eyebrow: "Privacy",
    sections: [
      {
        body: `Effective date: ${policyEffectiveDate}. Avoid uploading unnecessary clinical history. Use the product for lead intake, booking follow-up, and front-desk recovery workflows.`,
        items: privacySections.map((section) => ({
          body: section.body,
          icon: section.title.includes("rights") ? Mail : FileText,
          title: section.title,
        })),
        title: "Patient communication data should be useful, limited, and explainable.",
      },
      {
        body: `For export, deletion, retention, or privacy questions, contact ${privacyEmail}. Security reports go to ${securityEmail}; support questions go to ${supportEmail}.`,
        eyebrow: "Contacts",
        items: [
          { body: privacyEmail, icon: Mail, title: "Privacy requests" },
          { body: securityEmail, icon: ShieldCheck, title: "Security reports" },
          { body: supportEmail, icon: LifeBuoy, title: "Support questions" },
        ],
        title: "Use the right path for the request.",
      },
    ],
    title: "Patient communication data should be useful, limited, and explainable.",
  },
  terms: {
    body:
      "Dash Dental's commercial promise is simple: help clinics recover patient inquiries without pretending to be an EHR.",
    current: "security" as RouteTone,
    eyebrow: "Terms",
    sections: [
      {
        body: `Effective date: ${policyEffectiveDate}. These terms are a product-facing baseline and should be reviewed by counsel before enterprise contracts or regulated deployments.`,
        items: termsSections.map((section) => ({
          body: section.body,
          icon: section.title.includes("AI") ? Bot : FileText,
          title: section.title,
        })),
        title: "Clear rules make the SaaS safer to buy.",
      },
      {
        body: "Once clinics start paying, move serious customers into a proper order form or SaaS agreement that covers plan, price, data processing, support, liability, termination, and renewal rules.",
        eyebrow: "Commercial review",
        items: [
          { body: "Plan, price, seat limits, channels, message volume, and renewal rules.", icon: CreditCard, title: "Order form" },
          { body: "Support, uptime, integration responsibility, refund, and downgrade rules.", icon: ShieldCheck, title: "Operating terms" },
          { body: "Additional data-processing agreements where local regulation requires them.", icon: LockKeyhole, title: "Data terms" },
        ],
        title: "A public page is not a replacement for a signed contract.",
      },
    ],
    title: "Clear rules make the SaaS safer to buy.",
  },
  trial: {
    body:
      "Start a guided launch with one channel, a real reception workflow, and owner visibility from the beginning.",
    current: "pricing" as RouteTone,
    eyebrow: "Launch",
    primary: { href: "/register", label: "Create workspace" },
    secondary: { href: "/demo", label: "View sample dashboard" },
    sections: [
      {
        body: "A good launch proves whether the team can respond faster without replacing existing clinic systems.",
        items: [
          { body: "Connect one channel and verify test submissions.", icon: PlugZap, title: "Day 1" },
          { body: "Run assignment, templates, notes, and snooze with reception.", icon: Workflow, title: "Days 2-3" },
          { body: "Review response time, money at risk, and booked outcomes.", icon: TrendingUp, title: "Week 1" },
          { body: "Plan-gated screens stay clear if billing is not activated; owners keep read, setup, and export paths.", icon: LockKeyhole, title: "Plan access" },
          { body: "Launch records remain available for reasonable billing, support, and export workflows.", icon: Database, title: "Data retention" },
        ],
        title: "Launch Dash Dental without guessing what happens next.",
      },
    ],
    title: "Launch Dash Dental without guessing what happens next.",
  },
} satisfies Record<string, Omit<RedesignContentPageProps, "primary" | "secondary"> & Partial<Pick<RedesignContentPageProps, "primary" | "secondary">>>;
