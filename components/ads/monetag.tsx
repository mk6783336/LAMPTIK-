"use client";

import { useEffect } from "react";

import { monetagTagUrl, monetagZoneId } from "@/lib/monetization";

/**
 * Monetag MultiTag (zone 312113, quge5.com) — one instance per document,
 * injected on the first genuine gesture and never before.
 *
 * History, because this file has moved for measured reasons each time:
 *
 *   1. `next/script strategy="afterInteractive"` shipped the tag only inside
 *      the RSC payload, so the ad could not start until the client bundle ran.
 *   2. A literal `<script async>` in the document fixed that — but `async`
 *      executes the moment the bytes land, which on a phone is exactly the
 *      window React is hydrating the URL field and the browser is painting
 *      the LCP element.
 *   3. A `requestIdleCallback` start (1.2 s cap) moved it off the critical
 *      path, but the tag still opened its own connection during the visit's
 *      first seconds. `quge5.com` and `5gvci.com` regularly answer slowly or
 *      drop a TLS handshake from consumer networks, and a pending third-party
 *      connection is enough to keep a phone's radio busy and its main thread
 *      busy decoding the 105 KB loader.
 *
 * Now: nothing is requested until the visitor actually touches the page.
 *
 *   window.addEventListener("pointerdown", loadAdsOnce, { once: true, passive: true });
 *   window.addEventListener("keydown", loadAdsOnce, { once: true, passive: true });
 *
 * That is the first moment an ad can be relevant — and the first moment it
 * cannot delay anything the visitor is waiting for. A cold visit performs
 * ZERO requests to any ad host, which is what makes the first paint (and the
 * first paste) behave like a static page. The listeners are passive and
 * self-removing, so observing a scroll or a click can never block it.
 *
 * The injected element keeps the official `async` + `data-zone` +
 * `data-cfasync` shape Monetag's snippet specifies, and the `getElementById`
 * guard keeps it at exactly one instance even when both gestures fire (or
 * React StrictMode runs the effect twice).
 *
 * Rendered once from `components/root-document.tsx`, which both root layouts
 * call. Nothing vendor-specific is hardcoded here; the zone id and tag URL
 * live in `lib/monetization.ts`.
 */
const TAG_ID = "monetag-multitag";

export function MonetagScripts() {
  useEffect(() => {
    if (!monetagZoneId || !monetagTagUrl) return;

    const loadAdsOnce = () => {
      // One tag per document: a second loader is wasted bytes and invalid
      // traffic, and both gestures can fire before React tears anything down.
      if (document.getElementById(TAG_ID)) return;

      const script = document.createElement("script");
      script.id = TAG_ID;
      script.async = true;
      script.src = monetagTagUrl;
      script.dataset.zone = monetagZoneId;
      script.dataset.cfasync = "false";
      document.head.appendChild(script);
    };

    // `passive` promises the handler never calls preventDefault, so the
    // browser never waits on us while it scrolls or dispatches the gesture.
    // `once` removes each listener after its own first fire.
    const options = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", loadAdsOnce, options);
    window.addEventListener("keydown", loadAdsOnce, options);

    return () => {
      window.removeEventListener("pointerdown", loadAdsOnce);
      window.removeEventListener("keydown", loadAdsOnce);
    };
  }, []);

  return null;
}
