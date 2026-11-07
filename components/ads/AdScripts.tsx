"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

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
 * The HilltopAds MultiTag is mounted on **every** viewport (see the loader
 * below). On a 390×844 phone its card is a `position: fixed` node with
 * `z-index: 2147483647` that measured 364×272px at y=520–792 while the
 * Download CTA sat at y=730–784 — it covered the button, which is the banned
 * failure mode. Mobile is ~90% of this site's traffic, so switching the tag
 * off below 768px threw away the whole mobile inventory; instead the
 * `GUARD_MOBILE_CARDS` script below pins any such card to the top of the
 * viewport (`top: 64px`, `bottom: auto`, `max-height: 40vh`) and hides it
 * entirely while a result panel is on screen. The guard keys off
 * `data-ad-guard="result"` — the marker `result-panel.tsx` already renders —
 * so it works on the platform pages and on `/twitter-video-downloader`
 * without either page knowing about the ad.
 *
 * Everything below is measured, not assumed: the acceptance test is a 390px
 * Chromium rect check where the card's box and the Download CTA's box must not
 * intersect (`ctaCoveredByAd: []`).
 *
 * What also remains is the Service Worker registration at the domain root: the
 * Direct Link account's domain verification requires `/sw.js` to exist AND be
 * registered. The worker itself renders nothing. Registration failures are
 * swallowed — a blocked or unsupported case must never surface as a console
 * error on a download page.
 */

/**
 * Mobile geometry guard for fixed-position push cards.
 *
 * The network's card is unclassed and injected at a random time, so this
 * cannot be a stylesheet rule. A MutationObserver catches the insertion, then:
 *
 *  - only nodes whose computed `position` is `fixed` **and** whose `z-index`
 *    is ≥ 1e9 are touched (that ceiling is the push card's signature; nothing
 *    in this app sets it);
 *  - below 768px they are pinned to the top strip and capped at 40vh, so their
 *    box ends far above the Download CTA;
 *  - while `[data-ad-guard="result"]` exists they are hidden outright — that is
 *    the moment the visitor is reaching for Download;
 *  - above 768px every override is removed again, so a rotation or a desktop
 *    resize restores the network's own placement.
 *
 * Written as a string (not JSX) because it has to run before React hydration
 * finishes and must not re-run on a route change.
 */
const GUARD_MOBILE_CARDS = `(function(){try{
if(!window.matchMedia)return;
var mq=window.matchMedia("(max-width: 767px)");
var cards=[];
var pending=0;
function active(){return !!document.querySelector('[data-ad-guard="result"]');}
function place(el,isActive){
  if(!mq.matches){
    el.style.removeProperty("display");
    el.style.removeProperty("top");
    el.style.removeProperty("bottom");
    el.style.removeProperty("left");
    el.style.removeProperty("right");
    el.style.removeProperty("transform");
    el.style.removeProperty("max-height");
    el.removeAttribute("data-lamptik-guard");
    return;
  }
  if(isActive){
    el.style.setProperty("display","none","important");
    el.setAttribute("data-lamptik-guard","hidden");
    return;
  }
  el.style.removeProperty("display");
  el.style.setProperty("top","64px","important");
  el.style.setProperty("bottom","auto","important");
  el.style.setProperty("left","50%","important");
  el.style.setProperty("right","auto","important");
  el.style.setProperty("transform","translateX(-50%)","important");
  el.style.setProperty("max-height","40vh","important");
  el.setAttribute("data-lamptik-guard","clamped");
}
function scan(root){
  if(!root||root.nodeType!==1)return;
  var isActive=active();
  var nodes=[root].concat(Array.prototype.slice.call(root.querySelectorAll("div,iframe,ins,section,aside"),0,120));
  for(var i=0;i<nodes.length;i++){
    var el=nodes[i];
    if(!el||el.nodeType!==1)continue;
    if(el.hasAttribute("data-ad-guard"))continue;
    var cs;
    try{cs=window.getComputedStyle(el);}catch(e){continue;}
    if(cs.position!=="fixed")continue;
    var z=parseInt(cs.zIndex,10);
    if(!(z>=1000000000))continue;
    if(cards.indexOf(el)===-1)cards.push(el);
    place(el,isActive);
  }
}
function refresh(){
  var isActive=active();
  for(var i=cards.length-1;i>=0;i--){
    if(!cards[i].isConnected){cards.splice(i,1);continue;}
    place(cards[i],isActive);
  }
}
function start(){
  var body=document.body;
  if(!body){window.setTimeout(start,250);return;}
  scan(body);
  var mo=new MutationObserver(function(records){
    for(var r=0;r<records.length;r++){
      var added=records[r].addedNodes;
      for(var n=0;n<added.length;n++)scan(added[n]);
    }
    if(pending)return;
    pending=window.setTimeout(function(){pending=0;refresh();},120);
  });
  mo.observe(body,{childList:true,subtree:true});
  if(mq.addEventListener)mq.addEventListener("change",refresh);
}
if(document.readyState==="loading"){window.setTimeout(start,0);}else{start();}
}catch(e){}})();`;

