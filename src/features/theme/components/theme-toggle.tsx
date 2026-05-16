"use client";

import { Moon, Sun } from "lucide-react";
import {
  setPreferredThemeMode,
  useCurrentThemeMode,
} from "@/features/theme/theme-store";

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const themeMode = useCurrentThemeMode();
  const nextTheme = themeMode === "dark" ? "light" : "dark";
  const label = themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme";

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
      {compact ? null : <span suppressHydrationWarning>{themeMode === "dark" ? "Light" : "Dark"}</span>}
    </button>
  );
}
