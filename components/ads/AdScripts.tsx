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
   * Server-rendered bootstrap — deliberately NOT a React effect.
   *
   * Measured on a cold production visit: the client bundle took 10–14s to
   * hydrate, so the old `useEffect` that armed the networks ran at
   * `DOMContentLoaded + 10.6s` even though the timer was 2.5s. The networks
   * lost the impression while React was still downloading. This script is in
   * the server HTML, so it exists before any JS chunk is parsed: nothing about
   * it depends on hydration.
   *
   * Arming: first `pointerdown` / `touchstart` / `wheel` / `keydown`, or
   * `DOMContentLoaded` + `requestIdleCallback` with a hard 2000ms timeout.
   * `load` is not used — it waits for every image (22s measured), which is the
   * same lost impression the 20s gate used to cause.
   */
  const config = JSON.stringify({
    monetag: monetagInPage ? { src: monetagInPage.src, zone: monetagInPage.zone || "" } : null,
    hilltop: hilltopMultitagSrc || "",
  });

  const bootstrap = `(function(){try{
var cfg=${config};
if(window.__lamptikAdsBooted)return;
window.__lamptikAdsBooted=1;
function guard(){${GUARD_MOBILE_CARDS}}
function inject(src,attrs){var d=document,s=d.createElement("script");s.async=true;s.src=src;if(attrs){for(var k in attrs){if(attrs[k]){s.setAttribute(k,attrs[k]);}}}s.referrerPolicy="no-referrer-when-downgrade";(d.head||d.body||d.documentElement).appendChild(s);}
function arm(){
  if(window.__lamptikAdsArmed)return;
  window.__lamptikAdsArmed=1;
  try{guard();}catch(e){}
  if(cfg.monetag){try{inject(cfg.monetag.src,{"data-zone":cfg.monetag.zone,"data-cfasync":"false"});}catch(e){}}
  if(cfg.hilltop&&!window.__lamptikHilltopTag){window.__lamptikHilltopTag=1;try{inject(cfg.hilltop);}catch(e){}}
  try{if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){});}}catch(e){}
}
function soon(){
  var idle=window.requestIdleCallback;
  if(typeof idle==="function"){idle(arm,{timeout:2000});}
  window.setTimeout(arm,2000);
}
var ev=["pointerdown","touchstart","wheel","keydown"];
for(var i=0;i<ev.length;i++){window.addEventListener(ev[i],arm,{once:true,passive:true});}
if(document.readyState!=="loading"){soon();}else{document.addEventListener("DOMContentLoaded",soon,{once:true});}
}catch(e){}})();`;

  return <script id="lamptik-ads-bootstrap" dangerouslySetInnerHTML={{ __html: bootstrap }} />;
}

