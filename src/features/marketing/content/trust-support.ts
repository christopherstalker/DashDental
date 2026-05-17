export type TrustSupportLocale = "en" | "uk" | "pl";

export type TrustStatusTone = "implemented" | "foundation" | "planned";

export interface TrustControlCopy {
  title: string;
  meaning: string;
  clinicValue: string;
  status: string;
  tone: TrustStatusTone;
}

export interface TrustFaqCopy {
  question: string;
  answer: string;
}

export interface SecurityTrustCopy {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
  };
  badges: string[];
  scope: {
    handlesTitle: string;
    handlesIntro: string;
    notHandlesTitle: string;
    notHandlesIntro: string;
    handles: string[];
    notHandles: string[];
  };
  controls: {
    eyebrow: string;
    title: string;
    body: string;
    items: TrustControlCopy[];
  };
  ai: {
    eyebrow: string;
    title: string;
    body: string;
    canTitle: string;
    cannotTitle: string;
    can: string[];
    cannot: string[];
    reviewNote: string;
  };
  compliance: {
    eyebrow: string;
    title: string;
    body: string;
    currentTitle: string;
    current: string[];
    roadmapTitle: string;
    roadmap: string[];
  };
  incident: {
    eyebrow: string;
    title: string;
    body: string;
    categories: Array<{
      title: string;
      target: string;
      include: string;
    }>;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: TrustFaqCopy[];
  };
}

export interface SupportPathCopy {
  title: string;
  who: string;
  issues: string;
  cta: string;
}

export interface SupportExpectationCopy {
  title: string;
  channel: string;
  response: string;
  include: string;
}

export interface SupportGuideCopy {
  title: string;
  steps: string[];
}

export interface SupportFormCopy {
  title: string;
  description: string;
  tabs: {
    issue: string;
    feedback: string;
  };
  labels: {
    name: string;
    clinic: string;
    email: string;
    category: string;
    urgency: string;
    channel: string;
    message: string;
    screenshots: string;
  };
  placeholders: {
    name: string;
    clinic: string;
    email: string;
    message: string;
  };
  categories: string[];
  urgencies: string[];
  channels: string[];
  privacyNote: string;
  submitIssue: string;
  submitFeedback: string;
  sending: string;
  success: string;
  error: string;
}

export interface SupportHubCopy {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
  };
  proof: string[];
  paths: {
    eyebrow: string;
    title: string;
    body: string;
    items: SupportPathCopy[];
  };
  expectations: {
    eyebrow: string;
    title: string;
    body: string;
    items: SupportExpectationCopy[];
  };
  checklist: {
    eyebrow: string;
    title: string;
    body: string;
    items: string[];
    note: string;
  };
  guides: {
    eyebrow: string;
    title: string;
    body: string;
    items: SupportGuideCopy[];
  };
  form: SupportFormCopy;
  faq: {
    eyebrow: string;
    title: string;
    items: TrustFaqCopy[];
  };
}

export interface TrustSupportCopy {
  security: SecurityTrustCopy;
  support: SupportHubCopy;
}

