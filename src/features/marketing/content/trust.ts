export const policyEffectiveDate = "April 28, 2026";

export const faqItems = [
  {
    answerKey: "faq.item.trial.a",
    question: "Can a clinic try Dash Dental before paying?",
    questionKey: "faq.item.trial.q",
    answer:
      "Yes. Every clinic can start with a 14-day guided trial, connect initial channels, invite the front-desk team, and validate whether the recovery queue fits their daily workflow before the first invoice.",
  },
  {
    answerKey: "faq.item.afterTrial.a",
    question: "What happens after the 14-day trial?",
    questionKey: "faq.item.afterTrial.q",
    answer:
      "The workspace moves into a locked state unless the owner activates a paid plan or receives a manual subscription grant from platform admin. Existing data remains visible to authorized owners for billing and export workflows.",
  },
  {
    answerKey: "faq.item.bank.a",
    question: "Do you support bank-transfer billing instead of cards?",
    questionKey: "faq.item.bank.q",
    answer:
      "Yes. The current launch path supports manual IBAN invoices, subscription status tracking, plan limits, and admin activation. Paddle or Stripe can be enabled later without changing the clinic workspace model.",
  },
  {
    answerKey: "faq.item.integrations.a",
    question: "Which integrations can be connected?",
    questionKey: "faq.item.integrations.q",
    answer:
      "The platform is designed around messaging channels such as website forms, Telegram, WhatsApp, and Instagram. Start with one channel; provider approvals may be required for some Meta channels.",
  },
  {
    answerKey: "faq.item.ai.a",
    question: "Is AI required for the product to work?",
    questionKey: "faq.item.ai.q",
    answer:
      "No. Core SLA, lost revenue, inbox, and billing rules are deterministic. AI is used as an assistant for summaries and recommendations, not as the source of truth for billing, access, or medical decisions.",
  },
  {
    answerKey: "faq.item.seats.a",
    question: "Can several employees work inside one clinic account?",
    questionKey: "faq.item.seats.q",
    answer:
      "Yes. Plans include seats. Each team member has their own membership, role, and activity trail so notes, actions, and ownership are not mixed between employees.",
  },
  {
    answerKey: "faq.item.records.a",
    question: "Can this be used for medical records?",
    questionKey: "faq.item.records.q",
    answer:
      "Dash Dental is built for lead intake and front-desk communication. Clinics should avoid uploading unnecessary clinical records. Regulated health-data workflows require the right contract, local compliance review, and, where applicable, a BAA or equivalent data-processing agreement.",
  },
  {
    answerKey: "faq.item.providerDown.a",
    question: "What if an integration provider is down?",
    questionKey: "faq.item.providerDown.q",
    answer:
      "The system is designed to make channel delivery issues visible so support and the clinic team can recover missed inquiries where provider APIs allow it.",
  },
] as const;

export const securityControls = [
  {
    title: "Tenant isolation",
    text: "Every clinic workspace is scoped by organization and user membership. Cross-tenant access is treated as a critical security defect.",
  },
  {
    title: "Role-based access",
    text: "Owners, admins, and staff seats are separated so billing, team management, and operational inbox work do not share the same permission surface.",
  },
  {
    title: "Encryption in transit",
    text: "Production traffic is served over HTTPS. Secrets and provider tokens are never intentionally exposed to browser-side code.",
  },
  {
    title: "Auditability",
    text: "Commercial grants, support operations, team changes, and critical runtime jobs are designed to leave an operator-readable trail.",
  },
  {
    title: "Channel delivery controls",
    text: "Inbound integrations should use provider signature checks where available, duplicate handling, and visible recovery paths for failed deliveries.",
  },
  {
    title: "Data retention controls",
    text: "Operational records have explicit retention intent for support, billing, audit, and lifecycle sweep workflows instead of indefinite mystery storage.",
  },
  {
    title: "AI boundaries",
    text: "AI assists with summaries and reply suggestions, while medical decisions, billing, entitlements, access, and compliance truth stay deterministic.",
  },
  {
    title: "Least privilege operations",
    text: "Admin actions are separated from clinic actions. Manual subscription grants and support replays should be visible, deliberate, and reversible where possible.",
  },
] as const;

