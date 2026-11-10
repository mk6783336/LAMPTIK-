"use client";

import { useEffect } from "react";

/**
 * Loads the GTM container after `load`, never during it.
 *
 * Why not `next/script`: `strategy="lazyOnload"` only delays a script Next
 * injects itself. An INLINE container bootstrap is part of the document/RSC
 * payload, so it executes at parse time regardless of strategy — measured on
 * production, `gtm.js` still started at 792ms while `load` had not fired.
 *
 * This waits for the window `load` event and falls back to a 6s cap, so a page
 * with a slow third-party resource can still never lose its container. The
 * measurement path (page views, download_start, platform_switch) is the direct
 * GA4 tag in `google-analytics.tsx` and does not depend on this file.
 */
let started = false;

const SNIPPET = (id: string) =>
  `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
  `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
  `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
  `f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(id)});`;

export function GoogleTagManagerLoader({ containerId }: { containerId: string }) {
  useEffect(() => {
    if (started) return;

    let timer = 0;
    const start = () => {
      if (started) return;
      started = true;
      try {
        // eslint-disable-next-line no-new-func -- the container bootstrap is
        // Google's own snippet, and running it as a function keeps this file
        // free of a second inline <script> the parser would execute at once.
        new Function(SNIPPET(containerId))();
      } catch {
        // Analytics must never break the tool.
      }
    };

    if (document.readyState === "complete") {
      timer = window.setTimeout(start, 0);
      return () => window.clearTimeout(timer);
    }

    const onLoad = () => start();
    window.addEventListener("load", onLoad, { once: true });
    timer = window.setTimeout(start, 6_000);
    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(timer);
    };
  }, [containerId]);

  return null;
}
