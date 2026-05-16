"use client";

import {
  AlertTriangle,
  Bot,
  Clock3,
  Inbox,
  MessageCircle,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { ownerDashboardMetrics, sampleConversations } from "@/features/marketing/content/dash-dental";

const ukrainianDashboardCopy = {
  topLabel: "Приклад робочого простору клініки",
  title: "Консоль повернення пропущених звернень",
  sampleData: "Тестові дані",
  tabs: ["Черга", "Канали", "Звіти"],
  metrics: [
    {
      label: "Гроші під ризиком сьогодні",
      value: "$7.8k",
      detail: "Оцінка потенційного лікування, не гарантована виручка",
    },
    {
      label: "Пацієнти без відповіді",
      value: "12",
      detail: "Очікують у каналах пацієнтів",
    },
    {
      label: "Середній перший відгук",
      value: "38хв",
      detail: "Вище цільового часу клініки",
    },
    {
      label: "Повернуті діалоги",
      value: "21",
      detail: "Позначені як записані або захищені цього місяця",
    },
  ],
  priorityLabel: "Пріоритетна черга",
  priorityTitle: "Відповідайте, поки пацієнти не зникли",
  conversations: [
    {
      initials: "EP",
      channel: "WhatsApp",
      intent: "Гострий зубний біль",
      waiting: "22 хв очікує",
      value: "$420",
      action: "Запропонувати найближче екстрене вікно й уточнити телефон.",
      draft:
        "Вітаємо, ми можемо допомогти. Є екстрене вікно сьогодні. Підтвердьте номер телефону, щоб рецепція могла вам зателефонувати.",
    },
    {
      initials: "MK",
      channel: "Instagram",
      intent: "Ціна вінірів",
      waiting: "1 год 14 хв очікує",
      value: "$1,200",
      action: "Перевести DM у запис на консультацію з двома варіантами часу.",
      draft:
        "Вітаємо, ціна вінірів залежить від плану посмішки. Можемо записати вас на коротку консультацію і показати варіанти.",
    },
    {
      initials: "ON",
      channel: "Форма сайту",
      intent: "Консультація з імпланта",
      waiting: "2 год очікує",
      value: "$1,500",
      action: "Передзвонити до обіду й підтвердити інтерес до консультації.",
      draft:
        "Дякуємо за запит щодо імплантів. Координатор може зателефонувати сьогодні, уточнити ситуацію й запропонувати час консультації.",
    },
    {
      initials: "SL",
      channel: "Telegram",
      intent: "Запит про відбілювання",
      waiting: "46 хв очікує",
      value: "$180",
      action: "Запропонувати безпечний шлях запису і запитати зручний день.",
      draft:
        "Вітаємо, можемо допомогти з варіантами відбілювання. Який день цього тижня вам зручний для короткого візиту?",
    },
  ],
  actionLabel: "Рекомендована наступна дія",
  actionTitle: "Відповісти зараз і запропонувати час",
  aiTag: "AI-чернетка: потрібна перевірка команди",
  boundary:
    "AI може підсумувати й підготувати чернетку. Команда переглядає та надсилає; Dash Dental не приймає клінічних, платіжних, страхових, доступових або лікувальних рішень.",
} as const;

export function SampleRecoveryDashboard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const languageCode = useCurrentLanguageCode();
  const isUkrainian = languageCode === "uk";
  const metrics = isUkrainian ? ukrainianDashboardCopy.metrics : ownerDashboardMetrics;
  const conversations = isUkrainian ? ukrainianDashboardCopy.conversations : sampleConversations;

  return (
    <section
      className={`sample-dashboard ${compact ? "compact" : ""}`}
      aria-label="Sample Dash Dental recovery dashboard"
    >
      <div className="sample-dashboard-topbar">
        <div>
          <span>{isUkrainian ? ukrainianDashboardCopy.topLabel : "Sample clinic workspace"}</span>
          <strong>{isUkrainian ? ukrainianDashboardCopy.title : "Missed-message recovery console"}</strong>
        </div>
        <b>{isUkrainian ? ukrainianDashboardCopy.sampleData : "Sample data"}</b>
      </div>

      <div className="sample-dashboard-tabs" aria-label="Sample workspace tabs">
        <span className="active">{isUkrainian ? ukrainianDashboardCopy.tabs[0] : "Queue"}</span>
        <span>{isUkrainian ? ukrainianDashboardCopy.tabs[1] : "Channels"}</span>
        <span>{isUkrainian ? ukrainianDashboardCopy.tabs[2] : "Reports"}</span>
      </div>

      <div className="sample-dashboard-metrics">
        {metrics.map((metric, index) => {
          const Icon = [TrendingDown, Inbox, Clock3, MessageCircle][index] ?? Inbox;

          return (
            <article key={metric.label}>
              <Icon size={18} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          );
        })}
      </div>

      <div className="sample-dashboard-body">
        <div className="sample-priority-list">
          <div className="sample-panel-heading">
            <span>{isUkrainian ? ukrainianDashboardCopy.priorityLabel : "Priority queue"}</span>
            <strong>{isUkrainian ? ukrainianDashboardCopy.priorityTitle : "Reply before patients disappear"}</strong>
          </div>
          {conversations.map((conversation) => (
            <article className="sample-lead-row" key={conversation.intent}>
              <div className="sample-avatar">{conversation.initials}</div>
              <div>
                <strong>{conversation.intent}</strong>
                <span>
                  {conversation.channel} - {conversation.waiting}
                </span>
                <small>{conversation.action}</small>
              </div>
              <b>{conversation.value}</b>
            </article>
          ))}
        </div>

        <aside className="sample-draft-card">
          <div className="sample-panel-heading">
            <span>
              <Sparkles size={15} />
              {isUkrainian ? ukrainianDashboardCopy.actionLabel : "Suggested next action"}
            </span>
            <strong>{isUkrainian ? ukrainianDashboardCopy.actionTitle : "Reply now with appointment options"}</strong>
          </div>
          <p>{conversations[0].draft}</p>
          <div className="sample-ai-tag">
            <Bot size={14} />
            {isUkrainian ? ukrainianDashboardCopy.aiTag : "AI draft: human review required"}
          </div>
          <div className="sample-boundary-note">
            <AlertTriangle size={15} />
            <span>
              {isUkrainian
                ? ukrainianDashboardCopy.boundary
                : "AI can summarize and draft. Your team reviews and sends; Dash Dental does not make clinical, billing, insurance, access, or treatment decisions."}
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}
