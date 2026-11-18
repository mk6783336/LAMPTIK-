"use client";

import { useEffect } from "react";

import { whenIdle } from "@/lib/idle";
import { monetagTagUrl, monetagZoneId } from "@/lib/monetization";

/**
 * Monetag MultiTag (zone 312113, quge5.com) — one instance per document,
 * started only when the page is actually interactive.
 *
 * History, because this file has now moved twice for measured reasons:
 *
 *   1. `next/script strategy="afterInteractive"` shipped the tag only inside
 *      the RSC payload, so the served HTML carried no executable `<script src>`
 *      and the ad could not start until the client bundle had run.
 *   2. A literal `<script async>` in the document fixed that — but `async`
 *      means "execute the moment the bytes land", which on a phone is exactly
 *      the window React is hydrating the URL field and the browser is painting
 *      the LCP element. A slow ad host therefore owned the main thread during
 *      the only interaction that has to feel instant.
 *
 * Now: the tag is created after hydration, on the first `requestIdleCallback`
 * gap (1.5 s cap, see `lib/idle.ts`), so no third-party connection is opened
 * and no ad code competes with first paint or input latency. The element still
 * gets the official `async` + `data-zone` + `data-cfasync` shape Monetag's
 * snippet specifies, and the `getElementById` guard keeps it at exactly one
 * instance even under a StrictMode double effect or a fast route change.
 *
 * Rendered once from `components/root-document.tsx`, which both root layouts
 * call. Nothing vendor-specific is hardcoded here; the zone id and tag URL
 * live in `lib/monetization.ts`.
 */
const TAG_ID = "monetag-multitag";

/**
 * The first idle gap after paint is the target; this cap only guarantees the
 * tag still starts on a browser that never reports idle (Safari < 15.4, or a
 * page kept busy by the preview player).
 */
const TAG_IDLE_TIMEOUT_MS = 1_500;

export function MonetagScripts() {
  useEffect(() => {
    if (!monetagZoneId || !monetagTagUrl) return;
    let cancelled = false;

    const cancel = whenIdle(() => {
      // Never a second copy: the zone counts one tag per document, and a
      // duplicated loader is both wasted bytes and invalid traffic.
      if (cancelled || document.getElementById(TAG_ID)) return;

      const script = document.createElement("script");
      script.id = TAG_ID;
      script.async = true;
      script.src = monetagTagUrl;
      script.dataset.zone = monetagZoneId;
      script.dataset.cfasync = "false";
      document.head.appendChild(script);
    }, TAG_IDLE_TIMEOUT_MS);

    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  return null;
}
