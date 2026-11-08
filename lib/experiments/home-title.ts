/**
 * Homepage title experiment.
 *
 * `/privacy` was outranking `/` for the brand query, which the homepage now
 * fixes with entity signals. The other half of that fix is the title itself:
 * does leading with the brand ("LAMP TIK — …") serve the brand/navigational
 * query better than leading with the keyword? That is a question about real
 * visitors, so it is measured rather than assumed.
 *
 * Two variants, one cookie:
 *
 * - `control` — the keyword-first title that has been live.
 * - `brand`   — the same phrase with the brand in front; every keyword of the
 *   control still appears, so the test changes word order, not coverage.
 *
 * Assignment happens once, in `middleware.ts`, and is sticky for 30 days, so a
 * visitor never sees the title change under them. Crawlers receive no cookie
 * and therefore always get `control`: Google indexes one stable title instead
 * of a per-request coin flip, which is what keeps the result comparable in
 * Search Console.
 */

/** Keyword first: the title that has been live. 58 chars, no truncation. */
export const CONTROL_TITLE = "TikTok Video Downloader Without Watermark — HD MP4 & MP3";

/** Brand first: same keywords, one shorter suffix. 52 chars. */
export const BRAND_TITLE = "LAMP TIK — TikTok Video Downloader Without Watermark";

export const HOME_TITLE_VARIANTS = {
  control: CONTROL_TITLE,
  brand: BRAND_TITLE,
} as const;

export type HomeTitleVariant = keyof typeof HOME_TITLE_VARIANTS;

/** First-party, functional, 30 days, no personal data — see the privacy page. */
export const HOME_TITLE_COOKIE = "lamptik_title_ab";
export const HOME_TITLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Search crawlers, link unfurlers and synthetic monitors. They never get the
 * cookie, so they always render the control title; the list is deliberately
 * explicit instead of a bare `/bot/` so an ordinary browser string containing
 * "robot" cannot silently opt a real visitor out of the test.
 */
const CRAWLER =
  /bot\b|bot\/|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|discordbot|headlesschrome|pagespeed|lighthouse|ahrefs|semrush|screaming frog|uptime|pingdom/i;

export function isCrawler(userAgent: string): boolean {
  // No user agent at all is a script, not a person: keep it on the control.
  return !userAgent || CRAWLER.test(userAgent);
}

export function isVariant(value: string | undefined): value is HomeTitleVariant {
  return value === "control" || value === "brand";
}

/** 50/50. Called once per visitor, then frozen in the cookie. */
export function pickVariant(): HomeTitleVariant {
  return Math.random() < 0.5 ? "brand" : "control";
}

export function titleFor(variant: HomeTitleVariant): string {
  return HOME_TITLE_VARIANTS[variant];
}
