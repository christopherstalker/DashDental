export type LocaleDirection = "ltr" | "rtl";

export interface SupportedLanguage {
  code: string;
  dir: LocaleDirection;
  englishName: string;
  nativeName: string;
}

export const supportedLanguages: SupportedLanguage[] = [
  { code: "en", dir: "ltr", englishName: "English", nativeName: "English" },
];

export const defaultLanguageCode = "en";

export const productionReadyLanguageCodes = new Set(["en"]);

export const selectableLanguages = supportedLanguages.filter((language) =>
  productionReadyLanguageCodes.has(language.code),
);

export function isSelectableLanguageCode(code: string) {
  const normalized = code.toLowerCase();

  return selectableLanguages.some(
    (language) =>
      language.code.toLowerCase() === normalized ||
      language.code.split("-")[0]?.toLowerCase() === normalized.split("-")[0],
  );
}
