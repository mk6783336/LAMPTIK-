"use client";

import Script from "next/script";

/**
 * Global third-party ad surface — minimal, non-blocking, mobile-safe.
 *
 * LAMP TIK monetizes exclusively through formats that can never paint an
 * invisible full-viewport layer over the page:
 *
 * 1. In-flow banner slots (`AdSlot.tsx`, leaderboard + rectangle) rendered
 *    inside `position: relative; overflow: hidden` boxes.
 * 2. The HilltopAds Direct Link (`idealistic-revenue.com/FtK1df`) opened from
 *    a *real* user click on the download button
 *    (`triggerDownloadDirectLink`), never on page load.
 * 3. The inline 10-second countdown in `result-panel.tsx`.
 * 4. The submit-time VAST gate in `VideoAdGate.tsx` — a visible, timed card
 *    whose countdown is independent of the ad request and which portals above
 *    the page rather than relying on a remote creative to stay clickable.
 *
 * The Monetag Vignette (`vignette.min.js`) and the Adsterra Social Bar are
 * banned here on purpose: both inject `position: fixed; inset: 0;
 * z-index: 2147483647` layers whose tap-through depends on their remote
 * creative rendering correctly. When that creative hangs (slow phone, poor
 * network), the invisible iframe stays over the whole page and swallows every
 * tap and scroll gesture — the "site frozen on mobile" production failure.
 *
 * What remains is the Service Worker registration at the domain root: the
 * Direct Link account's domain verification requires `/sw.js` to exist AND be
 * registered. The worker itself renders nothing. Registration failures are
 * swallowed — a blocked or unsupported case must never surface as a console
 * error on a download page.
 */
export function AdScripts() {
  const registerWorker = `(function(){try{if(!("serviceWorker" in navigator))return;var go=function(){navigator.serviceWorker.register("/sw.js").catch(function(){})};if(document.readyState==="complete"){go()}else{window.addEventListener("load",go,{once:true})}}catch(e){}})();`;

  return (
    <Script id="monetag-sw" strategy="afterInteractive">
      {registerWorker}
    </Script>
  );
}
