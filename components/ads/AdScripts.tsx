"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { VignetteGuard } from "@/components/ads/VignetteGuard";
import {
  adsterraSocialBarSrc,
  monetagVignetteSrc,
  monetagVignetteZone,
} from "@/lib/monetization";

/**
 * Global third-party ad loaders — loaded for every visitor, on every page.
 *
 * Rules, each learned from a production failure:
 *
 * 1. No consent gate. Both networks were behind `readConsent() === "granted"`
 *    for a while and the result was 22 Monetag impressions against 346 on
 *    Adsterra: visitors who never touch the consent bar were never monetized.
 *    Both scripts now load unconditionally; the consent bar stays as the
 *    disclosure surface, not as a delivery switch.
 *
 * 2. Monetag Vignette on page load. It used to fire only after a third
 *    download, which is why its impression count collapsed. It now loads
 *    `afterInteractive` on every route, so a pageview is an impression again.
 *    Because the creative is a full-viewport overlay, `VignetteGuard` keeps it
 *    from swallowing the first tap on the tool.
 *
 * 3. The Social Bar stays off phones. It is an in-page push format that paints
 *    a fixed strip over the header and eats touch events; under 768px the app
 *    monetizes through the inline banner inventory instead. That is a layout
 *    constraint, not a consent one.
 */
const MOBILE_QUERY = "(max-width: 767px)";

export function AdScripts() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Server render and first paint assume the small viewport: that is the
    // case where an injected overlay hurts most, so the Social Bar stays off
    // until the media query proves we have room for it.
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(query.matches);
    sync();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
    } else {
      query.addListener(sync);
    }

    return () => {
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", sync);
      } else {
        query.removeListener(sync);
      }
    };
  }, []);

  /**
   * Register Monetag's worker at the domain root. Their domain verification
   * and the Vignette both depend on `/sw.js` existing AND being registered —
   * the worker itself shows nothing. Failure is swallowed: a blocked or
   * unsupported registration must never surface as a console error on a
   * download page.
   */
  const registerWorker = `(function(){try{if(!("serviceWorker" in navigator))return;var go=function(){navigator.serviceWorker.register("/sw.js").catch(function(){})};if(document.readyState==="complete"){go()}else{window.addEventListener("load",go,{once:true})}}catch(e){}})();`;

  return (
    <>
      <Script id="monetag-sw" strategy="afterInteractive">
        {registerWorker}
      </Script>

      {/* Monetag Vignette — every pageview, after hydration so it can never
          delay first paint or LCP. `data-zone` is what ties it to the account. */}
      {monetagVignetteZone && monetagVignetteSrc ? (
        <Script
          id="monetag-vignette"
          src={monetagVignetteSrc}
          strategy="afterInteractive"
          data-zone={monetagVignetteZone}
          data-cfasync="false"
        />
      ) : null}

      {!isMobile && adsterraSocialBarSrc ? (
        <Script
          id="adsterra-social-bar"
          strategy="afterInteractive"
          src={adsterraSocialBarSrc}
          data-cfasync="false"
        />
      ) : null}

      <VignetteGuard />
    </>
  );
}