export function AdScripts() {
  /**
   * Nothing below loads until the visitor touches the page (or the page has
   * been idle for a while after load).
   *
   * Why: Clarity measured LCP at 7.4s on phones and the largest element it
   * named was the Monetag in-page push icon — a remote creative arriving
   * through this very block, competing with the hero for the same connection
   * and main thread. `afterInteractive` still meant "during load", so the ad
   * network was joining the LCP race. Ads are now armed by the first real
   * interaction (`pointerdown`, `touchstart`, `wheel`, `keydown` — a tap, a
   * finger drag, a mouse wheel and a keyboard scroll all produce one) or 20s
   * after the load event, whichever comes first.
   *
   * `scroll` is deliberately NOT a trigger: a restored scroll position fires
   * it by itself on every reload, so gating on it armed the network a frame
   * after load — measured, not assumed.
   *
   * The 20s fallback is deliberate, not padding. LCP keeps accepting new
   * candidates until the visitor's first input, so arming the network a couple
   * of seconds after load is exactly how its push icon became the 7.4s LCP
   * element. Twenty seconds is past any plausible measurement window, and a
   * downloader visitor taps something in the first second or two — the ones
   * who only read are the only ones who wait.
   *
   * The guard and the service-worker registration ride along here too: they
   * have nothing to guard or register until the tag exists.
   */
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (armed) return;

    const arm = () => setArmed(true);
    const onLoad = () => {
      const idle = window.requestIdleCallback;
      if (typeof idle === "function") {
        idle(() => window.setTimeout(arm, 20_000), { timeout: 22_000 });
      } else {
        window.setTimeout(arm, 20_000);
      }
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    for (const name of events) {
      window.addEventListener(name, arm, { once: true, passive: true });
    }

    return () => {
      window.removeEventListener("load", onLoad);
      for (const name of events) window.removeEventListener(name, arm);
    };
  }, [armed]);

  if (!armed) return null;

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
      {monetagInPage ? (
        <Script
          id="monetag-inpage-push"
          src={monetagInPage.src}
          strategy="afterInteractive"
          data-cfasync="false"
          data-zone={monetagInPage.zone || undefined}
        />
      ) : null}
      {/* HilltopAds MultiTag — mounted on every viewport, including phones.
          On mobile the guard below keeps its card in the top strip and hides
          it while a result panel is open, so mobile inventory is monetized
          without ever covering the Download CTA. */}
      {hilltopMultitagSrc ? (
        <Script id="hilltopads-multitag" strategy="afterInteractive">
          {loadHilltopMultitag}
        </Script>
      ) : null}
      {/* Mobile geometry guard. Runs in the same document as the tag above and
          is idempotent: it only ever tracks the fixed z-index≥1e9 cards. */}
      <Script id="lamptik-mobile-ad-guard" strategy="afterInteractive">
        {GUARD_MOBILE_CARDS}
      </Script>
      <Script id="monetag-sw" strategy="afterInteractive">
        {registerWorker}
      </Script>
    </>
  );
}
