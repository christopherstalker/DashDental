"use client";

import { Languages } from "lucide-react";
import {
  selectableLanguages,
} from "@/features/i18n/languages";
import {
  setPreferredLanguageCode,
  useCurrentLanguageCode,
} from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";

export function LanguageSwitcher({
  compact = false,
  className = "",
  tone = "light",
}: {
  compact?: boolean;
  className?: string;
  tone?: "dark" | "light";
}) {
  const languageCode = useCurrentLanguageCode();

  return (
    <label
      className={[
        "language-switcher",
        `language-switcher-${tone}`,
        compact ? "compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Languages size={15} />
      <span suppressHydrationWarning>{translate("common.language.label", languageCode)}</span>
      <select
        aria-label={translate("common.language.aria", languageCode)}
        onChange={(event) => setPreferredLanguageCode(event.target.value)}
        title={translate("common.language.aria", languageCode)}
        suppressHydrationWarning
        value={languageCode}
      >
        {selectableLanguages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
