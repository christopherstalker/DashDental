"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDashed,
  Clock3,
  CreditCard,
  Database,
  FileCheck2,
  FileClock,
  FileText,
  FormInput,
  Inbox,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageCircle,
  PlugZap,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { SupportRequestForm } from "@/features/support/components/support-request-form";
import { privacyEmail, securityEmail, supportEmail } from "@/features/marketing/content/dash-dental";
import { getTrustSupportCopy, type TrustControlCopy, type TrustStatusTone } from "@/features/marketing/content/trust-support";
import styles from "./landing-system.module.css";

const scopeIcons: LucideIcon[] = [
  Inbox,
  MessageCircle,
  Clock3,
  Radar,
  UserCheck,
  CreditCard,
];

const notScopeIcons: LucideIcon[] = [
  FileText,
  AlertTriangle,
  Bot,
  Database,
  ShieldAlert,
];

const controlIcons: Record<string, LucideIcon> = {
  "Tenant isolation": LockKeyhole,
  "Role-based access": UserCheck,
  "Provider token handling": KeyRound,
  "Audit trails": FileClock,
  "Webhook verification and idempotency": PlugZap,
  "Billing event ledger": CreditCard,
  "Support access boundaries": LifeBuoy,
  "Error and log redaction": ShieldCheck,
  "Backup and migration discipline": Database,
  "Rate limits and abuse prevention": ShieldAlert,
  "Ізоляція клієнтів": LockKeyhole,
  "Доступ за ролями": UserCheck,
  "Обробка токенів провайдерів": KeyRound,
  "Журнали аудиту": FileClock,
  "Перевірка та ідемпотентність вебхуків": PlugZap,
  "Журнал подій білінгу": CreditCard,
  "Межі доступу підтримки": LifeBuoy,
  "Редакція помилок і логів": ShieldCheck,
  "Дисципліна backup і міграцій": Database,
  "Rate limits і захист від зловживань": ShieldAlert,
  "Izolacja tenantów": LockKeyhole,
  "Dostęp oparty na rolach": UserCheck,
  "Obsługa tokenów providerów": KeyRound,
  "Logi audytowe": FileClock,
  "Weryfikacja i idempotencja webhooków": PlugZap,
  "Rejestr zdarzeń billing": CreditCard,
  "Granice dostępu supportu": LifeBuoy,
  "Redakcja błędów i logów": ShieldCheck,
  "Backup i dyscyplina migracji": Database,
  "Rate limits i ochrona przed nadużyciami": ShieldAlert,
};

const supportPathIcons: LucideIcon[] = [
  LifeBuoy,
  PlugZap,
  FormInput,
  Workflow,
  CreditCard,
  Sparkles,
  FileCheck2,
  ShieldAlert,
];

function StatusPill({ status, tone }: { status: string; tone: TrustStatusTone }) {
  return <span className={`${styles.statusPill} ${styles[tone]}`}>{status}</span>;
}

