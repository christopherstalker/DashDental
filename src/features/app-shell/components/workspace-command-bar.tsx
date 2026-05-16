"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Send, Sparkles, X } from "lucide-react";
import { LocalizedText } from "@/features/i18n/components/localized-text";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import {
  translate,
  type TranslationKey,
} from "@/features/i18n/translations";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";

const promptChips = [
  "workspace.ai.chip.replyFirst",
  "workspace.ai.chip.riskToday",
  "workspace.ai.chip.draftReply",
  "workspace.ai.chip.planLimits",
] satisfies TranslationKey[];

function buildAssistantReply(
  prompt: string,
  context: WorkspaceCommandBarContext,
  languageCode: string,
): string {
  const normalized = prompt.toLocaleLowerCase();
  const isUkrainian = languageCode.startsWith("uk");
  const has = (...terms: string[]) => terms.some((term) => normalized.includes(term));

  if (has("reply", "first", "відпов", "перш")) {
    return isUkrainian
      ? `Почніть із ${context.atRisk} діалогів під ризиком, потім закрийте звернення без відповіді. Безпечна відповідь: підтвердити запит, запропонувати два вікна для запису й попросити підтвердити телефон.`
      : `Start with the ${context.atRisk} at-risk conversation(s), then clear unanswered patients. A safe reply should acknowledge the request, offer two booking windows, and confirm the phone number.`;
  }

  if (has("risk", "today", "ризик", "сьогодні")) {
    return isUkrainian
      ? `${context.organizationName}: ${context.unanswered} звернень без відповіді, ${context.atRisk} діалогів під ризиком і ${context.openConversations} відкритих діалогів. Завдання власника: повернути попит до того, як він стане втраченою виручкою.`
      : `${context.organizationName} has ${context.unanswered} unanswered patient(s), ${context.atRisk} at-risk conversation(s), and ${context.openConversations} open thread(s). The owner view is simple: recover demand before it becomes lost revenue.`;
  }

  if (has("draft", "message", "reply", "чернет", "відпов")) {
    return isUkrainian
      ? "Чернетка: Вітаємо, дякуємо за звернення. Ми можемо допомогти. Є вікно для короткої консультації сьогодні або завтра. Який час зручніший, і чи можемо підтвердити цей номер телефону?"
      : "Suggested draft: Hi, thanks for reaching out. We can help. I can offer a quick consult today or tomorrow. Which time works best, and should we confirm this phone number?";
  }

  if (has("plan", "limit", "план", "ліміт")) {
    return isUkrainian
      ? `Поточний план: ${context.planLabel}. Якщо клініка впирається в ліміти, налаштування й оплата залишаються доступними для перегляду; далі можна підвищити план або попросити platform support активувати доступ вручну.`
      : `Current plan: ${context.planLabel}. If the clinic hits limits, setup and billing stay readable; then upgrade the plan or ask platform support for manual activation.`;
  }

  return isUkrainian
    ? `Ask AI допомагає команді ${context.organizationName}: визначає пріоритет відповіді, пояснює ризик, складає безпечні чернетки й коротко підсумовує день для власника. Він не ставить діагнози, не надсилає повідомлення автоматично й не приймає рішень щодо оплати або compliance.`
    : `Ask AI helps ${context.organizationName} prioritize replies, explain risk, draft safe operational messages, and summarize the day for the owner. It does not diagnose, auto-send, or make billing or compliance decisions.`;
}
export interface WorkspaceCommandBarContext {
  atRisk: number;
  openConversations: number;
  organizationName: string;
  planLabel: string;
  role: string;
  unanswered: number;
  userName: string;
}

export function WorkspaceCommandBar({ context }: { context: WorkspaceCommandBarContext }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const languageCode = useCurrentLanguageCode();
  const reply = useMemo(
    () => buildAssistantReply(prompt, context, languageCode),
    [context, languageCode, prompt],
  );

  function submitPrompt() {
    if (!prompt.trim()) {
      setPrompt(translate("workspace.ai.chip.riskToday", languageCode));
    }

    setOpen(true);
  }

  return (
    <div className="workspace-command-bar" aria-label="Workspace command bar">
      <div className="workspace-command-context">
        <span>{context.organizationName}</span>
        <strong className="workspace-command-metrics">
          <span>
            {context.unanswered} <LocalizedText k="workspace.command.unanswered" />
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {context.atRisk} <LocalizedText k="workspace.command.atRisk" />
          </span>
        </strong>
      </div>
      <button
        aria-expanded={open}
        aria-label={translate("workspace.command.prompt", languageCode)}
        className="workspace-ai-command"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Sparkles aria-hidden="true" size={16} />
        <span aria-hidden="true">
          <LocalizedText k="workspace.command.prompt" />
        </span>
        <kbd>AI</kbd>
      </button>
      <div className="workspace-command-actions">
        {context.role === "super_admin" ? (
          <Link className="subscription-command-link" href="/platform/subscriptions">
            <CreditCard aria-hidden="true" size={16} />
            <span>
              <LocalizedText k="workspace.command.subscriptions" />
            </span>
          </Link>
        ) : null}
        <ThemeToggle compact />
      </div>

      {open ? (
        <section className="ask-ai-popover" aria-label="Ask AI assistant">
          <div className="ask-ai-header">
            <div>
              <span>
                <Sparkles aria-hidden="true" size={15} />
                <LocalizedText k="workspace.ai.header.label" />
              </span>
              <strong>
                <LocalizedText k="workspace.ai.header.title" />
              </strong>
            </div>
            <button
              aria-label={translate("workspace.ai.close", languageCode)}
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>

          <div className="ask-ai-chips">
            {promptChips.map((chipKey) => (
              <button
                key={chipKey}
                onClick={() => setPrompt(translate(chipKey, languageCode))}
                type="button"
              >
                <LocalizedText k={chipKey} />
              </button>
            ))}
          </div>

          <label className="ask-ai-input">
            <span>
              <LocalizedText k="workspace.ai.question" />
            </span>
            <textarea
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={translate("workspace.ai.placeholder", languageCode)}
              rows={3}
              value={prompt}
            />
          </label>

          <button className="ask-ai-submit" onClick={submitPrompt} type="button">
            <Send aria-hidden="true" size={15} />
            <LocalizedText k="workspace.ai.generate" />
          </button>

          <div className="ask-ai-answer" aria-live="polite">
            <span>
              <LocalizedText k="workspace.ai.suggested" />
            </span>
            <p>{reply}</p>
          </div>
          <p className="ask-ai-boundary">
            <LocalizedText k="workspace.ai.boundary" />
          </p>
        </section>
      ) : null}
    </div>
  );
}
