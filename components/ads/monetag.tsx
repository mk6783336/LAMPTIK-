"use client";

import { useEffect } from "react";

/**
 * Monetag In-Page Push / MultiTag, loaded after the page is usable.
 *
 * The tag is the visual ad supply the downloader market actually monetizes
 * with: a floating card in a corner, served by Monetag, not a full-viewport
 * layer. It is deliberately NOT in the first paint:
 *
 *   - nothing third-party runs until the document is interactive and either
 *     1.5s has passed or the visitor scrolls/points (whichever comes first);
 *   - the script is appended once per document, so React strict-mode double
 *     effects and client navigation cannot double-load it;
 *   - if the visitor never interacts and the tab is backgrounded, the timer is
 *     the only thing that fires — one request, still after the LCP window.
 *
 * Zone id is configurable; the default is the account's live In-Page Push
 * zone. `NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE_ID` is intentionally not used here:
 * the vignette paints a full-viewport interstitial, which this site's ad
 * integrity audit rejects (`npm run check:ads`).
 */
const ZONE = process.env.NEXT_PUBLIC_MONETAG_ZONE_ID?.trim() || "12181860";
const SCRIPT_SRC = "https://nap5k.com/tag.min.js";
const SCRIPT_ID = "monetag-inpage-push";

export function MonetagScripts() {
  useEffect(() => {
    if (!ZONE) return;
    if (document.getElementById(SCRIPT_ID)) return;

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.dataset.zone = ZONE;
      script.dataset.cfasync = "false";
      script.referrerPolicy = "no-referrer-when-downgrade";
      document.body.appendChild(script);
      cleanup();
    };

    const onInteract = () => load();
    const timer = window.setTimeout(load, 1500);

    // First scroll or pointer move is a stronger signal than a timer: the
    // visitor is engaged, so a card appearing then costs no LCP and no CLS on
    // the initial viewport.
    window.addEventListener("scroll", onInteract, { once: true, passive: true });
    window.addEventListener("pointermove", onInteract, { once: true, passive: true });

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onInteract);
      window.removeEventListener("pointermove", onInteract);
    }

    return cleanup;
  }, []);

  return null;
}
