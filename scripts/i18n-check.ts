import {
  productionReadyLanguageCodes,
  selectableLanguages,
  supportedLanguages,
} from "../src/features/i18n/languages";
import {
  getMergedDictionary,
  getTranslationKeys,
  translate,
} from "../src/features/i18n/translations";

const mojibakeCodePoints = new Set([
  0x00c2, // Â
  0x00c3, // Ã
  0x00d0, // Ð
  0x00d1, // Ñ
  0x00d7, // ×
  0x00d8, // Ø
  0x00d9, // Ù
]);

function containsMojibake(value: string) {
  return [...value].some((char) => mojibakeCodePoints.has(char.codePointAt(0) ?? 0));
}

const keys = getTranslationKeys();
const failures: string[] = [];

if (selectableLanguages.some((language) => language.code.toLowerCase().startsWith("ru"))) {
  failures.push("Russian is selectable, but it is not approved for production launch.");
}

for (const language of supportedLanguages) {
  if (productionReadyLanguageCodes.has(language.code) && containsMojibake(language.nativeName)) {
    failures.push(`${language.code}: native language name appears mojibake: ${language.nativeName}`);
  }
}

for (const language of selectableLanguages) {
  const dictionary = getMergedDictionary(language.code);
  const missingKeys = keys.filter((key) => dictionary[key] === undefined);

  if (missingKeys.length > 0) {
    failures.push(
      `${language.code}: missing ${missingKeys.length} translation key(s), first: ${missingKeys
        .slice(0, 6)
        .join(", ")}`,
    );
  }

  for (const key of keys) {
    const value = translate(key, language.code);

    if (!value || value === key) {
      failures.push(`${language.code}: raw or empty translation for ${key}`);
      break;
    }

    if (containsMojibake(value)) {
      failures.push(`${language.code}: mojibake in ${key}: ${value}`);
      break;
    }
  }
}

if (failures.length > 0) {
  console.error("i18n check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `i18n check passed: ${selectableLanguages.length} selectable locale(s), ${keys.length} keys each.`,
);
