"use client";

import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

const STORAGE_KEY = "dental-recovery:theme:v3";
const LEGACY_STORAGE_KEY = "dental-recovery:theme:v2";
const CHANGE_EVENT = "dental-recovery:theme-change";
const DEFAULT_THEME: ThemeMode = "dark";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemThemeMode(): ResolvedThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  return mode === "system" ? getSystemThemeMode() : mode;
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as { mode?: unknown };
    return isThemeMode(parsed.mode) ? parsed.mode : null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getPreferredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  return readStoredTheme() ?? DEFAULT_THEME;
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.themePreference = mode;
  document.documentElement.dataset.theme = resolveThemeMode(mode);
}

export function setPreferredThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      mode,
      version: 2,
    }),
  );
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: mode }));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", callback);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
    media.removeEventListener("change", callback);
  };
}

export function useCurrentThemeMode(): ThemeMode {
  return useSyncExternalStore(
    subscribe,
    getPreferredThemeMode,
    () => DEFAULT_THEME,
  );
}
