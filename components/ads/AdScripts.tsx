"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import { hilltopMultitagSrc, monetagInPage } from "@/lib/monetization";

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
 * The HilltopAds MultiTag (`hilltopMultitagSrc`) is mounted here, but only at
 * ≥768px. Measured on a 390×844 phone its push card is a `position: fixed`
 * node with `z-index: 2147483647` occupying 364×272px at y=520–792 — while the
 * Download CTA sits at y=730–784. It covers the button. That is the same
 * failure mode as the Vignette, so the tag is not injected below 768px at all:
 * the mobile Download CTA outranks a corner card. If Hilltop ships a genuinely
 * compact, corner-anchored unit, inch that breakpoint down with a measurement
 * of the card's rect against `[data-ad-guard="result"]`, not by hope.
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

  // Push cards are mounted wide-screen only — see the rect measurement in the
  // header. Resolved after mount so the server render never guesses a viewport.
  const [pushAllowed, setPushAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setPushAllowed(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <>
      {/* Monetag In-Page Push — the account's highest-CPM format. Rendered
          only when the dashboard's tag URL is configured, so the site ships
          nothing it cannot fill. It is a corner card, not a full-viewport
          layer: the Vignette stays banned for the reason in AGENTS.md. */}
      {monetagInPage ? (
        <Script
          id="monetag-inpage-push"
          src={monetagInPage.src}
          strategy="afterInteractive"
          data-cfasync="false"
          data-zone={monetagInPage.zone || undefined}
        />
      ) : null}
      {/* HilltopAds MultiTag — global in-page push on tablet/desktop. Its card
          is fixed-positioned and full-size on a phone, so it is not injected
          under 768px where it would sit on the Download CTA. */}
      {pushAllowed && hilltopMultitagSrc ? (
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
