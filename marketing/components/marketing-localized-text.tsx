"use client";

import { useCurrentLanguageCode } from "@/features/i18n/translation-store";

type MarketingLabelKey =
  | "about"
  | "bookClinicDemo"
  | "bookDemo"
  | "contact"
  | "guidedPilot"
  | "howItWorks"
  | "humanReviewedAi"
  | "leadIntakeOnly"
  | "noMedicalRecords"
  | "sampleDashboard"
  | "support";

const localizedLabels: Record<MarketingLabelKey, Record<"en" | "uk", string>> = {
  about: {
    en: "About",
    uk: "Про нас",
  },
  bookClinicDemo: {
    en: "Book 15-min clinic demo",
    uk: "Записатися на 15-хв демо",
  },
  bookDemo: {
    en: "Book demo",
    uk: "Записатися на демо",
  },
  contact: {
    en: "Contact",
    uk: "Контакти",
  },
  guidedPilot: {
    en: "Guided pilot available",
    uk: "Доступний супровід запуску",
  },
  howItWorks: {
    en: "How it works",
    uk: "Як це працює",
  },
  humanReviewedAi: {
    en: "Human-reviewed AI drafts",
    uk: "AI-чернетки з перевіркою команди",
  },
  leadIntakeOnly: {
    en: "Lead intake only",
    uk: "Лише вхідні звернення",
  },
  noMedicalRecords: {
    en: "No medical records required",
    uk: "Медичні записи не потрібні",
  },
  sampleDashboard: {
    en: "Try sample dashboard",
    uk: "Відкрити демо-панель",
  },
  support: {
    en: "Support",
    uk: "Підтримка",
  },
};

function resolveLanguage(code: string): "en" | "uk" {
  return code.toLowerCase().startsWith("uk") ? "uk" : "en";
}

export function MarketingLocalizedText({
  className,
  fallback,
  k,
}: {
  className?: string;
  fallback?: string;
  k: MarketingLabelKey;
}) {
  const languageCode = useCurrentLanguageCode();
  const normalized = resolveLanguage(languageCode);

  return (
    <span className={className} suppressHydrationWarning>
      {localizedLabels[k][normalized] ?? fallback ?? localizedLabels[k].en}
    </span>
  );
}
