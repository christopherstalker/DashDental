"use client";

import { useEffect } from "react";
import {
  applyThemeMode,
  useCurrentThemeMode,
} from "@/features/theme/theme-store";

export function ThemeRuntime() {
  const themeMode = useCurrentThemeMode();

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  return null;
}
