"use client";

import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "dental-recovery:theme:v2";
const CHANGE_EVENT = "dental-recovery:theme-change";
const DEFAULT_THEME: ThemeMode = "dark";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
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

  document.documentElement.dataset.theme = mode;
}

export function setPreferredThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      mode,
      version: 1,
    }),
  );
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

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useCurrentThemeMode(): ThemeMode {
  return useSyncExternalStore(
    subscribe,
    getPreferredThemeMode,
    () => DEFAULT_THEME,
  );
}
