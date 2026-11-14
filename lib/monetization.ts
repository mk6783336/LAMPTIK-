/**
 * Monetization engine — one network (Monetag), one paid surface (the
 * click-triggered Smartlink).
 *
 * Why the display stack went away (2026-11-14):
 *
 *   The page used to carry Adsterra banners in nine placements, a HilltopAds
 *   MultiTag and a side rail per margin — three networks bidding on the same
 *   visitor. Adsterra's creative domains are on Safe Browsing lists often
 *   enough to cost organic impressions, and every one of those slots was a
 *   third-party request competing with the tool's LCP/INP. The measured result
 *   was $0.00 over 447 Adsterra impressions while Monetag's Direct Link was
 *   the only line that paid. So: no Adsterra, no HilltopAds, no banner frames,
 *   no push tags, no side rails. Nothing third-party loads before the visitor
 *   asks for a file.
 *
 * Design rules (non-negotiable):
 *   1. The download is never delayed by an ad. The Smartlink opens alongside
 *      the click, after the file hand-off has been dispatched.
 *   2. Nothing paints over the page. No vignette, no social bar, no overlay,
 *      no push card: the Monetag `vignette.min.js` froze mobile touch input and
 *      its in-page push inventory is fake-system-notification stock, which
 *      Chrome's deceptive-site classifier treats as such.
 *   3. Capped. The Smartlink is rate-limited in `lib/smartlink.ts` — one
 *      trigger per four hours and two per day per browser — so a repeat visitor
 *      downloading five formats is not taxed five times.
 *
 * Every env read below is a static `process.env.NEXT_PUBLIC_*` member
 * expression — Next.js inlines those at build time.
 */

/**
 * Monetag Direct Link (Smartlink), shown as a clearly labelled sponsored card
 * and opened on a download click within the cap. Empty by default: without it
 * the card renders nothing, reserves no space, and no tab ever opens.
 */
export const smartlinkUrl = process.env.NEXT_PUBLIC_SMARTLINK_URL?.trim() || "";

/** Monetag domain-verification token, emitted as `<meta name="monetag">`. */
export const monetagVerification = process.env.NEXT_PUBLIC_MONETAG_META?.trim() || null;

/** True when at least one Monetag surface is configured. */
export const adsConfigured = Boolean(smartlinkUrl);

/**
 * Frequency cap for the click-triggered Smartlink.
 *
 * A downloader visitor downloads several files per session; opening a partner
 * tab on every one turns the site into the redirect pattern the market's worst
 * tools use, and bounce rate eats the impressions the tab was meant to earn.
 * One open per four hours, at most two per day, keeps the trigger a first-visit
 * event instead of a tax on repeat use.
 */
export const SMARTLINK_WINDOW_MS = 4 * 60 * 60 * 1000;
export const SMARTLINK_MAX_PER_WINDOW = 1;
export const SMARTLINK_DAY_MS = 24 * 60 * 60 * 1000;
export const SMARTLINK_MAX_PER_DAY = 2;
