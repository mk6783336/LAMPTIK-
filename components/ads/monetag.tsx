import Script from "next/script";

import { monetagTagUrl, monetagZoneId } from "@/lib/monetization";

/**
 * Monetag MultiTag, one instance per document.
 *
 * `next/script` with `strategy="afterInteractive"` injects the tag after the
 * page is hydrated, so it never competes with the document or the tool for the
 * LCP window. The tag carries the account's push subscription worker with it:
 * `public/sw.js` imports 5gvci.com's service-worker bundle (zone 12293328).
 *
 * The zone id and the tag URL live in `lib/monetization.ts`; nothing
 * vendor-specific is hardcoded in a component, and `<Script id>` dedupes the
 * tag across React strict-mode effects and client navigation.
 */
export function MonetagScripts() {
  if (!monetagZoneId || !monetagTagUrl) return null;

  return (
    <Script
      id="monetag-multitag"
      src={monetagTagUrl}
      data-zone={monetagZoneId}
      data-cfasync="false"
      strategy="afterInteractive"
    />
  );
}
