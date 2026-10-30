import type { SubToolFaq, SubToolStep } from "@/lib/content/sub-tool-types";

/**
 * Shape of a regional landing page's copy.
 *
 * One file per locale under `lib/i18n/<code>.ts`, each exporting a single
 * `LandingCopy`. The page component renders only these strings, so adding a
 * language is a data change — never a component change — and an untranslated
 * key cannot silently fall back to English on an RTL page.
 */
export type LocaleCode = "ar" | "es" | "de" | "pt" | "id" | "hi" | "vi";

export interface LandingCopy {
  /** Route segment, also used for `hreflang`. */
  code: LocaleCode;
  /** BCP-47 tag for `<html lang>`. */
  htmlLang: string;
  dir: "ltr" | "rtl";
  /** `<title>` — keyword first, ≤ 60 characters. */
  title: string;
  /** Meta description, ~155 characters. */
  description: string;
  keywords: string[];
  eyebrow: string;
  /** First H1 line. */
  h1Lead: string;
  /** Second H1 line, rendered with the gradient. */
  h1Accent: string;
  lede: string;
  chips: [string, string, string];
  /** Small heading above the downloader card + its helper note. */
  tool: { heading: string; note: string };
  /** Four `[term, value]` pairs; the values stay short (2–3 words). */
  facts: [string, string][];
  stepsHeading: string;
  steps: [SubToolStep, SubToolStep, SubToolStep];
  faqHeading: string;
  faqs: SubToolFaq[];
  /** Closing call to action. */
  cta: { heading: string; body: string; button: string };
  /** Heading above the links to the English platform pages. */
  otherToolsHeading: string;
  /** One-line language disclaimer shown near the footer. */
  footerNote: string;
}

export const LOCALE_CODES: readonly LocaleCode[] = ["ar", "es", "de", "pt", "id", "hi", "vi"];

export function isLocaleCode(value: string): value is LocaleCode {
  return (LOCALE_CODES as readonly string[]).includes(value);
}
