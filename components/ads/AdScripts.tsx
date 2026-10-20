import Script from "next/script";

import {
  adsterraSocialBarSrc,
  monetagVignetteSrc,
  monetagVignetteZone,
} from "@/lib/monetization";

/**
 * Global third-party ad loaders — Adsterra Social Bar (+ optional Monetag
 * Vignette).
 *
 * These load for every visitor, immediately after hydration, with
 * `strategy="lazyOnload"`: Next injects them in an idle callback once the
 * page has fully loaded, so they contribute 0 ms to FCP/LCP and never
 * compete with the download tool for bandwidth during first paint.
 *
 * Server component on purpose — there is no state to hold and no reason to
 * ship a byte of client JS for two script tags.
 */
export function AdScripts() {
  /**
   * Register Monetag's worker at the domain root. Their verification and push
   * channel both depend on `/sw.js` existing AND being registered; doing it
   * here means it is active even before a Vignette zone id is configured.
   * Failure is swallowed: a blocked or unsupported registration must never
   * surface as a console error on a download page.
   */
  const registerWorker = `(function(){try{if(!("serviceWorker" in navigator))return;var go=function(){navigator.serviceWorker.register("/sw.js").catch(function(){})};if(document.readyState==="complete"){go()}else{window.addEventListener("load",go,{once:true})}}catch(e){}})();`;

  const vignette = monetagVignetteZone
    ? `(function(){try{var s=document.createElement("script");s.dataset.zone=${JSON.stringify(
        monetagVignetteZone,
      )};s.src=${JSON.stringify(
        monetagVignetteSrc,
      )};s.async=true;document.body.appendChild(s);}catch(e){}})();`
    : null;

  return (
    <>
      <Script id="monetag-sw" strategy="afterInteractive">
        {registerWorker}
      </Script>

      {adsterraSocialBarSrc ? (
        <Script
          id="adsterra-social-bar"
          strategy="lazyOnload"
          src={adsterraSocialBarSrc}
          data-cfasync="false"
        />
      ) : null}

      {vignette ? (
        <Script
          id="monetag-vignette"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{ __html: vignette }}
        />
      ) : null}
    </>
  );
}