const english: TrustSupportCopy = {
  security: {
    hero: {
      badge: "Trust center",
      title: "Security, privacy, and AI boundaries for patient inquiry recovery",
      subtitle:
        "Dash Dental is designed for patient inquiry workflows, revenue recovery, and human-reviewed communication. We separate lead intake from clinical decision-making and keep security claims honest.",
      primaryCta: "Contact security",
      secondaryCta: "View privacy policy",
      tertiaryCta: "Talk to support",
    },
    badges: [
      "Tenant-scoped workspaces",
      "Audit logs",
      "Human-reviewed AI drafts",
      "Webhook idempotency",
      "No fake compliance badges",
    ],
    scope: {
      handlesTitle: "What Dash Dental handles",
      handlesIntro:
        "The product is intentionally focused on front-desk recovery work, not clinical systems of record.",
      notHandlesTitle: "What Dash Dental does not claim to handle",
      notHandlesIntro:
        "These boundaries should remain clear in sales, onboarding, support, and clinic training.",
      handles: [
        "Patient inquiries and message history",
        "Channel metadata and integration status",
        "Lead status, SLA timers, and first-response metrics",
        "Estimated revenue at risk and recovery outcomes",
        "Staff activity, roles, notes, and audit events",
        "Billing, usage, and support metadata",
      ],
      notHandles: [
        "Full medical records or certified EHR workflows",
        "Diagnosis, treatment approval, or clinical decision-making",
        "Autonomous medical advice or staff replacement",
        "Final billing, insurance, or eligibility truth",
        "Compliance certification without formal audits and agreements",
      ],
    },
    controls: {
      eyebrow: "Security controls",
      title: "Specific controls buyers can evaluate",
      body:
        "Each control is described by what it means, why it matters to clinics, and the current implementation posture.",
      items: [
        {
          title: "Tenant isolation",
          meaning: "Clinic workspaces are scoped by organization and membership.",
          clinicValue: "Prevents one clinic from seeing another clinic's conversations, users, or billing state.",
          status: "Implemented",
          tone: "implemented",
        },
        {
          title: "Role-based access",
          meaning: "Owner, admin, manager, staff, and support roles keep sensitive areas narrower.",
          clinicValue: "Reception can work the queue without broad billing or platform-admin access.",
          status: "Implemented",
          tone: "implemented",
        },
        {
          title: "Provider token handling",
          meaning: "Provider credentials belong in server-side configuration and operational stores.",
          clinicValue: "Reduces the chance of channel secrets appearing in browser bundles or screenshots.",
          status: "Foundation in place",
          tone: "foundation",
        },
        {
          title: "Audit trails",
          meaning: "Sensitive workflow actions are designed to leave operator-readable events.",
          clinicValue: "Owners and support can investigate subscription grants, notes, team changes, and retries.",
          status: "Foundation in place",
          tone: "foundation",
        },
        {
          title: "Webhook verification and idempotency",
          meaning: "Inbound events use provider checks where available and duplicate-safe processing.",
          clinicValue: "Provider retries should not create duplicate patients or inflate recovery numbers.",
          status: "Implemented",
          tone: "implemented",
        },
        {
          title: "Billing event ledger",
          meaning: "Plan status, manual activation, holds, and billing actions are treated as auditable events.",
          clinicValue: "Keeps subscription decisions explainable when clinics ask why access changed.",
          status: "Implemented",
          tone: "implemented",
        },
        {
          title: "Support access boundaries",
          meaning: "Support actions should be scoped, deliberate, and visible rather than silent admin edits.",
          clinicValue: "Makes troubleshooting safer without turning support into an invisible operator.",
          status: "Foundation in place",
          tone: "foundation",
        },
        {
          title: "Error and log redaction",
          meaning: "Health checks and public errors should avoid exposing secrets, tokens, and credentials.",
          clinicValue: "Protects operational details when something fails in production.",
          status: "Implemented",
          tone: "implemented",
        },
        {
          title: "Backup and migration discipline",
          meaning: "Data export, retention, backup, and migration playbooks need formal operating procedures.",
          clinicValue: "Important for larger clinics that need documented recovery and exit paths.",
          status: "Planned / roadmap",
          tone: "planned",
        },
        {
          title: "Rate limits and abuse prevention",
          meaning: "Public auth and intake surfaces should resist automated abuse and unsafe volume.",
          clinicValue: "Keeps clinic workspaces stable when public endpoints are exposed.",
          status: "Foundation in place",
          tone: "foundation",
        },
      ],
    },
    ai: {
      eyebrow: "AI boundaries",
      title: "AI assists the workflow. Clinic staff stays in control.",
      body:
        "AI is used for communication support around patient inquiries. Deterministic business rules and human review remain the source of truth.",
      canTitle: "AI can",
      cannotTitle: "AI cannot",
      can: [
        "Summarize patient intent",
        "Draft receptionist-safe replies",
        "Suggest the next action",
        "Detect response risk",
        "Highlight follow-up urgency",
      ],
      cannot: [
        "Diagnose or approve treatment",
        "Make clinical decisions",
        "Replace clinic staff",
        "Override deterministic business rules",
        "Become billing or compliance truth",
      ],
      reviewNote:
        "AI drafts require human review unless a clinic explicitly configures automation for a narrow, approved workflow.",
    },
    compliance: {
      eyebrow: "Compliance posture",
      title: "Designed for readiness, not fake certification",
      body:
        "Dash Dental is designed with controls that support future compliance readiness, but certifications require formal audits, legal agreements, and operating procedures.",
      currentTitle: "Current posture",
      current: [
        "Not currently SOC 2 certified",
        "Not currently ISO 27001 certified",
        "No HIPAA/BAA claim without a separate signed agreement",
        "Not intended to store full medical records",
      ],
      roadmapTitle: "Roadmap posture",
      roadmap: [
        "Document subprocessors before regulated enterprise rollout",
        "Formalize data retention and export procedures",
        "Prepare DPA/BAA-style workflows where legally required",
        "Keep public claims aligned with completed audits",
      ],
    },
    incident: {
      eyebrow: "Incident and contact",
      title: "Use the right path for sensitive reports",
      body:
        "Do not email unnecessary patient medical history. Include enough technical context for triage and keep patient examples minimized.",
      categories: [
        {
          title: "Security report",
          target: "security@dashdental.space",
          include: "Affected URL, reproduction steps, screenshots with patient data hidden, and contact details.",
        },
        {
          title: "Support request",
          target: "support@dashdental.space",
          include: "Clinic workspace, affected channel, timestamp, expected behavior, and business impact.",
        },
        {
          title: "Privacy request",
          target: "privacy@dashdental.space",
          include: "Request type, clinic workspace, requester role, and the minimum data needed to identify the record.",
        },
      ],
    },
    faq: {
      eyebrow: "Trust FAQ",
      title: "Answers buyers ask before connecting channels",
      items: [
        {
          question: "Is Dash Dental an EHR?",
          answer:
            "No. Dash Dental is a lead-intake, inbox, SLA, and revenue recovery platform for patient inquiries.",
        },
        {
          question: "Is AI allowed to send replies automatically?",
          answer:
            "The default posture is human review before sending. Automation should only be enabled for narrow workflows a clinic explicitly approves.",
        },
        {
          question: "What happens if a webhook fails?",
          answer:
            "Inbound webhook processing is designed to be idempotent and observable so provider retries do not duplicate records and support can investigate failures.",
        },
        {
          question: "How are clinic workspaces separated?",
          answer:
            "Workspace access is scoped by organization membership and role. Cross-clinic access is treated as a critical defect.",
        },
        {
          question: "Can clinic data be exported?",
          answer:
            "Export and retention workflows should be handled through support or privacy requests until formal self-serve export is available.",
        },
        {
          question: "Does Dash Dental store full medical records?",
          answer:
            "No. Clinics should avoid uploading unnecessary clinical history and use the product for inquiry recovery workflows.",
        },
        {
          question: "Is Dash Dental HIPAA, SOC 2, or ISO certified?",
          answer:
            "No public certification claim is made here. Certification requires formal audits and signed legal agreements.",
        },
        {
          question: "How do we report a security issue?",
          answer:
            "Email security@dashdental.space with reproduction steps, affected surfaces, and minimized evidence.",
        },
      ],
    },
  },
  support: {
    hero: {
      badge: "Support center",
      title: "Get help launching and running Dash Dental",
      subtitle:
        "Find help with onboarding, channel setup, billing, delivery issues, AI drafts, and clinic team workflows.",
      primaryCta: "Contact support",
      secondaryCta: "Book onboarding call",
      tertiaryCta: "View setup guide",
    },
    proof: ["Business-day support", "Safe patient-data handling", "Integration troubleshooting"],
    paths: {
      eyebrow: "Support paths",
      title: "Route the request so it reaches the right owner",
      body:
        "Each path explains who it is for, common issues, and the best next step.",
      items: [
        {
          title: "Onboarding help",
          who: "For owners and front-desk leads starting the first workspace.",
          issues: "Launch checklist, team roles, first channel, training flow.",
          cta: "Book onboarding",
        },
        {
          title: "Connect WhatsApp, Instagram, or Telegram",
          who: "For admins handling provider access and approvals.",
          issues: "Meta permissions, test messages, token expiry, provider review.",
          cta: "Get channel help",
        },
        {
          title: "Website form setup",
          who: "For clinics routing website inquiries into Dash Dental.",
          issues: "Webhook secret, test submissions, campaign landing pages.",
          cta: "Review form setup",
        },
        {
          title: "Inbox and SLA workflow",
          who: "For reception teams using the recovery queue daily.",
          issues: "Priorities, first-response timers, ownership, notes, outcomes.",
          cta: "Fix workflow",
        },
        {
          title: "Billing and invoices",
          who: "For owners managing plan, trial, invoice, or read-only status.",
          issues: "Manual invoice, failed payment, plan limits, cancellation.",
          cta: "Contact billing",
        },
        {
          title: "AI draft behavior",
          who: "For teams reviewing summaries, drafts, and next actions.",
          issues: "Missing summary, unsafe wording, low confidence, rule boundaries.",
          cta: "Review AI output",
        },
        {
          title: "Data export or privacy requests",
          who: "For owners or authorized clinic contacts.",
          issues: "Export, deletion, retention, patient-data request, audit review.",
          cta: "Open privacy path",
        },
        {
          title: "Incident or outage report",
          who: "For urgent production issues or suspected data exposure.",
          issues: "Delivery stopped, account risk, integration outage, security concern.",
          cta: "Report incident",
        },
      ],
    },
    expectations: {
      eyebrow: "Response expectations",
      title: "Clear urgency without pretending to be 24/7",
      body:
        "Targets are first-response goals during business days, not guaranteed service-level commitments.",
      items: [
        {
          title: "Critical production issue",
          channel: "Email support and mark urgency as critical",
          response: "Same business day target",
          include: "Clinic workspace, affected channel, number of missed inquiries, and current workaround.",
        },
        {
          title: "Integration degraded",
          channel: "Support request with affected provider",
          response: "One business day target",
          include: "Provider, timestamps, sample event IDs, and screenshots with patient data hidden.",
        },
        {
          title: "Billing issue",
          channel: "Support request or owner email",
          response: "One to two business days",
          include: "Plan, invoice reference, owner email, and expected billing state.",
        },
        {
          title: "Onboarding question",
          channel: "Onboarding call or support request",
          response: "Two business days",
          include: "Launch stage, team size, channels, and current blocker.",
        },
        {
          title: "Product feedback",
          channel: "Feature feedback form",
          response: "Reviewed during planning",
          include: "Workflow, affected role, frequency, and business impact.",
        },
      ],
    },
    checklist: {
      eyebrow: "Before contacting support",
      title: "Send context that helps support reproduce the issue",
      body:
        "Short, specific reports get resolved faster and reduce unnecessary patient-data exposure.",
      items: [
        "Clinic workspace name",
        "Affected channel",
        "Conversation or patient example with minimized data",
        "Approximate timestamp and timezone",
        "Screenshot with sensitive data hidden",
        "Integration provider",
        "Billing plan or trial status",
        "Expected behavior versus actual behavior",
      ],
      note:
        "Do not email unnecessary medical records or clinical history. Dash Dental is for patient inquiry workflows.",
    },
    guides: {
      eyebrow: "Troubleshooting guides",
      title: "Start with the most common operational failures",
      body:
        "These checks help a clinic identify whether the issue is setup, provider delivery, permissions, billing state, or AI output.",
      items: [
        {
          title: "Webhook not arriving",
          steps: [
            "Confirm the provider endpoint is active.",
            "Check the webhook secret or signature configuration.",
            "Send a test submission and note the timestamp.",
          ],
        },
        {
          title: "Message failed to send",
          steps: [
            "Check channel connection status.",
            "Confirm provider permissions and rate limits.",
            "Queue a safe manual follow-up while support reviews delivery logs.",
          ],
        },
        {
          title: "Integration disconnected",
          steps: [
            "Identify the provider and clinic workspace.",
            "Reconnect or refresh the provider token if prompted.",
            "Send support the last successful message time.",
          ],
        },
        {
          title: "Billing locked or read-only",
          steps: [
            "Confirm trial end date and current plan.",
            "Check whether a manual invoice or read-only hold is active.",
            "Ask the owner or platform support to review billing status.",
          ],
        },
        {
          title: "AI summary missing",
          steps: [
            "Confirm the conversation has enough message context.",
            "Check plan AI limits and recent usage.",
            "Use a human-written reply while the summary regenerates.",
          ],
        },
        {
          title: "Dashboard metrics look wrong",
          steps: [
            "Check filters, timezone, and channel selection.",
            "Compare the conversation queue with recovered outcomes.",
            "Send support examples of expected versus displayed values.",
          ],
        },
        {
          title: "Team member cannot access workspace",
          steps: [
            "Confirm the email used for invitation.",
            "Check role, membership status, and active clinic workspace.",
            "Ask an owner or admin to resend access.",
          ],
        },
      ],
    },
    form: {
      title: "Send a support request",
      description:
        "Use this form for bugs, integration issues, billing questions, AI draft concerns, onboarding blockers, and product feedback.",
      tabs: {
        issue: "Support issue",
        feedback: "Feature feedback",
      },
      labels: {
        name: "Your name",
        clinic: "Clinic",
        email: "Work email",
        category: "Issue category",
        urgency: "Urgency",
        channel: "Affected channel",
        message: "Message",
        screenshots: "Screenshots (optional)",
      },
      placeholders: {
        name: "Name",
        clinic: "Clinic name",
        email: "you@clinic.com",
        message:
          "Describe what happened, what you expected, and any safe examples support can use.",
      },
      categories: [
        "Onboarding",
        "Integration",
        "Website form",
        "Inbox or SLA",
        "Billing",
        "AI draft",
        "Privacy or export",
        "Incident or outage",
        "Bug",
        "Feature idea",
      ],
      urgencies: ["Normal", "High", "Critical production issue"],
      channels: ["Not channel-specific", "WhatsApp", "Instagram", "Telegram", "Website form", "Billing", "AI"],
      privacyNote:
        "Attach screenshots only when useful. Hide patient medical details whenever possible.",
      submitIssue: "Send support request",
      submitFeedback: "Send feedback",
      sending: "Sending...",
      success: "Request received.",
      error: "Could not send the request. Try again.",
    },
    faq: {
      eyebrow: "Support FAQ",
      title: "Common questions before opening a ticket",
      items: [
        {
          question: "How do I connect a channel?",
          answer:
            "Start with one channel, confirm provider access, send a test message, and verify it appears in the recovery queue.",
        },
        {
          question: "Can you help migrate old patient messages?",
          answer:
            "Support can discuss safe import options, but Dash Dental should not be used as a full archive of medical records.",
        },
        {
          question: "What if Stripe payment fails?",
          answer:
            "Contact support with the owner email and plan. Manual invoice activation may be available while card billing is reviewed.",
        },
        {
          question: "What if a provider webhook is delayed?",
          answer:
            "Send the provider, timestamp, event ID if available, and affected channel. The system is designed for duplicate-safe retries.",
        },
        {
          question: "Can staff see billing?",
          answer:
            "Billing surfaces should be limited by role. Owners and admins typically manage plan and invoice state.",
        },
        {
          question: "Can AI send replies automatically?",
          answer:
            "The default support posture is human-reviewed drafts. Any automation must be explicitly approved by the clinic.",
        },
        {
          question: "Can I export data?",
          answer:
            "Export requests should be sent through privacy or support until self-serve exports are formally available.",
        },
        {
          question: "How do I cancel?",
          answer:
            "Contact support from an owner email with the clinic workspace and requested cancellation date.",
        },
      ],
    },
  },
};

