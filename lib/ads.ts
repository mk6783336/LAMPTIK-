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
 * gives them (Adsterra and HilltopAds both issue `domain, publisher-id,
 * DIRECT` style rows).
 *
 * The value is pasted from two different dashboards, so it is parsed
 * defensively rather than assuming one tidy format:
 *
 *   NEXT_PUBLIC_ADS_TXT_LINES="adsterra.com, 1234567, DIRECT; hilltopads.com, 7654321, DIRECT"
 *
 * Splitting accepts `;` **and** newlines, because a copied block arrives
 * multi-line and a dashboard export often carries the network's own `#`
 * commentary. Anything that is not a seller record (`domain, id, DIRECT[,ca]`)
 * or an ads.txt variable (`CONTACT=`, `OWNERDOMAIN=`, …) is dropped: a
 * malformed line in a served ads.txt is worse than a missing one, because
 * buyers treat the whole file as the publisher's declaration.
 *
 * Empty when unset — `/ads.txt` then answers 404 rather than advertising a
 * publisher we do not run.
 */
function parseAdsTxt(raw: string): string[] {
  const cleaned = raw
    .split(/[;\n\r]+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) =>
      // `domain,id,DIRECT` → `domain, id, DIRECT`. Cosmetic, but it makes the
      // served file look like every documented example a buyer compares to.
      /^[A-Za-z_]+=/.test(line) ? line : line.split(",").map((f) => f.trim()).join(", "),
    )
    .filter((line) => /^[A-Za-z_]+=\S/.test(line) || line.split(",").length >= 3);

  return [...new Set(cleaned)];
}

export const adsTxtLines = parseAdsTxt(process.env.NEXT_PUBLIC_ADS_TXT_LINES ?? "");
