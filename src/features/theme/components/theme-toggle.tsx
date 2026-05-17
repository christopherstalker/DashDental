"use client";

import { Moon, Sun } from "lucide-react";
import { useCurrentLanguageCode } from "@/features/i18n/translation-store";
import { translate } from "@/features/i18n/translations";
import {
  setPreferredThemeMode,
  useCurrentThemeMode,
} from "@/features/theme/theme-store";

function getNextThemeMode(mode: "light" | "dark" | "system") {
  if (mode === "dark") return "light";
  if (mode === "light") return "system";
  return "dark";
}

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const themeMode = useCurrentThemeMode();
  const languageCode = useCurrentLanguageCode();
  const nextTheme = getNextThemeMode(themeMode);
  const modeLabels = {
    dark: translate("common.theme.dark", languageCode),
    light: translate("common.theme.light", languageCode),
    system: translate("common.theme.system", languageCode),
  } as const;
  const label = translate("common.theme.switch", languageCode)
    .replace("{current}", modeLabels[themeMode])
    .replace("{next}", modeLabels[nextTheme]);

  return (
    <button
      aria-label={label}
      className={["theme-toggle", compact ? "compact" : "", className]
        .filter(Boolean)
        .join(" ")}
      onClick={() => setPreferredThemeMode(nextTheme)}
      title={label}
      type="button"
    >
      {themeMode === "dark" ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
      {compact ? null : <span suppressHydrationWarning>{modeLabels[themeMode]}</span>}
    </button>
  );
}
