import { monetagTagUrl, monetagZoneId } from "@/lib/monetization";

/**
 * Monetag MultiTag (zone 312113, quge5.com) — one instance per document.
 *
 * A literal `<script async>` rather than `next/script`, and that is the whole
 * point: `strategy="afterInteractive"` ships the tag only inside the RSC
 * payload and injects it after hydration, so the served HTML has no
 * executable `<script src>` (only a preload hint) and the ad cannot start
 * until the client bundle has run. The official tag below is in the document
 * from the first byte, exactly as Monetag's snippet specifies; `async` keeps
 * it off the parser's critical path.
 *
 * Rendered once from `components/root-document.tsx`, which both root layouts
 * call — so every page carries exactly one instance. The tag also registers
 * the Web Push worker served from `/sw.js` (zone 12293328).
 *
 * The zone id and the tag URL live in `lib/monetization.ts`; nothing
 * vendor-specific is hardcoded in a component.
 */
export function MonetagScripts() {
  if (!monetagZoneId || !monetagTagUrl) return null;

  return (
    <script
      id="monetag-multitag"
      async
      src={monetagTagUrl}
      data-zone={monetagZoneId}
      data-cfasync="false"
    />
  );
}
