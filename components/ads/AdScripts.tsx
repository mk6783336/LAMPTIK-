"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import {
  CONSENT_EVENT,
  readConsent,
  type ConsentDecision,
} from "@/components/consent-mode";
import { adsterraSocialBarSrc } from "@/lib/monetization";

/**
 * Global third-party ad loaders — the smallest set that is safe to load
 * before a user action.
 *
 * Hard rules, each learned from a production failure:
 *
 * 1. Desktop only. The Adsterra Social Bar is an in-page push / pop-under
 *    format. On phones it paints a fixed strip over the top of the viewport
 *    (covering the logo and platform tabs), swallows taps and makes scrolling
 *    feel stuck. Under 768px the app runs on the inline banner inventory only:
 *    the 728x90 / 300x250 slots, the in-download sponsor theater and the
 *    every-3rd-download video modal — all of which are part of the page flow
 *    and can never intercept a gesture.
 *
 * 2. Consent first. Even on desktop the Social Bar is injected ONLY after the
 *    visitor presses "Accept", because it sets advertising cookies.
 *
 * 3. No page-load interstitials. The Monetag Vignette injects a fixed
 *    full-viewport iframe at `z-index: 2147483647` the moment its script runs,
 *    which sits on top of the download button and swallows the click. It is
 *    fired on demand from the download flow (`triggerMonetagVignette()`)
 *    instead — never from the document shell.
 */
const MOBILE_QUERY = "(max-width: 767px)";

export function AdScripts() {
  const [consent, setConsent] = useState<ConsentDecision | null>(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Server render and first paint must assume the small viewport: that is
    // the case where an injected script hurts most, so it stays off until the
    // media query proves otherwise.
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(query.matches);
    sync();

    setConsent(readConsent());

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<ConsentDecision>).detail;
      if (detail === "granted" || detail === "denied") setConsent(detail);
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
    } else {
      query.addListener(sync);
    }

    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", sync);
      } else {
        query.removeListener(sync);
      }
    };
  }, []);

  /**
   * Register Monetag's worker at the domain root. Their domain verification
   * and the on-demand vignette both depend on `/sw.js` existing AND being
   * registered — the worker itself shows nothing. Failure is swallowed: a
   * blocked or unsupported registration must never surface as a console error
   * on a download page.
   */
  const registerWorker = `(function(){try{if(!("serviceWorker" in navigator))return;var go=function(){navigator.serviceWorker.register("/sw.js").catch(function(){})};if(document.readyState==="complete"){go()}else{window.addEventListener("load",go,{once:true})}}catch(e){}})();`;

  const showSocialBar = !isMobile && consent === "granted" && adsterraSocialBarSrc;

  return (
    <>
      <Script id="monetag-sw" strategy="afterInteractive">
        {registerWorker}
      </Script>

      {showSocialBar ? (
        <Script
          id="adsterra-social-bar"
          strategy="lazyOnload"
          src={adsterraSocialBarSrc}
          data-cfasync="false"
        />
      ) : null}
    </>
  );
}
