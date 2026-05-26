"use client";

import { Moon, Sun } from "lucide-react";
import {
  setPreferredThemeMode,
  useCurrentThemeMode,
  type ThemeMode,
} from "@/features/theme/theme-store";

function nextTheme(mode: ThemeMode): ThemeMode {
  return mode === "light" ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const mode = useCurrentThemeMode();
  const resolved = mode === "system" ? "dark" : mode;
  const label = resolved === "light" ? "Switch to dark theme" : "Switch to light theme";
  const Icon = resolved === "light" ? Moon : Sun;

  return (
    <button
      aria-label={label}
      className={`ddr-icon-button ddr-theme-toggle ${className}`}
      onClick={() => setPreferredThemeMode(nextTheme(resolved))}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
    </button>
  );
}
