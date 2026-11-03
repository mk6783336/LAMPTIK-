"use client";

import Script from "next/script";

import { hilltopMultitagSrc, monetagInPageSrc } from "@/lib/monetization";

/**
 * Global third-party ad surface — minimal, non-blocking, mobile-safe.
 *
 * LAMP TIK monetizes exclusively through formats that can never paint an
 * invisible full-viewport layer over the page:
 *
 * 1. In-flow banner slots (`AdSlot.tsx`, leaderboard + rectangle) rendered
 *    inside `position: relative; overflow: hidden` boxes.
 * 2. The HilltopAds Direct Link (`idealistic-revenue.com/FtK1df`) as the href
 *    of a visible sponsored card — the side rail and the banner fallback —
 *    i.e. only where the visitor sees what they are clicking. It is never
 *    opened programmatically from the download button: a download click
 *    produces the file and nothing else.
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
 * The HilltopAds MultiTag (`hilltopMultitagSrc`) is the one added surface, and
 * it is the same shape as the sanctioned Monetag In-Page Push: the network
 * renders small cards in its own corner, never an `inset: 0` layer, so a slow
 * creative cannot swallow taps. Both push networks mount only when their tag
 * source resolves; if both are configured they compete for the same corner, so
 * configure one.
 *
 * What remains is the Service Worker registration at the domain root: the
 * Direct Link account's domain verification requires `/sw.js` to exist AND be
 * registered. The worker itself renders nothing. Registration failures are
 * swallowed — a blocked or unsupported case must never surface as a console
 * error on a download page.
 */
export function AdScripts() {
  const registerWorker = `(function(){try{if(!("serviceWorker" in navigator))return;var go=function(){navigator.serviceWorker.register("/sw.js").catch(function(){})};if(document.readyState==="complete"){go()}else{window.addEventListener("load",go,{once:true})}}catch(e){}})();`;

  // The network's own loader resolves its insertion point with
  // `document.currentScript`, which is null inside a React-rendered inline
  // <script>, then falls back to "last script in the document" — which can be a
  // tag that is not in the DOM yet. Appending to <head> is the same result
  // without either assumption; the window flag stops React's dev double-mount
  // and a client-side revisit from loading the tag twice.
  const loadHilltopMultitag = `(function(){try{if(window.__lamptikHilltopTag)return;window.__lamptikHilltopTag=1;var d=document,s=d.createElement("script");s.settings={};s.src=${JSON.stringify(
    hilltopMultitagSrc,
  )};s.async=true;s.referrerPolicy="no-referrer-when-downgrade";(d.head||d.body||d.documentElement).appendChild(s);}catch(e){}})();`;

  return (
    <>
      {/* Monetag In-Page Push — the account's highest-CPM format. Rendered
          only when the dashboard's tag URL is configured, so the site ships
          nothing it cannot fill. It is a corner card, not a full-viewport
          layer: the Vignette stays banned for the reason in AGENTS.md. */}
      {monetagInPageSrc ? (
        <Script
          id="monetag-inpage-push"
          src={monetagInPageSrc}
          strategy="afterInteractive"
          data-cfasync="false"
        />
      ) : null}
      {/* HilltopAds MultiTag — global in-page push, mounted once per document
          on every route. Same corner-card shape as the Monetag push above; the
          Vignette stays banned for the reason in AGENTS.md. */}
      {hilltopMultitagSrc ? (
        <Script id="hilltopads-multitag" strategy="afterInteractive">
          {loadHilltopMultitag}
        </Script>
      ) : null}
      <Script id="monetag-sw" strategy="afterInteractive">
        {registerWorker}
      </Script>
    </>
  );
}
