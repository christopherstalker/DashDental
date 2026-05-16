"use client";

import { useSyncExternalStore } from "react";
import {
  defaultLanguageCode,
  selectableLanguages,
  type SupportedLanguage,
} from "@/features/i18n/languages";

const STORAGE_KEY = "dental-recovery:language:v1";
const CHANGE_EVENT = "dental-recovery:language-change";

function findLanguage(code: string): SupportedLanguage {
  return (
    selectableLanguages.find((language) => language.code.toLowerCase() === code.toLowerCase()) ??
    selectableLanguages.find(
      (language) => language.code.split("-")[0] === code.toLowerCase().split("-")[0],
    ) ??
    selectableLanguages[0]
  );
}

function readStoredLanguageCode(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return findLanguage(JSON.parse(stored).code ?? defaultLanguageCode).code;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getPreferredLanguageCode(): string {
  if (typeof window === "undefined") {
    return defaultLanguageCode;
  }

  return (
    readStoredLanguageCode() ??
    findLanguage(window.navigator.language || defaultLanguageCode).code
  );
}

export function applyDocumentLanguage(code: string) {
  if (typeof document === "undefined") {
    return;
  }

  const language = findLanguage(code);
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.dir;
}

export function setPreferredLanguageCode(code: string) {
  if (typeof window === "undefined") {
    return;
  }

  const language = findLanguage(code);
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      code: language.code,
      version: 1,
    }),
  );
  applyDocumentLanguage(language.code);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: language.code }));
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

export function useCurrentLanguageCode(): string {
  return useSyncExternalStore(
    subscribe,
    getPreferredLanguageCode,
    () => defaultLanguageCode,
  );
}
