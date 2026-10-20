/**
 * Non-AdSense advertising configuration.
 *
 * Ad delivery itself lives in `lib/monetization.ts` + `components/ads/*`
 * (Adsterra banners / Social Bar, Monetag Vignette + SmartLink). This module
 * only holds the small bits of static config those systems and the crawler
 * files need — plus `ads.txt`, which the ad networks use to verify that we
 * are allowed to sell their inventory on this domain.
 *
 * Every read is a static `process.env.NEXT_PUBLIC_*` member expression so
 * Next.js can inline it at build time.
 */

export const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || null;

export const adsContactEmail =
  process.env.NEXT_PUBLIC_ADS_CONTACT_EMAIL?.trim() || null;

/**
 * Raw `ads.txt` records, one per line, exactly as the network's dashboard
 * gives them (Monetag and Adsterra both issue `domain, publisher-id, DIRECT`
 * style rows). Semicolon-separated in the env so a single variable carries
 * the whole file:
 *
 *   NEXT_PUBLIC_ADS_TXT_LINES="adsterra.com, 1234567, DIRECT; monetag.com, 7654321, DIRECT"
 *
 * Empty when unset — `/ads.txt` then answers 404 rather than advertising a
 * publisher we do not run.
 */
export const adsTxtLines = (process.env.NEXT_PUBLIC_ADS_TXT_LINES ?? "")
  .split(";")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);
