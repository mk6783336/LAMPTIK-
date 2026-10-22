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
 * Two hard rules learned the hard way in production:
 *
 * 1. Consent first. The Adsterra Social Bar (an in-page push / pop-under
 *    format that sets advertising cookies) is injected ONLY after the visitor
 *    presses "Accept". Until then — and for every visitor who declines — the
 *    page runs the contextual banner inventory alone, which is what the
 *    privacy policy promises.
 *
 * 2. No page-load interstitials. The Monetag Vignette injects a fixed
 *    full-viewport iframe at `z-index: 2147483647` the moment its script
 *    runs, which sits on top of the download button and swallows the click.
 *    It is therefore fired on demand from `ThirdDownloadModal` (a real user
 *    gesture, every third download) via `triggerMonetagVignette()` — never
 *    from the document shell.
 *
 * The Social Bar is `lazyOnload`: Next injects it in an idle callback once
 * the document is complete, so it costs 0 ms of FCP/LCP and never competes
 * with the download tool for bandwidth during first paint.
 */
export function AdScripts() {
  const [consent, setConsent] = useState<ConsentDecision | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<ConsentDecision>).detail;
      if (detail === "granted" || detail === "denied") setConsent(detail);
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  /**
   * Register Monetag's worker at the domain root. Their domain verification
   * and the on-demand vignette both depend on `/sw.js` existing AND being
   * registered — the worker itself shows nothing. Failure is swallowed: a
   * blocked or unsupported registration must never surface as a console error
   * on a download page.
   */
  const registerWorker = `(function(){try{if(!("serviceWorker" in navigator))return;var go=function(){navigator.serviceWorker.register("/sw.js").catch(function(){})};if(document.readyState==="complete"){go()}else{window.addEventListener("load",go,{once:true})}}catch(e){}})();`;

  return (
    <>
      <Script id="monetag-sw" strategy="afterInteractive">
        {registerWorker}
      </Script>

      {consent === "granted" && adsterraSocialBarSrc ? (
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