const ukrainian: TrustSupportCopy = {
  security: {
    hero: {
      badge: "Центр довіри",
      title: "Безпека, приватність і межі AI для повернення звернень пацієнтів",
      subtitle:
        "Dash Dental створено для звернень пацієнтів, повернення виручки та повідомлень, які перевіряє людина. Ми відокремлюємо лід-інтейк від клінічних рішень і не перебільшуємо заяви про безпеку.",
      primaryCta: "Написати щодо безпеки",
      secondaryCta: "Політика приватності",
      tertiaryCta: "Звернутися в підтримку",
    },
    badges: [
      "Робочі простори клінік",
      "Журнали аудиту",
      "AI-чернетки з перевіркою людиною",
      "Ідемпотентні вебхуки",
      "Без фейкових сертифікатів",
    ],
    scope: {
      handlesTitle: "Що обробляє Dash Dental",
      handlesIntro:
        "Продукт сфокусований на роботі рецепції та поверненні звернень, а не на клінічній системі записів.",
      notHandlesTitle: "Що Dash Dental не заявляє",
      notHandlesIntro:
        "Ці межі мають бути зрозумілими в продажах, онбордингу, підтримці та навчанні команди.",
      handles: [
        "Звернення пацієнтів та історію повідомлень",
        "Метадані каналів і статус інтеграцій",
        "Статус ліда, SLA-таймери та час першої відповіді",
        "Орієнтовну виручку під ризиком і результати повернення",
        "Активність команди, ролі, нотатки та аудит",
        "Метадані оплати, використання та підтримки",
      ],
      notHandles: [
        "Повні медичні записи або сертифіковані EHR-процеси",
        "Діагностику, затвердження лікування або клінічні рішення",
        "Автономні медичні поради або заміну персоналу",
        "Фінальну правду щодо оплати, страхування чи eligibility",
        "Сертифікацію без формальних аудитів і договорів",
      ],
    },
    controls: {
      eyebrow: "Контролі безпеки",
      title: "Конкретні контролі для оцінки покупцем",
      body:
        "Кожен контроль описує, що він означає, чому важливий для клініки та який поточний статус реалізації.",
      items: [
        {
          title: "Ізоляція клієнтів",
          meaning: "Робочі простори клінік обмежені організацією та членством.",
          clinicValue: "Одна клініка не повинна бачити розмови, користувачів або оплату іншої.",
          status: "Реалізовано",
          tone: "implemented",
        },
        {
          title: "Доступ за ролями",
          meaning: "Ролі owner, admin, manager, staff і support звужують доступ до чутливих зон.",
          clinicValue: "Рецепція працює з чергою без широкого доступу до білінгу чи platform admin.",
          status: "Реалізовано",
          tone: "implemented",
        },
        {
          title: "Обробка токенів провайдерів",
          meaning: "Облікові дані каналів мають бути на сервері та в операційних сховищах.",
          clinicValue: "Зменшує ризик появи секретів у браузері або скриншотах.",
          status: "Основа є",
          tone: "foundation",
        },
        {
          title: "Журнали аудиту",
          meaning: "Критичні дії мають залишати зрозумілі оператору події.",
          clinicValue: "Власник і підтримка можуть розібрати гранти підписок, нотатки, зміни команди та повтори.",
          status: "Основа є",
          tone: "foundation",
        },
        {
          title: "Перевірка та ідемпотентність вебхуків",
          meaning: "Вхідні події використовують перевірки провайдера, де можливо, і безпечну обробку дублікатів.",
          clinicValue: "Повтори провайдера не мають створювати дублікати пацієнтів або завищувати результати.",
          status: "Реалізовано",
          tone: "implemented",
        },
        {
          title: "Журнал подій білінгу",
          meaning: "Статус плану, ручна активація, hold і зміни доступу є аудитованими подіями.",
          clinicValue: "Пояснює, чому змінився доступ клініки.",
          status: "Реалізовано",
          tone: "implemented",
        },
        {
          title: "Межі доступу підтримки",
          meaning: "Дії підтримки мають бути scoped, свідомими та видимими.",
          clinicValue: "Підтримка може допомагати без невидимих адмінських змін.",
          status: "Основа є",
          tone: "foundation",
        },
        {
          title: "Редакція помилок і логів",
          meaning: "Публічні помилки та health checks не мають відкривати секрети чи токени.",
          clinicValue: "Захищає операційні деталі під час збоїв.",
          status: "Реалізовано",
          tone: "implemented",
        },
        {
          title: "Дисципліна backup і міграцій",
          meaning: "Експорт, retention, backup і міграції потребують формальних процедур.",
          clinicValue: "Важливо для більших клінік, яким потрібні задокументовані шляхи recovery та exit.",
          status: "У плані",
          tone: "planned",
        },
        {
          title: "Rate limits і захист від зловживань",
          meaning: "Публічні auth та intake-поверхні мають витримувати автоматизоване навантаження.",
          clinicValue: "Допомагає стабільності робочих просторів.",
          status: "Основа є",
          tone: "foundation",
        },
      ],
    },
    ai: {
      eyebrow: "Межі AI",
      title: "AI допомагає процесу. Команда клініки контролює рішення.",
      body:
        "AI використовується для підтримки комунікації зі зверненнями пацієнтів. Бізнес-правила та людська перевірка залишаються джерелом правди.",
      canTitle: "AI може",
      cannotTitle: "AI не може",
      can: [
        "Підсумовувати намір пацієнта",
        "Готувати безпечні чернетки відповідей",
        "Пропонувати наступну дію",
        "Виявляти ризик повільної відповіді",
        "Підсвічувати терміновість follow-up",
      ],
      cannot: [
        "Діагностувати або затверджувати лікування",
        "Приймати клінічні рішення",
        "Замінювати персонал клініки",
        "Перекривати deterministic rules",
        "Бути правдою для білінгу чи compliance",
      ],
      reviewNote:
        "AI-чернетки потребують перевірки людиною, якщо клініка явно не налаштувала автоматизацію для вузького погодженого сценарію.",
    },
    compliance: {
      eyebrow: "Позиція щодо compliance",
      title: "Готовність до контролів, але без фейкової сертифікації",
      body:
        "Dash Dental має контроли, які підтримують майбутню compliance-readiness, але сертифікації потребують аудитів, договорів і операційних процедур.",
      currentTitle: "Поточна позиція",
      current: [
        "Немає заяви про SOC 2 certification",
        "Немає заяви про ISO 27001 certification",
        "Немає HIPAA/BAA заяви без окремого підписаного договору",
        "Не призначено для зберігання повних медичних записів",
      ],
      roadmapTitle: "План розвитку",
      roadmap: [
        "Задокументувати subprocessors перед regulated rollout",
        "Формалізувати retention та export procedures",
        "Підготувати DPA/BAA-style workflows там, де це юридично потрібно",
        "Тримати публічні заяви в межах завершених аудитів",
      ],
    },
    incident: {
      eyebrow: "Інциденти та контакти",
      title: "Для чутливих питань має бути правильний шлях",
      body:
        "Не надсилайте зайву медичну історію пацієнтів email-ом. Додавайте лише потрібний технічний контекст.",
      categories: [
        {
          title: "Звіт про безпеку",
          target: "security@dashdental.space",
          include: "URL, кроки відтворення, скриншоти без patient data та контакт.",
        },
        {
          title: "Запит у підтримку",
          target: "support@dashdental.space",
          include: "Workspace клініки, канал, час, очікувана поведінка та вплив.",
        },
        {
          title: "Запит щодо приватності",
          target: "privacy@dashdental.space",
          include: "Тип запиту, workspace, роль запитувача та мінімальні дані для ідентифікації.",
        },
      ],
    },
    faq: {
      eyebrow: "Trust FAQ",
      title: "Відповіді перед підключенням каналів",
      items: [
        {
          question: "Dash Dental це EHR?",
          answer:
            "Ні. Dash Dental це платформа для лід-інтейку, Вхідних, SLA та повернення звернень пацієнтів.",
        },
        {
          question: "Чи може AI сам надсилати відповіді?",
          answer:
            "Базова позиція - перевірка людиною перед надсиланням. Автоматизація можлива лише для вузьких сценаріїв, явно погоджених клінікою.",
        },
        {
          question: "Що якщо вебхук не спрацює?",
          answer:
            "Обробка вхідних вебхуків спроєктована як ідемпотентна та спостережувана, щоб повтори не створювали дублікати.",
        },
        {
          question: "Як розділені робочі простори клінік?",
          answer:
            "Доступ обмежений членством в організації та роллю. Cross-clinic доступ вважається критичним дефектом.",
        },
        {
          question: "Чи можна експортувати дані клініки?",
          answer:
            "Експорт і retention-запити обробляються через підтримку або privacy route до появи формального self-serve export.",
        },
        {
          question: "Чи зберігає Dash Dental повні медичні записи?",
          answer:
            "Ні. Клінікам слід уникати завантаження зайвої клінічної історії.",
        },
        {
          question: "Dash Dental має HIPAA, SOC 2 або ISO сертифікацію?",
          answer:
            "Ні. Тут немає публічної заяви про сертифікацію. Для цього потрібні аудити та договори.",
        },
        {
          question: "Як повідомити про проблему безпеки?",
          answer:
            "Напишіть на security@dashdental.space з кроками відтворення, affected surface та мінімізованими доказами.",
        },
      ],
    },
  },
  support: {
    hero: {
      badge: "Центр підтримки",
      title: "Отримайте допомогу із запуском і роботою Dash Dental",
      subtitle:
        "Допомога з онбордингом, налаштуванням каналів, оплатою, доставкою повідомлень, AI-чернетками та процесами команди клініки.",
      primaryCta: "Звернутися в підтримку",
      secondaryCta: "Записатися на онбординг",
      tertiaryCta: "Переглянути setup guide",
    },
    proof: ["Підтримка в робочі дні", "Безпечна робота з patient data", "Допомога з інтеграціями"],
    paths: {
      eyebrow: "Маршрути підтримки",
      title: "Спрямуйте запит до правильного власника",
      body: "Кожен маршрут пояснює, для кого він, типові проблеми та наступну дію.",
      items: [
        {
          title: "Онбординг",
          who: "Для власників і front-desk lead, які запускають перший workspace.",
          issues: "Launch checklist, ролі, перший канал, навчання.",
          cta: "Записатися",
        },
        {
          title: "WhatsApp, Instagram або Telegram",
          who: "Для адміністраторів, які працюють з доступами провайдерів.",
          issues: "Meta permissions, тестові повідомлення, token expiry, provider review.",
          cta: "Допомога з каналом",
        },
        {
          title: "Форми сайту",
          who: "Для клінік, що маршрутизують запити з сайту в Dash Dental.",
          issues: "Webhook secret, test submissions, campaign landing pages.",
          cta: "Перевірити форму",
        },
        {
          title: "Вхідні та SLA",
          who: "Для рецепції, що щодня працює з чергою повернення.",
          issues: "Пріоритети, timers, ownership, нотатки, outcomes.",
          cta: "Налаштувати workflow",
        },
        {
          title: "Оплата та інвойси",
          who: "Для власників, що керують планом, trial або read-only статусом.",
          issues: "Manual invoice, failed payment, plan limits, cancellation.",
          cta: "Питання оплати",
        },
        {
          title: "AI-чернетки",
          who: "Для команд, що перевіряють summaries, drafts і next actions.",
          issues: "Відсутній summary, небезпечний текст, low confidence, boundaries.",
          cta: "Перевірити AI",
        },
        {
          title: "Експорт або privacy request",
          who: "Для власників або авторизованих контактів клініки.",
          issues: "Export, deletion, retention, patient-data request, audit review.",
          cta: "Privacy route",
        },
        {
          title: "Інцидент або збій",
          who: "Для критичних production issues або підозри на exposure.",
          issues: "Delivery stopped, account risk, integration outage, security concern.",
          cta: "Повідомити",
        },
      ],
    },
    expectations: {
      eyebrow: "Очікування відповіді",
      title: "Чітка терміновість без обіцянки 24/7",
      body:
        "Це цілі першої відповіді в робочі дні, а не юридичні SLA-зобов'язання.",
      items: [
        {
          title: "Критична production проблема",
          channel: "Email support з urgency critical",
          response: "Ціль - той самий робочий день",
          include: "Workspace, канал, кількість missed inquiries і workaround.",
        },
        {
          title: "Інтеграція деградувала",
          channel: "Support request із провайдером",
          response: "Ціль - один робочий день",
          include: "Provider, timestamps, event IDs і скриншоти без patient data.",
        },
        {
          title: "Питання оплати",
          channel: "Support request або owner email",
          response: "Один-два робочі дні",
          include: "Plan, invoice reference, owner email і очікуваний стан.",
        },
        {
          title: "Питання онбордингу",
          channel: "Onboarding call або support request",
          response: "До двох робочих днів",
          include: "Launch stage, team size, channels і blocker.",
        },
        {
          title: "Product feedback",
          channel: "Feature feedback form",
          response: "Перегляд у planning",
          include: "Workflow, роль, частота та business impact.",
        },
      ],
    },
    checklist: {
      eyebrow: "Перед зверненням",
      title: "Надішліть контекст, який допоможе відтворити проблему",
      body:
        "Короткі й конкретні запити вирішуються швидше та зменшують exposure patient data.",
      items: [
        "Назва workspace клініки",
        "Канал, якого стосується проблема",
        "Приклад розмови або пацієнта з мінімумом даних",
        "Приблизний час і timezone",
        "Скриншот із прихованими чутливими даними",
        "Провайдер інтеграції",
        "План або trial status",
        "Очікувана та фактична поведінка",
      ],
      note:
        "Не надсилайте зайві медичні записи або клінічну історію. Dash Dental призначений для звернень пацієнтів.",
    },
    guides: {
      eyebrow: "Troubleshooting",
      title: "Почніть із найчастіших операційних збоїв",
      body:
        "Ці перевірки допомагають зрозуміти, чи проблема в setup, провайдері, доступах, оплаті або AI.",
      items: [
        {
          title: "Вебхук не надходить",
          steps: [
            "Перевірте, що endpoint провайдера активний.",
            "Звірте webhook secret або signature config.",
            "Надішліть тест і зафіксуйте timestamp.",
          ],
        },
        {
          title: "Повідомлення не відправилось",
          steps: [
            "Перевірте статус каналу.",
            "Звірте provider permissions і rate limits.",
            "Поставте safe manual follow-up, поки support дивиться delivery logs.",
          ],
        },
        {
          title: "Інтеграція від'єдналась",
          steps: [
            "Вкажіть provider і workspace.",
            "Оновіть або перепідключіть token, якщо потрібно.",
            "Надішліть час останнього успішного повідомлення.",
          ],
        },
        {
          title: "Billing locked або read-only",
          steps: [
            "Перевірте дату завершення trial і поточний plan.",
            "З'ясуйте, чи активний manual invoice або read-only hold.",
            "Попросіть owner або support переглянути billing status.",
          ],
        },
        {
          title: "AI summary відсутній",
          steps: [
            "Переконайтеся, що в розмові достатньо контексту.",
            "Перевірте AI limits і usage.",
            "Використайте human-written reply, поки summary regenerate.",
          ],
        },
        {
          title: "Метрики dashboard виглядають неправильно",
          steps: [
            "Перевірте filters, timezone і channel selection.",
            "Порівняйте чергу з recovered outcomes.",
            "Надішліть приклади expected vs displayed values.",
          ],
        },
        {
          title: "Співробітник не має доступу",
          steps: [
            "Перевірте email інвайта.",
            "Звірте role, membership status і active workspace.",
            "Попросіть owner/admin повторно надіслати доступ.",
          ],
        },
      ],
    },
    form: {
      title: "Надіслати запит у підтримку",
      description:
        "Форма для bugs, інтеграцій, оплати, AI-чернеток, онбордингу та product feedback.",
      tabs: {
        issue: "Проблема",
        feedback: "Ідея",
      },
      labels: {
        name: "Ваше ім'я",
        clinic: "Клініка",
        email: "Робочий email",
        category: "Категорія",
        urgency: "Терміновість",
        channel: "Канал",
        message: "Повідомлення",
        screenshots: "Скриншоти (необов'язково)",
      },
      placeholders: {
        name: "Ім'я",
        clinic: "Назва клініки",
        email: "you@clinic.com",
        message: "Опишіть, що сталося, що очікували, і безпечні приклади для підтримки.",
      },
      categories: [
        "Онбординг",
        "Інтеграція",
        "Форма сайту",
        "Вхідні або SLA",
        "Оплата",
        "AI-чернетка",
        "Privacy або export",
        "Інцидент або збій",
        "Bug",
        "Ідея функції",
      ],
      urgencies: ["Звичайна", "Висока", "Критична production проблема"],
      channels: ["Не залежить від каналу", "WhatsApp", "Instagram", "Telegram", "Форма сайту", "Оплата", "AI"],
      privacyNote:
        "Додавайте скриншоти лише коли це корисно. Приховуйте медичні деталі пацієнтів.",
      submitIssue: "Надіслати запит",
      submitFeedback: "Надіслати ідею",
      sending: "Надсилання...",
      success: "Запит отримано.",
      error: "Не вдалося надіслати запит. Спробуйте ще раз.",
    },
    faq: {
      eyebrow: "Support FAQ",
      title: "Поширені питання перед створенням ticket",
      items: [
        {
          question: "Як підключити канал?",
          answer:
            "Почніть з одного каналу, підтвердьте доступ провайдера, надішліть тестове повідомлення та перевірте чергу.",
        },
        {
          question: "Чи можна мігрувати старі повідомлення?",
          answer:
            "Support може обговорити безпечний імпорт, але Dash Dental не має бути повним архівом медичних записів.",
        },
        {
          question: "Що якщо Stripe payment failed?",
          answer:
            "Напишіть support з owner email і планом. Manual invoice activation може бути доступним під час review.",
        },
        {
          question: "Що якщо webhook провайдера затримується?",
          answer:
            "Надішліть provider, timestamp, event ID і канал. Обробка повторів має бути duplicate-safe.",
        },
        {
          question: "Чи бачить staff оплату?",
          answer:
            "Білінг має бути обмежений ролями. Owner та admin зазвичай керують планом і invoices.",
        },
        {
          question: "Чи може AI сам надсилати відповіді?",
          answer:
            "Базово AI створює чернетки для перевірки людиною. Автоматизація потребує явного погодження клініки.",
        },
        {
          question: "Чи можна експортувати дані?",
          answer:
            "До self-serve export такі запити йдуть через privacy або support.",
        },
        {
          question: "Як скасувати підписку?",
          answer:
            "Напишіть support з owner email, workspace клініки та бажаною датою cancellation.",
        },
      ],
    },
  },
};

