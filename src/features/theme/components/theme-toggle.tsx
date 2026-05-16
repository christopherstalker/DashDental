"use client";

import { Moon, Sun } from "lucide-react";
import {
  setPreferredThemeMode,
  useCurrentThemeMode,
} from "@/features/theme/theme-store";

const modeLabels = {
  dark: "Dark",
  light: "Light",
  system: "System",
} as const;

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
  const nextTheme = getNextThemeMode(themeMode);
  const label = `Switch theme. Current: ${modeLabels[themeMode]}. Next: ${modeLabels[nextTheme]}.`;

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
