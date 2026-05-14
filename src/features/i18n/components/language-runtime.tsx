"use client";

import { useEffect } from "react";
import {
  applyDocumentLanguage,
  useCurrentLanguageCode,
} from "@/features/i18n/translation-store";

export function LanguageRuntime() {
  const languageCode = useCurrentLanguageCode();

  useEffect(() => {
    applyDocumentLanguage(languageCode);
  }, [languageCode]);

  return null;
}
