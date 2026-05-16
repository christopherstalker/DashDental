"use client";

import {
  type TranslationKey,
  translate,
} from "@/features/i18n/translations";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";

export function LocalizedText({
  className,
  fallback,
  k,
}: {
  className?: string;
  fallback?: string;
  k: TranslationKey;
}) {
  const languageCode = useCurrentLanguageCode();

  return (
    <span className={className} suppressHydrationWarning>
      {translate(k, languageCode) || fallback}
    </span>
  );
}
