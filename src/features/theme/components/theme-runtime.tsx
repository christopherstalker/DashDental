"use client";

import { useEffect } from "react";
import {
  applyAccentTheme,
  applyThemeMode,
  useCurrentAccentTheme,
  useCurrentThemeMode,
} from "@/features/theme/theme-store";

export function ThemeRuntime() {
  const themeMode = useCurrentThemeMode();
  const accentTheme = useCurrentAccentTheme();

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    applyAccentTheme(accentTheme);
  }, [accentTheme]);

  return null;
}