function TrustHero({
  badge,
  children,
  primaryCta,
  secondaryCta,
  subtitle,
  tertiaryCta,
  title,
}: {
  badge: string;
  children: React.ReactNode;
  primaryCta: string;
  secondaryCta: string;
  subtitle: string;
  tertiaryCta: string;
  title: string;
}) {
  return (
    <section className={styles.trustHero}>
      <div className={styles.trustHeroCopy}>
        <span className={styles.badge}>
          <ShieldCheck size={15} />
          {badge}
        </span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className={styles.heroActions}>
          <Link className={styles.buttonPrimary} href={`mailto:${securityEmail}`}>
            {primaryCta}
            <ArrowRight size={16} />
          </Link>
          <Link className={styles.buttonSecondary} href="/privacy">
            {secondaryCta}
          </Link>
          <Link className={styles.buttonGhost} href="/support#request">
            {tertiaryCta}
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}

function SupportHero({
  badge,
  primaryCta,
  proof,
  secondaryCta,
  subtitle,
  tertiaryCta,
  title,
}: {
  badge: string;
  primaryCta: string;
  proof: string[];
  secondaryCta: string;
  subtitle: string;
  tertiaryCta: string;
  title: string;
}) {
  return (
    <section className={styles.supportHero}>
      <div className={styles.trustHeroCopy}>
        <span className={styles.badge}>
          <LifeBuoy size={15} />
          {badge}
        </span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className={styles.heroActions}>
          <Link className={styles.buttonPrimary} href="#request">
            {primaryCta}
            <ArrowRight size={16} />
          </Link>
          <Link className={styles.buttonSecondary} href={`mailto:${supportEmail}?subject=Dash Dental onboarding`}>
            {secondaryCta}
          </Link>
          <Link className={styles.buttonGhost} href="/trial">
            {tertiaryCta}
          </Link>
        </div>
        <div className={styles.proofRail}>
          {proof.map((item) => (
            <span key={item}>
              <CheckCircle2 size={14} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <aside className={styles.supportSignalPanel} aria-label="Support operations preview">
        <div className={styles.supportSignalHeader}>
          <span>Support router</span>
          <strong>{supportEmail}</strong>
        </div>
        {[
          ["Integration degraded", "WhatsApp test event delayed", "High"],
          ["Billing question", "Growth invoice activation", "Normal"],
          ["AI draft review", "Tone too clinical", "Normal"],
        ].map(([title, detail, status]) => (
          <article key={title}>
            <span className={styles.liveDot} />
            <div>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
            <em>{status}</em>
          </article>
        ))}
      </aside>
    </section>
  );
}

function ScopeColumn({
  icons,
  intro,
  items,
  title,
  warning = false,
}: {
  icons: LucideIcon[];
  intro: string;
  items: string[];
  title: string;
  warning?: boolean;
}) {
  return (
    <article className={`${styles.scopeColumn} ${warning ? styles.warningColumn : ""}`}>
      <div className={styles.splitTitle}>
        <div>
          <strong>{title}</strong>
          <span>{intro}</span>
        </div>
        {warning ? <AlertTriangle size={20} /> : <Database size={20} />}
      </div>
      <div className={styles.scopeList}>
        {items.map((item, index) => {
          const Icon = icons[index % icons.length] ?? CheckCircle2;
          return (
            <span key={item}>
              <Icon size={15} />
              {item}
            </span>
          );
        })}
      </div>
    </article>
  );
}

function ControlCard({ control }: { control: TrustControlCopy }) {
  const Icon = controlIcons[control.title] ?? ShieldCheck;
  return (
    <article className={styles.controlCard}>
      <div className={styles.controlCardTop}>
        <span className={styles.iconTile}>
          <Icon size={18} />
        </span>
        <StatusPill status={control.status} tone={control.tone} />
      </div>
      <h3>{control.title}</h3>
      <p>{control.meaning}</p>
      <div className={styles.controlValue}>
        <span>Why clinics care</span>
        <strong>{control.clinicValue}</strong>
      </div>
    </article>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className={styles.checkList}>
      {items.map((item) => (
        <span key={item}>
          <CheckCircle2 size={15} />
          {item}
        </span>
      ))}
    </div>
  );
}

function FaqGrid({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <div className={styles.trustFaqGrid}>
      {items.map((item) => (
        <details className={styles.faqCard} key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function SecurityTrustContent() {
  const content = getTrustSupportCopy(useCurrentLanguageCode()).security;

  return (
    <>
      <TrustHero
        badge={content.hero.badge}
        primaryCta={content.hero.primaryCta}
        secondaryCta={content.hero.secondaryCta}
        subtitle={content.hero.subtitle}
        tertiaryCta={content.hero.tertiaryCta}
        title={content.hero.title}
      >
        <aside className={styles.trustCommandPanel} aria-label="Trust status summary">
          <div className={styles.trustCommandHeader}>
            <span>Dash Dental trust posture</span>
            <strong>No fake certification claims</strong>
          </div>
          <div className={styles.trustBadgeGrid}>
            {content.badges.map((badge) => (
              <span key={badge}>
                <ShieldCheck size={15} />
                {badge}
              </span>
            ))}
          </div>
          <div className={styles.trustContactStrip}>
            <Link href={`mailto:${securityEmail}`}>
              <Mail size={14} />
              {securityEmail}
            </Link>
            <Link href={`mailto:${privacyEmail}`}>
              <Mail size={14} />
              {privacyEmail}
            </Link>
          </div>
        </aside>
      </TrustHero>

      <section className={styles.section}>
        <div className={styles.scopeGrid}>
          <ScopeColumn
            icons={scopeIcons}
            intro={content.scope.handlesIntro}
            items={content.scope.handles}
            title={content.scope.handlesTitle}
          />
          <ScopeColumn
            icons={notScopeIcons}
            intro={content.scope.notHandlesIntro}
            items={content.scope.notHandles}
            title={content.scope.notHandlesTitle}
            warning
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>{content.controls.eyebrow}</span>
          <h2>{content.controls.title}</h2>
          <p>{content.controls.body}</p>
        </div>
        <div className={styles.controlGrid}>
          {content.controls.items.map((control) => (
            <ControlCard control={control} key={control.title} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.aiBoundaryPanel}>
          <div>
            <span className={styles.eyebrow}>{content.ai.eyebrow}</span>
            <h2>{content.ai.title}</h2>
            <p>{content.ai.body}</p>
            <div className={styles.reviewNote}>
              <UserCheck size={18} />
              <span>{content.ai.reviewNote}</span>
            </div>
          </div>
          <div className={styles.aiBoundaryGrid}>
            <article>
              <strong>{content.ai.canTitle}</strong>
              <Checklist items={content.ai.can} />
            </article>
            <article className={styles.warningColumn}>
              <strong>{content.ai.cannotTitle}</strong>
              <Checklist items={content.ai.cannot} />
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.compliancePanel}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>{content.compliance.eyebrow}</span>
            <h2>{content.compliance.title}</h2>
            <p>{content.compliance.body}</p>
          </div>
          <div className={styles.complianceGrid}>
            <article>
              <strong>{content.compliance.currentTitle}</strong>
              <Checklist items={content.compliance.current} />
            </article>
            <article>
              <strong>{content.compliance.roadmapTitle}</strong>
              <Checklist items={content.compliance.roadmap} />
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.incidentPanel}>
          <div>
            <span className={styles.eyebrow}>{content.incident.eyebrow}</span>
            <h2>{content.incident.title}</h2>
            <p>{content.incident.body}</p>
          </div>
          <div className={styles.incidentGrid}>
            {content.incident.categories.map((category) => (
              <article key={category.title}>
                <ShieldAlert size={18} />
                <strong>{category.title}</strong>
                <Link href={`mailto:${category.target}`}>{category.target}</Link>
                <p>{category.include}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionHeader} ${styles.center}`}>
          <span className={styles.eyebrow}>{content.faq.eyebrow}</span>
          <h2>{content.faq.title}</h2>
        </div>
        <FaqGrid items={content.faq.items} />
      </section>
    </>
  );
}

export function SupportHubContent() {
  const content = getTrustSupportCopy(useCurrentLanguageCode()).support;

  return (
    <>
      <SupportHero
        badge={content.hero.badge}
        primaryCta={content.hero.primaryCta}
        proof={content.proof}
        secondaryCta={content.hero.secondaryCta}
        subtitle={content.hero.subtitle}
        tertiaryCta={content.hero.tertiaryCta}
        title={content.hero.title}
      />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>{content.paths.eyebrow}</span>
          <h2>{content.paths.title}</h2>
          <p>{content.paths.body}</p>
        </div>
        <div className={styles.supportPathGrid}>
          {content.paths.items.map((path, index) => {
            const Icon = supportPathIcons[index % supportPathIcons.length] ?? LifeBuoy;
            return (
              <article className={styles.supportPathCard} key={path.title}>
                <Icon size={20} />
                <h3>{path.title}</h3>
                <p>{path.who}</p>
                <strong>{path.issues}</strong>
                <Link href="#request">
                  {path.cta}
                  <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.responsePanel}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>{content.expectations.eyebrow}</span>
            <h2>{content.expectations.title}</h2>
            <p>{content.expectations.body}</p>
          </div>
          <div className={styles.responseGrid}>
            {content.expectations.items.map((item) => (
              <article key={item.title}>
                <span>
                  <CircleDashed size={15} />
                  {item.channel}
                </span>
                <h3>{item.title}</h3>
                <strong>{item.response}</strong>
                <p>{item.include}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.supportWorkGrid}>
          <article className={styles.checklistPanel}>
            <span className={styles.eyebrow}>{content.checklist.eyebrow}</span>
            <h2>{content.checklist.title}</h2>
            <p>{content.checklist.body}</p>
            <Checklist items={content.checklist.items} />
            <div className={styles.reviewNote}>
              <AlertTriangle size={18} />
              <span>{content.checklist.note}</span>
            </div>
          </article>
          <div className={styles.formFrame}>
            <SupportRequestForm />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>{content.guides.eyebrow}</span>
          <h2>{content.guides.title}</h2>
          <p>{content.guides.body}</p>
        </div>
        <div className={styles.guideGrid}>
          {content.guides.items.map((guide) => (
            <article key={guide.title}>
              <strong>{guide.title}</strong>
              <ol>
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionHeader} ${styles.center}`}>
          <span className={styles.eyebrow}>{content.faq.eyebrow}</span>
          <h2>{content.faq.title}</h2>
        </div>
        <FaqGrid items={content.faq.items} />
      </section>
    </>
  );
}
