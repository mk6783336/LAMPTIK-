import type { LandingCopy, LocaleCode } from "@/lib/i18n/types";

import { ar } from "./ar";
import { de } from "./de";
import { es } from "./es";
import { hi } from "./hi";
import { id } from "./id";
import { pt } from "./pt";
import { vi } from "./vi";

/**
 * Every shipped regional landing page.
 *
 * Typed as a total `Record`, so adding a code to `LOCALE_CODES` without a
 * copy file is a compile error rather than a page that silently renders
 * English under a Spanish hreflang.
 */
export const LANDINGS: Record<LocaleCode, LandingCopy> = { ar, es, de, pt, id, hi, vi };

export function getLanding(code: LocaleCode): LandingCopy {
  return LANDINGS[code];
}

export { isLocaleCode, LOCALE_CODES } from "@/lib/i18n/types";
export type { LandingCopy, LocaleCode } from "@/lib/i18n/types";