export const securityCommitments = [
  "We do not sell patient or clinic data.",
  "We do not use AI output as the final source of truth for billing, authorization, or clinical decisions.",
  "We avoid claiming SOC 2, HIPAA, or ISO certification until an actual assessment and required contracts exist.",
  "We keep public security promises aligned with implemented controls instead of marketing fantasy.",
  "We design new integrations with retry visibility and clinic-scoped configuration from day one.",
] as const;

export const privacySections = [
  {
    title: "Data we process",
    body:
      "Clinic account data, team member profiles, integration configuration, lead intake data, message metadata, operational notes, support events, and billing/subscription records needed to run the service.",
  },
  {
    title: "Why we process it",
    body:
      "To provide the inbox, SLA queue, lead recovery dashboard, team collaboration, integration setup, support debugging, billing administration, abuse prevention, and service reliability.",
  },
  {
    title: "Clinic responsibility",
    body:
      "Clinics are responsible for having a lawful basis to send patient communications into Dash Dental and for avoiding unnecessary clinical-history uploads when the product is used for lead intake.",
  },
  {
    title: "Subprocessors",
    body:
      "The service may rely on infrastructure, database, hosting, messaging-provider, AI, and billing vendors. Production vendor choices should be documented and reviewed before enterprise or regulated deployments.",
  },
  {
    title: "Retention and deletion",
    body:
      "Operational data should be retained only as long as needed for service delivery, billing, audit, support, and legal obligations. Enterprise customers can request stricter retention and export workflows.",
  },
  {
    title: "Individual rights",
    body:
      "Where GDPR or similar law applies, individuals may have rights to access, correction, deletion, restriction, portability, objection, and transparency. Dash Dental assists clinics with reasonable data requests.",
  },
] as const;

export const termsSections = [
  {
    title: "Service scope",
    body:
      "Dash Dental provides lead intake, unified inbox, SLA tracking, revenue-risk visibility, team workflows, integration setup, AI-assisted summaries, and subscription administration for dental clinics.",
  },
  {
    title: "Trial and payment",
    body:
      "The standard trial is 14 days. After trial expiration, paid access requires an active plan, manual invoice activation, or another approved commercial arrangement.",
  },
  {
    title: "Acceptable use",
    body:
      "Clinics must not use the service for spam, unlawful messaging, credential sharing, unauthorized scraping, malware, harassment, or storing data they are not permitted to process.",
  },
  {
    title: "Integrations",
    body:
      "Third-party channels such as Meta, WhatsApp, Telegram, and website forms may change APIs, rate limits, approval rules, or availability. Dash Dental will make reasonable efforts to detect and recover from provider failures.",
  },
  {
    title: "AI limitations",
    body:
      "AI features are assistance tools. They may be incomplete or incorrect and must not be treated as medical advice, legal advice, or an autonomous decision-maker.",
  },
  {
    title: "Availability",
    body:
      "The platform is designed for reliable service, but no SaaS can guarantee uninterrupted third-party integrations, network availability, payment provider delivery, or external channel delivery.",
  },
] as const;

export const trustLinks = [
  {
    href: "/qa",
    title: "Q&A",
    titleKey: "trust.link.faq.title",
    text: "Buyer questions, launch flow, integrations, trial, billing, seats, and AI boundaries.",
    textKey: "trust.link.faq.text",
  },
  {
    href: "/security",
    title: "Security policy",
    titleKey: "trust.link.security.title",
    text: "Clinic workspace separation, access control, channel reliability, auditability, and incident posture.",
    textKey: "trust.link.security.text",
  },
  {
    href: "/privacy",
    title: "Privacy policy",
    titleKey: "trust.link.privacy.title",
    text: "Data categories, processing purposes, retention, subprocessors, and GDPR-style rights.",
    textKey: "trust.link.privacy.text",
  },
  {
    href: "/terms",
    title: "Terms",
    titleKey: "trust.link.terms.title",
    text: "Trial, payment, acceptable use, integrations, AI limitations, and availability boundaries.",
    textKey: "trust.link.terms.text",
  },
] as const;
