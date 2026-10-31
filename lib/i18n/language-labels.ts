import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Language labels stay in their own language, never translated: "Deutsch", not
 * "German". A reader scanning for their language recognises the endonym faster
 * than any translation of it, and the label then matches the page it opens.
 *
 * One map, shared by the localized switchers and the language blocks on the
 * English platform pages and the /tools hub — a locale added to `LOCALE_CODES`
 * without a label here renders its uppercased code instead of an empty chip.
 */
export const LANGUAGE_LABELS: Record<LocaleCode | "en", string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  id: "Bahasa Indonesia",
  hi: "हिन्दी",
  vi: "Tiếng Việt",
  th: "ไทย",
  tl: "Filipino",
};

/** The label for a language code, falling back to the code itself. */
export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code as LocaleCode] ?? code.toUpperCase();
}
