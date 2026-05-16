export type LocaleDirection = "ltr" | "rtl";

export interface SupportedLanguage {
  code: string;
  dir: LocaleDirection;
  englishName: string;
  nativeName: string;
}

export const supportedLanguages: SupportedLanguage[] = [
  { code: "en", dir: "ltr", englishName: "English", nativeName: "English" },
  { code: "uk", dir: "ltr", englishName: "Ukrainian", nativeName: "Українська" },
  { code: "pl", dir: "ltr", englishName: "Polish", nativeName: "Polski" },
  { code: "de", dir: "ltr", englishName: "German", nativeName: "Deutsch" },
  { code: "fr", dir: "ltr", englishName: "French", nativeName: "Français" },
  { code: "es", dir: "ltr", englishName: "Spanish", nativeName: "Español" },
  { code: "it", dir: "ltr", englishName: "Italian", nativeName: "Italiano" },
  { code: "pt-BR", dir: "ltr", englishName: "Portuguese (Brazil)", nativeName: "Português (BR)" },
  { code: "pt-PT", dir: "ltr", englishName: "Portuguese (Portugal)", nativeName: "Português (PT)" },
  { code: "nl", dir: "ltr", englishName: "Dutch", nativeName: "Nederlands" },
  { code: "sv", dir: "ltr", englishName: "Swedish", nativeName: "Svenska" },
  { code: "no", dir: "ltr", englishName: "Norwegian", nativeName: "Norsk" },
  { code: "da", dir: "ltr", englishName: "Danish", nativeName: "Dansk" },
  { code: "fi", dir: "ltr", englishName: "Finnish", nativeName: "Suomi" },
  { code: "et", dir: "ltr", englishName: "Estonian", nativeName: "Eesti" },
  { code: "lv", dir: "ltr", englishName: "Latvian", nativeName: "Latviešu" },
  { code: "lt", dir: "ltr", englishName: "Lithuanian", nativeName: "Lietuvių" },
  { code: "cs", dir: "ltr", englishName: "Czech", nativeName: "Čeština" },
  { code: "sk", dir: "ltr", englishName: "Slovak", nativeName: "Slovenčina" },
  { code: "hu", dir: "ltr", englishName: "Hungarian", nativeName: "Magyar" },
  { code: "ro", dir: "ltr", englishName: "Romanian", nativeName: "Română" },
  { code: "bg", dir: "ltr", englishName: "Bulgarian", nativeName: "Български" },
  { code: "el", dir: "ltr", englishName: "Greek", nativeName: "Ελληνικά" },
  { code: "tr", dir: "ltr", englishName: "Turkish", nativeName: "Türkçe" },
  { code: "ar", dir: "rtl", englishName: "Arabic", nativeName: "العربية" },
  { code: "he", dir: "rtl", englishName: "Hebrew", nativeName: "עברית" },
  { code: "fa", dir: "rtl", englishName: "Persian", nativeName: "فارسی" },
  { code: "hi", dir: "ltr", englishName: "Hindi", nativeName: "हिन्दी" },
  { code: "ur", dir: "rtl", englishName: "Urdu", nativeName: "اردو" },
  { code: "zh-CN", dir: "ltr", englishName: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "zh-TW", dir: "ltr", englishName: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "ja", dir: "ltr", englishName: "Japanese", nativeName: "日本語" },
  { code: "ko", dir: "ltr", englishName: "Korean", nativeName: "한국어" },
  { code: "id", dir: "ltr", englishName: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ms", dir: "ltr", englishName: "Malay", nativeName: "Bahasa Melayu" },
  { code: "th", dir: "ltr", englishName: "Thai", nativeName: "ไทย" },
  { code: "vi", dir: "ltr", englishName: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "fil", dir: "ltr", englishName: "Filipino", nativeName: "Filipino" },
  { code: "sw", dir: "ltr", englishName: "Swahili", nativeName: "Kiswahili" },
];

export const defaultLanguageCode = "en";

export const productionReadyLanguageCodes = new Set(["en", "uk"]);

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