const polish: TrustSupportCopy = {
  security: {
    ...english.security,
    hero: {
      badge: "Centrum zaufania",
      title: "Bezpieczeństwo, prywatność i granice AI w odzyskiwaniu zapytań pacjentów",
      subtitle:
        "Dash Dental jest przeznaczony do obsługi zapytań pacjentów, odzyskiwania przychodu i komunikacji zatwierdzanej przez człowieka. Oddzielamy intake leadów od decyzji klinicznych i nie składamy fałszywych obietnic bezpieczeństwa.",
      primaryCta: "Kontakt security",
      secondaryCta: "Polityka prywatności",
      tertiaryCta: "Kontakt z supportem",
    },
    badges: [
      "Workspaces przypisane do kliniki",
      "Logi audytowe",
      "Drafty AI zatwierdzane przez człowieka",
      "Idempotentne webhooki",
      "Bez fałszywych certyfikatów",
    ],
    scope: {
      handlesTitle: "Co obsługuje Dash Dental",
      handlesIntro:
        "Produkt skupia się na pracy recepcji i odzyskiwaniu zapytań, a nie na klinicznym systemie dokumentacji.",
      notHandlesTitle: "Czego Dash Dental nie deklaruje",
      notHandlesIntro:
        "Te granice powinny być jasne w sprzedaży, onboardingu, supporcie i szkoleniu zespołu.",
      handles: [
        "Zapytania pacjentów i historia wiadomości",
        "Metadane kanałów i status integracji",
        "Status leada, timery SLA i metryki pierwszej odpowiedzi",
        "Szacowany przychód zagrożony i wyniki odzyskiwania",
        "Aktywność zespołu, role, notatki i zdarzenia audytowe",
        "Metadane płatności, użycia i wsparcia",
      ],
      notHandles: [
        "Pełna dokumentacja medyczna lub certyfikowany workflow EHR",
        "Diagnoza, zatwierdzanie leczenia lub decyzje kliniczne",
        "Autonomiczna porada medyczna lub zastąpienie personelu",
        "Ostateczna prawda billingowa, ubezpieczeniowa lub eligibility",
        "Certyfikacja bez formalnych audytów i umów",
      ],
    },
    controls: {
      ...english.security.controls,
      eyebrow: "Kontrole bezpieczeństwa",
      title: "Konkretne kontrole do oceny przez kupującego",
      body:
        "Każda kontrola opisuje, co oznacza, dlaczego ma znaczenie dla kliniki i jaki jest jej aktualny status.",
      items: [
        {
          title: "Izolacja tenantów",
          meaning: "Workspaces klinik są ograniczone do organizacji i członkostwa.",
          clinicValue: "Jedna klinika nie powinna widzieć rozmów, użytkowników ani billing innej kliniki.",
          status: "Wdrożone",
          tone: "implemented",
        },
        {
          title: "Dostęp oparty na rolach",
          meaning: "Role owner, admin, manager, staff i support zawężają dostęp do wrażliwych obszarów.",
          clinicValue: "Recepcja może pracować z kolejką bez szerokiego dostępu do billing lub platform admin.",
          status: "Wdrożone",
          tone: "implemented",
        },
        {
          title: "Obsługa tokenów providerów",
          meaning: "Dane dostępowe kanałów powinny pozostać po stronie serwera i operacyjnych store.",
          clinicValue: "Zmniejsza ryzyko ujawnienia sekretów w bundle przeglądarki albo screenshotach.",
          status: "Podstawa gotowa",
          tone: "foundation",
        },
        {
          title: "Logi audytowe",
          meaning: "Wrażliwe akcje workflow mają zostawiać czytelne zdarzenia operatorskie.",
          clinicValue: "Owner i support mogą wyjaśnić granty subskrypcji, notatki, zmiany zespołu i retry.",
          status: "Podstawa gotowa",
          tone: "foundation",
        },
        {
          title: "Weryfikacja i idempotencja webhooków",
          meaning: "Zdarzenia przychodzące używają kontroli providera tam, gdzie to możliwe, i duplicate-safe processing.",
          clinicValue: "Retry providera nie powinny tworzyć duplikatów pacjentów ani zawyżać wyników odzyskiwania.",
          status: "Wdrożone",
          tone: "implemented",
        },
        {
          title: "Rejestr zdarzeń billing",
          meaning: "Status planu, aktywacje ręczne, blokady i zmiany dostępu są traktowane jako zdarzenia audytowe.",
          clinicValue: "Ułatwia wyjaśnienie, dlaczego zmienił się dostęp do workspace kliniki.",
          status: "Wdrożone",
          tone: "implemented",
        },
        {
          title: "Granice dostępu supportu",
          meaning: "Akcje supportu powinny być ograniczone, celowe i widoczne.",
          clinicValue: "Troubleshooting jest możliwy bez niewidocznych zmian administracyjnych.",
          status: "Podstawa gotowa",
          tone: "foundation",
        },
        {
          title: "Redakcja błędów i logów",
          meaning: "Publiczne błędy i health checks nie powinny ujawniać sekretów, tokenów ani credentials.",
          clinicValue: "Chroni szczegóły operacyjne, gdy coś zawiedzie w produkcji.",
          status: "Wdrożone",
          tone: "implemented",
        },
        {
          title: "Backup i dyscyplina migracji",
          meaning: "Eksport, retention, backup i migracje wymagają formalnych procedur operacyjnych.",
          clinicValue: "Ważne dla większych klinik, które potrzebują udokumentowanych ścieżek recovery i exit.",
          status: "Planowane",
          tone: "planned",
        },
        {
          title: "Rate limits i ochrona przed nadużyciami",
          meaning: "Publiczne powierzchnie auth i intake powinny ograniczać automatyczne nadużycia.",
          clinicValue: "Pomaga utrzymać stabilność workspace, gdy endpointy są publiczne.",
          status: "Podstawa gotowa",
          tone: "foundation",
        },
      ],
    },
    ai: {
      eyebrow: "Granice AI",
      title: "AI wspiera workflow. Zespół kliniki zachowuje kontrolę.",
      body:
        "AI pomaga w komunikacji wokół zapytań pacjentów. Reguły biznesowe i ludzka weryfikacja pozostają źródłem prawdy.",
      canTitle: "AI może",
      cannotTitle: "AI nie może",
      can: [
        "Podsumować intencję pacjenta",
        "Przygotować bezpieczny draft odpowiedzi",
        "Zasugerować następną akcję",
        "Wykryć ryzyko opóźnionej odpowiedzi",
        "Wskazać pilność follow-upu",
      ],
      cannot: [
        "Diagnozować lub zatwierdzać leczenia",
        "Podejmować decyzji klinicznych",
        "Zastępować personelu kliniki",
        "Nadpisywać deterministycznych reguł",
        "Być źródłem prawdy dla billing lub compliance",
      ],
      reviewNote:
        "Drafty AI wymagają weryfikacji człowieka, chyba że klinika wyraźnie skonfiguruje automatyzację dla wąskiego, zatwierdzonego workflow.",
    },
    compliance: {
      eyebrow: "Postawa compliance",
      title: "Gotowość do kontroli, bez fałszywej certyfikacji",
      body:
        "Dash Dental jest projektowany z kontrolami wspierającymi przyszłą gotowość compliance, ale certyfikacje wymagają formalnych audytów, umów i procedur operacyjnych.",
      currentTitle: "Aktualnie",
      current: [
        "Brak deklaracji SOC 2 certified",
        "Brak deklaracji ISO 27001 certified",
        "Brak deklaracji HIPAA/BAA bez osobnej podpisanej umowy",
        "Produkt nie służy do przechowywania pełnej dokumentacji medycznej",
      ],
      roadmapTitle: "Roadmapa",
      roadmap: [
        "Udokumentować subprocessors przed regulated rollout",
        "Sformalizować procedury retention i export",
        "Przygotować workflow DPA/BAA tam, gdzie jest wymagany prawnie",
        "Dopasowywać publiczne obietnice do zakończonych audytów",
      ],
    },
    incident: {
      eyebrow: "Incydenty i kontakt",
      title: "Wrażliwe zgłoszenia muszą mieć właściwą ścieżkę",
      body:
        "Nie wysyłaj mailem zbędnej historii medycznej pacjentów. Dodaj tylko kontekst potrzebny do triage.",
      categories: [
        {
          title: "Zgłoszenie security",
          target: "security@dashdental.space",
          include: "Affected URL, kroki reprodukcji, screenshoty bez patient data i dane kontaktowe.",
        },
        {
          title: "Zgłoszenie support",
          target: "support@dashdental.space",
          include: "Workspace kliniki, affected channel, timestamp, expected behavior i business impact.",
        },
        {
          title: "Privacy request",
          target: "privacy@dashdental.space",
          include: "Typ requestu, workspace, rola requester i minimalne dane potrzebne do identyfikacji rekordu.",
        },
      ],
    },
    faq: {
      eyebrow: "Trust FAQ",
      title: "Odpowiedzi przed podłączeniem kanałów",
      items: [
        {
          question: "Czy Dash Dental jest EHR?",
          answer:
            "Nie. Dash Dental to platforma do lead intake, skrzynki, SLA i odzyskiwania zapytań pacjentów.",
        },
        {
          question: "Czy AI może automatycznie wysyłać odpowiedzi?",
          answer:
            "Domyślnie odpowiedź jest weryfikowana przez człowieka. Automatyzacja powinna dotyczyć tylko wąskich, zatwierdzonych workflow.",
        },
        {
          question: "Co jeśli webhook zawiedzie?",
          answer:
            "Obsługa webhooków jest projektowana jako idempotentna i obserwowalna, aby retry nie tworzyły duplikatów.",
        },
        {
          question: "Jak oddzielone są workspaces klinik?",
          answer:
            "Dostęp jest ograniczony członkostwem w organizacji i rolą. Cross-clinic access traktujemy jako krytyczny defekt.",
        },
        {
          question: "Czy dane kliniki można eksportować?",
          answer:
            "Do czasu self-serve export, eksport i retention są obsługiwane przez support lub privacy request.",
        },
        {
          question: "Czy Dash Dental przechowuje pełną dokumentację medyczną?",
          answer:
            "Nie. Kliniki powinny unikać przesyłania zbędnej historii klinicznej.",
        },
        {
          question: "Czy Dash Dental ma HIPAA, SOC 2 lub ISO?",
          answer:
            "Nie składamy tutaj publicznej deklaracji certyfikacji. Wymaga to formalnych audytów i umów.",
        },
        {
          question: "Jak zgłosić problem bezpieczeństwa?",
          answer:
            "Napisz na security@dashdental.space z krokami reprodukcji, affected surface i zminimalizowanymi dowodami.",
        },
      ],
    },
  },
  support: {
    ...english.support,
    hero: {
      badge: "Centrum wsparcia",
      title: "Pomoc przy uruchamianiu i prowadzeniu Dash Dental",
      subtitle:
        "Wsparcie dla onboardingu, konfiguracji kanałów, rozliczeń, problemów z dostarczaniem wiadomości, draftów AI i workflow zespołu kliniki.",
      primaryCta: "Kontakt z supportem",
      secondaryCta: "Umów onboarding",
      tertiaryCta: "Zobacz setup guide",
    },
    proof: ["Wsparcie w dni robocze", "Bezpieczne obchodzenie się z patient data", "Troubleshooting integracji"],
    paths: {
      eyebrow: "Ścieżki wsparcia",
      title: "Skieruj zgłoszenie do właściwego właściciela",
      body:
        "Każda ścieżka wyjaśnia, dla kogo jest przeznaczona, typowe problemy i najlepszy następny krok.",
      items: [
        {
          title: "Pomoc onboardingowa",
          who: "Dla ownerów i liderów recepcji uruchamiających pierwszy workspace.",
          issues: "Launch checklist, role zespołu, pierwszy kanał, przepływ szkolenia.",
          cta: "Umów onboarding",
        },
        {
          title: "WhatsApp, Instagram lub Telegram",
          who: "Dla adminów obsługujących dostęp providera i zgody.",
          issues: "Meta permissions, wiadomości testowe, wygasły token, provider review.",
          cta: "Pomoc z kanałem",
        },
        {
          title: "Konfiguracja formularza WWW",
          who: "Dla klinik kierujących zapytania z witryny do Dash Dental.",
          issues: "Webhook secret, test submissions, campaign landing pages.",
          cta: "Sprawdź formularz",
        },
        {
          title: "Inbox i workflow SLA",
          who: "Dla recepcji pracującej codziennie w recovery queue.",
          issues: "Priorytety, timery pierwszej odpowiedzi, ownership, notatki, outcomes.",
          cta: "Napraw workflow",
        },
        {
          title: "Billing i faktury",
          who: "Dla ownerów zarządzających planem, trial, fakturą lub read-only statusem.",
          issues: "Manual invoice, failed payment, limity planu, anulowanie.",
          cta: "Kontakt billing",
        },
        {
          title: "Zachowanie draftów AI",
          who: "Dla zespołów oceniających summaries, drafty i next actions.",
          issues: "Brak summary, ryzykowny ton, niska pewność, granice reguł.",
          cta: "Sprawdź AI",
        },
        {
          title: "Eksport danych lub privacy request",
          who: "Dla ownerów albo autoryzowanych kontaktów kliniki.",
          issues: "Export, deletion, retention, patient-data request, audit review.",
          cta: "Ścieżka privacy",
        },
        {
          title: "Incydent lub outage",
          who: "Dla pilnych problemów produkcyjnych albo podejrzenia exposure.",
          issues: "Delivery stopped, account risk, integration outage, security concern.",
          cta: "Zgłoś incydent",
        },
      ],
    },
    expectations: {
      eyebrow: "Oczekiwania odpowiedzi",
      title: "Jasna pilność bez udawania wsparcia 24/7",
      body:
        "To cele pierwszej odpowiedzi w dni robocze, a nie gwarantowane zobowiązania SLA.",
      items: [
        {
          title: "Krytyczny problem produkcyjny",
          channel: "Email do supportu z urgency critical",
          response: "Cel: ten sam dzień roboczy",
          include: "Workspace kliniki, kanał, liczba missed inquiries i obecny workaround.",
        },
        {
          title: "Integracja działa gorzej",
          channel: "Support request z nazwą providera",
          response: "Cel: jeden dzień roboczy",
          include: "Provider, timestamps, event IDs i screenshoty z ukrytymi danymi pacjentów.",
        },
        {
          title: "Problem billingowy",
          channel: "Support request lub email ownera",
          response: "Jeden do dwóch dni roboczych",
          include: "Plan, numer faktury, owner email i oczekiwany stan billing.",
        },
        {
          title: "Pytanie onboardingowe",
          channel: "Onboarding call lub support request",
          response: "Do dwóch dni roboczych",
          include: "Etap launch, wielkość zespołu, kanały i aktualny blocker.",
        },
        {
          title: "Feedback produktowy",
          channel: "Formularz feature feedback",
          response: "Przeglądane podczas planowania",
          include: "Workflow, affected role, częstotliwość i business impact.",
        },
      ],
    },
    checklist: {
      ...english.support.checklist,
      eyebrow: "Przed kontaktem",
      title: "Wyślij kontekst, który pomoże odtworzyć problem",
      body:
        "Krótkie i konkretne zgłoszenia są rozwiązywane szybciej i ograniczają zbędną ekspozycję danych pacjentów.",
      items: [
        "Nazwa workspace kliniki",
        "Kanał, którego dotyczy problem",
        "Przykład rozmowy lub pacjenta z minimalnymi danymi",
        "Przybliżony czas i timezone",
        "Screenshot z ukrytymi danymi wrażliwymi",
        "Provider integracji",
        "Plan billingowy lub status trial",
        "Oczekiwane versus faktyczne zachowanie",
      ],
      note:
        "Nie wysyłaj zbędnej dokumentacji medycznej ani historii klinicznej. Dash Dental służy do workflow zapytań pacjentów.",
    },
    guides: {
      eyebrow: "Troubleshooting",
      title: "Zacznij od najczęstszych awarii operacyjnych",
      body:
        "Te kontrole pomagają ustalić, czy problem dotyczy setup, providera, uprawnień, billing czy AI.",
      items: [
        {
          title: "Webhook nie dochodzi",
          steps: [
            "Potwierdź, że endpoint providera jest aktywny.",
            "Sprawdź webhook secret lub signature configuration.",
            "Wyślij test i zanotuj timestamp.",
          ],
        },
        {
          title: "Wiadomość nie została wysłana",
          steps: [
            "Sprawdź status połączenia kanału.",
            "Potwierdź provider permissions i rate limits.",
            "Ustaw bezpieczny manual follow-up, gdy support sprawdza delivery logs.",
          ],
        },
        {
          title: "Integracja została rozłączona",
          steps: [
            "Podaj providera i workspace kliniki.",
            "Odśwież lub podłącz ponownie token, jeśli system o to prosi.",
            "Wyślij czas ostatniej udanej wiadomości.",
          ],
        },
        {
          title: "Billing locked lub read-only",
          steps: [
            "Sprawdź datę końca trial i obecny plan.",
            "Ustal, czy aktywny jest manual invoice albo read-only hold.",
            "Poproś ownera lub platform support o przegląd billing status.",
          ],
        },
        {
          title: "Brak AI summary",
          steps: [
            "Potwierdź, że rozmowa ma wystarczający kontekst.",
            "Sprawdź limity AI planu i ostatnie użycie.",
            "Użyj human-written reply, gdy summary regeneruje się.",
          ],
        },
        {
          title: "Metryki dashboardu wyglądają źle",
          steps: [
            "Sprawdź filtry, timezone i wybór kanałów.",
            "Porównaj queue rozmów z recovered outcomes.",
            "Wyślij supportowi przykłady expected versus displayed values.",
          ],
        },
        {
          title: "Członek zespołu nie ma dostępu",
          steps: [
            "Potwierdź email użyty w zaproszeniu.",
            "Sprawdź role, membership status i aktywny workspace.",
            "Poproś ownera albo admina o ponowne wysłanie dostępu.",
          ],
        },
      ],
    },
    form: {
      ...english.support.form,
      title: "Wyślij zgłoszenie do supportu",
      description:
        "Formularz dla bugów, integracji, rozliczeń, draftów AI, onboardingu i product feedback.",
      tabs: {
        issue: "Problem",
        feedback: "Pomysł",
      },
      labels: {
        name: "Imię i nazwisko",
        clinic: "Klinika",
        email: "Email służbowy",
        category: "Kategoria",
        urgency: "Pilność",
        channel: "Kanał",
        message: "Wiadomość",
        screenshots: "Screenshoty (opcjonalnie)",
      },
      placeholders: {
        name: "Imię",
        clinic: "Nazwa kliniki",
        email: "you@clinic.com",
        message:
          "Opisz, co się stało, czego oczekiwano i jakie bezpieczne przykłady może sprawdzić support.",
      },
      categories: [
        "Onboarding",
        "Integracja",
        "Formularz WWW",
        "Inbox lub SLA",
        "Billing",
        "Draft AI",
        "Privacy lub export",
        "Incydent albo outage",
        "Bug",
        "Pomysł na funkcję",
      ],
      urgencies: ["Normalna", "Wysoka", "Krytyczny problem produkcyjny"],
      channels: ["Nie dotyczy kanału", "WhatsApp", "Instagram", "Telegram", "Formularz WWW", "Billing", "AI"],
      privacyNote:
        "Dodawaj screenshoty tylko wtedy, gdy pomagają. Ukryj medyczne szczegóły pacjentów.",
      submitIssue: "Wyślij zgłoszenie",
      submitFeedback: "Wyślij feedback",
      sending: "Wysyłanie...",
      success: "Zgłoszenie odebrane.",
      error: "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
    },
    faq: {
      eyebrow: "Support FAQ",
      title: "Najczęstsze pytania przed zgłoszeniem",
      items: [
        {
          question: "Jak podłączyć kanał?",
          answer:
            "Zacznij od jednego kanału, potwierdź dostęp providera, wyślij testową wiadomość i sprawdź, czy pojawia się w recovery queue.",
        },
        {
          question: "Czy możecie pomóc przenieść stare wiadomości pacjentów?",
          answer:
            "Support może omówić bezpieczne opcje importu, ale Dash Dental nie powinien być pełnym archiwum dokumentacji medycznej.",
        },
        {
          question: "Co jeśli płatność Stripe się nie powiedzie?",
          answer:
            "Skontaktuj się z supportem z owner email i planem. Manual invoice activation może być dostępna podczas przeglądu płatności kartą.",
        },
        {
          question: "Co jeśli webhook providera jest opóźniony?",
          answer:
            "Wyślij providera, timestamp, event ID jeśli jest dostępny i affected channel. System jest projektowany pod duplicate-safe retries.",
        },
        {
          question: "Czy staff widzi billing?",
          answer:
            "Powierzchnie billingowe powinny być ograniczone rolą. Ownerzy i admini zwykle zarządzają planem i fakturami.",
        },
        {
          question: "Czy AI może automatycznie wysyłać odpowiedzi?",
          answer:
            "Domyślna postawa to drafty sprawdzane przez człowieka. Każda automatyzacja musi być wyraźnie zatwierdzona przez klinikę.",
        },
        {
          question: "Czy mogę eksportować dane?",
          answer:
            "Do czasu formalnego self-serve export, prośby o eksport przechodzą przez privacy lub support.",
        },
        {
          question: "Jak anulować?",
          answer:
            "Napisz do supportu z owner email, workspace kliniki i oczekiwaną datą anulowania.",
        },
      ],
    },
  },
};

export const trustSupportCopies: Record<TrustSupportLocale, TrustSupportCopy> = {
  en: english,
  uk: ukrainian,
  pl: polish,
};

export function getTrustSupportCopy(languageCode: string): TrustSupportCopy {
  const normalized = languageCode.split("-")[0] as TrustSupportLocale;
  return trustSupportCopies[normalized] ?? trustSupportCopies.en;
}
