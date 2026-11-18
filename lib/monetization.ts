/**
 * Monetization engine — one network (Monetag): a MultiTag zone plus the
 * click-triggered Smartlink.
 *
 * Why the old display stack went away (2026-11-14):
 *
 *   The page used to carry Adsterra banners in nine placements, a HilltopAds
 *   MultiTag and a side rail per margin — three networks bidding on the same
 *   visitor. Adsterra's creative domains are on Safe Browsing lists often
 *   enough to cost organic impressions, and every one of those slots was a
 *   third-party request competing with the tool's LCP/INP. The measured result
 *   was $0.00 over 447 Adsterra impressions while Monetag's Direct Link was
 *   the only line that paid. So: no Adsterra, no HilltopAds, no banner frames,
 *   no side rails.
 *
 * Current stack (2026-11-18): one Monetag MultiTag zone (312113) served from
 * quge5.com, the Web Push service worker at `/sw.js` (zone 12293328), and the
 * Direct Link/Smartlink below. The tag is the official async `<script>` in
 * `components/ads/monetag.tsx`, mounted once per document and injected on the
 * visitor's first gesture (pointerdown/keydown) — a cold visit makes zero
 * requests to any ad host, so it never competes with first paint or input
 * latency — and it is the only third-party ad script the document requests.
 *
 * Design rules (non-negotiable):
 *   1. The download is never delayed by an ad. The Smartlink opens alongside
 *      the click, after the file hand-off has been dispatched.
 *   2. Our own UI never paints over the page: no vignette element, no social
 *      bar, no overlay of our own. Which formats the MultiTag zone serves is
 *      configured in the Monetag dashboard, not here.
 *   3. Capped for automatic triggers only. The Smartlink is rate-limited in
 *      `lib/smartlink.ts` — one auto-trigger per 90 seconds and ten per day per
 *      browser — so a burst of five format clicks is not taxed five times.
 *      Explicit clicks on a labelled partner unit are never capped: the visitor
 *      asked for that tab.
 *
 * Every env read below is a static `process.env.NEXT_PUBLIC_*` member
 * expression — Next.js inlines those at build time.
 */

/**
 * Primary Monetag Direct Link (Smartlink): zone 12078941, the account's
 * high-CPM line (measured at ~$3.29 CPM). It is the first link every rotation
 * starts with, and the fallback wherever a secondary link is unset.
 */
export const smartlinkUrl =
  process.env.NEXT_PUBLIC_SMARTLINK_URL?.trim() || "https://uplcm.com/4/12078941";

/** Second link in the rotation, used by the secondary partner placements. */
export const smartlinkUrl2 =
  process.env.NEXT_PUBLIC_SMARTLINK_URL_2?.trim() || "https://uplcm.com/4/12263665";

/** Third link in the rotation; keeps one zone from seeing every trigger. */
export const smartlinkUrl3 =
  process.env.NEXT_PUBLIC_SMARTLINK_URL_3?.trim() || "https://uplcm.com/4/12263661";

/** Monetag domain-verification token, emitted as `<meta name="monetag">`. */
export const monetagVerification = process.env.NEXT_PUBLIC_MONETAG_META?.trim() || null;

/**
 * Monetag MultiTag zone id, emitted as `data-zone` on the tag. The Web Push
 * worker at `/sw.js` has its own zone (12293328), so the two are configured
 * independently in the Monetag dashboard.
 */
export const monetagZoneId =
  process.env.NEXT_PUBLIC_MONETAG_ZONE_ID?.trim() || "312113";

/**
 * Official MultiTag loader for `monetagZoneId`.
 *
 * quge5.com is the account's MultiTag domain (the push worker is served from
 * 5gvci.com instead). The snippet puts the zone in `data-zone`, not in the URL.
 */
export const monetagTagUrl =
  process.env.NEXT_PUBLIC_MONETAG_TAG_URL?.trim() || "https://quge5.com/88/tag.min.js";

/** True when at least one Monetag surface is configured. */
export const adsConfigured = Boolean(smartlinkUrl);

/**
 * Frequency cap for the click-triggered Smartlink.
 *
 * A downloader visitor downloads several files per session; opening a partner
 * tab on every one turns the site into the redirect pattern the market's worst
 * tools use, and bounce rate eats the impressions the tab was meant to earn.
 * One open per 90 seconds, at most ten per day, keeps a burst of format clicks
 * event instead of a tax on repeat use.
 */
export const SMARTLINK_WINDOW_MS = 90 * 1000;
export const SMARTLINK_MAX_PER_WINDOW = 1;
export const SMARTLINK_DAY_MS = 24 * 60 * 60 * 1000;
export const SMARTLINK_MAX_PER_DAY = 10;
