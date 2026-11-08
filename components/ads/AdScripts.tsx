import { hilltopMultitagSrc, monetagInPage } from "@/lib/monetization";

/**
 * Global third-party ad surface — in-flow banners on load, push cards only
 * after download intent.
 *
 * What is monetized, and when:
 *
 * 1. In-flow banner slots (`AdSlot.tsx`) — rendered on first paint inside
 *    `position: relative; overflow: hidden` boxes with a reserved
 *    aspect-ratio, so a late creative cannot move the page (CLS 0).
 * 2. The HilltopAds Direct Link (`idealistic-revenue.com/FtK1df`) as the href
 *    of a visible sponsored card — the side rail, the banner fallback and the
 *    result panel. Only where the visitor sees what they are clicking.
 * 3. The inline 10-second countdown in `result-panel.tsx` and the
 *    submit-time VAST gate in `VideoAdGate.tsx` — visible, timed cards.
 * 4. The Monetag In-Page Push and the HilltopAds MultiTag: **off**, and
 *    post-intent when enabled. Both are gated by `pushAdsEnabled` in
 *    `lib/monetization.ts`, which requires an explicit
 *    `NEXT_PUBLIC_PUSH_ADS_ENABLED=1`. See below.
 *
 * The Monetag Vignette (`vignette.min.js`) and the Adsterra Social Bar stay
 * banned: both inject `position: fixed; inset: 0; z-index: 2147483647` layers
 * whose tap-through depends on a remote creative rendering correctly. When it
 * hangs, the invisible iframe swallows every tap and scroll — the "site frozen
 * on mobile" production failure.
 *
 * POST-INTENT (2026-11-08). Both push tags used to arm themselves on load, at
 * the first pointer event, or at DOMContentLoaded + idle, whichever came
 * first. Cold, 390×844, that put a `position: fixed` creative over the page
 * before the visitor had done anything, and the creative it served was a fake
 * operating-system notification ("Jennifer sent you (1) video", "MEMETIC
 * HAZARD DETECTED") — social engineering, which Google Safe Browsing /
 * Chrome's deceptive-site classifier treats as a policy violation, and which
 * is the most plausible cause of an 86% smartphone bounce rate. Both networks
 * now load only after a real download intent:
 *
 *   - `document` event `lamptik:intent` — dispatched by `ResultPanel` at the
 *     instant the file hand-off happens (after the iframe navigates or the
 *     anchor clicks, so it can never delay a download);
 *   - a capturing `click` on `a[download]` or `a[href*="/api/download"]` —
 *     the plain anchors the creator tools use, so those pages are covered
 *     without importing anything.
 *
 * A visitor who bounces without downloading therefore never meets a push
 * creative, and the visitor who got their file is exactly the one worth
 * monetizing. Banners are unchanged: they are clean, in-flow, and reserved.
 *
 * The Service Worker registration stays on load: the Direct Link account's
 * domain verification requires `/sw.js` to exist AND be registered, and the
 * worker itself renders nothing and intercepts nothing (see `public/sw.js`).
 */

/**
 * Deception + geometry guard for third-party fixed layers.
 *
 * Two jobs, both measured at runtime rather than assumed:
 *
 *  - DECEPTION: any fixed node at z-index ≥ 1e9 whose own text (or `title` /
 *    `aria-label`) matches the scareware pattern is hidden outright. The
 *    pattern covers the creatives actually observed in production — fake
 *    virus/hazard warnings and fake "N people sent you" chat notifications.
 *  - GEOMETRY: on ≤767px a surviving card is pinned to the top strip
 *    (`top: 64px`, `max-height: 40vh`) so its box ends far from the thumb's
 *    resting place, and a card whose box intersects any control inside
 *    `[data-ad-guard="result"]` is hidden until it stops intersecting,
 *    re-checked on scroll, resize, media-query change and DOM mutation.
 *
 * The intersection test replaces the earlier page-state rule, which hid the
 * card whenever a result panel existed. With post-intent arming that would
 * have made mobile push inventory unreachable — the card only ever loads when
 * a result panel is on screen. Testing the actual boxes keeps the real
 * invariant (never cover the tool) instead of approximating it.
 *
 * Honest limit: a creative painted *inside* a cross-origin iframe is opaque to
 * `textContent`, so the text scan only sees nodes the network injects into our
 * own document. No page script can read a frame's pixels. Intent gating is
 * what removes the landing-page deception; this guard is the second line, not
 * a complete one.
 *
 * Written as a string (not JSX) because it has to run before React hydration
 * finishes and must not re-run on a route change.
 */
const GUARD_CARDS = `(function(){try{
var mq=window.matchMedia?window.matchMedia("(max-width: 767px)"):null;
var DECEPTIVE=/(?:hazard|virus|infected|malware|spyware|security alert|security warning|system warning|system alert|antivirus|protect your data|your data is not safe|anime girls|congratulations[^.]{0,40}(?:won|prize|gift)|claim your (?:prize|reward|gift)|sent you \\(\\d+\\)|you have \\(\\d+\\) new|verify you are human|unusual activity|suspicious activity|iphone[^.]{0,12}winner)/i;
var cards=[];
var pending=0;
function hide(el,reason){
  try{el.style.setProperty("display","none","important");}catch(e){}
  try{el.setAttribute("data-lamptik-guard",reason);}catch(e){}
}
function reset(el){
  var p=["display","top","bottom","left","right","transform","max-height"];
  for(var i=0;i<p.length;i++){try{el.style.removeProperty(p[i]);}catch(e){}}
  try{el.removeAttribute("data-lamptik-guard");}catch(e){}
}
function deceptive(el){
  var t="";
  try{
    t=(el.getAttribute("aria-label")||"")+" "+(el.getAttribute("title")||"")+" "+(el.textContent||"");
  }catch(e){return false;}
  if(!t)return false;
  if(t.length>4000)t=t.slice(0,4000);
  return DECEPTIVE.test(t);
}
function controls(){
  try{return document.querySelectorAll('[data-ad-guard="result"] button, [data-ad-guard="result"] a');}catch(e){return [];}
}
function coversTool(el){
  var r;
  try{r=el.getBoundingClientRect();}catch(e){return false;}
  if(!r||r.width<2||r.height<2)return false;
  var nodes=controls();
  for(var i=0;i<nodes.length;i++){
    var b;
    try{b=nodes[i].getBoundingClientRect();}catch(e){continue;}
    if(!b||b.width<2||b.height<2)continue;
    if(r.left<b.right+8&&r.right>b.left-8&&r.top<b.bottom+8&&r.bottom>b.top-8)return true;
  }
  return false;
}
function place(el){
  if(deceptive(el)){hide(el,"deceptive");return;}
  if(!mq||!mq.matches){reset(el);return;}
  try{
    el.style.removeProperty("display");
    el.style.setProperty("top","64px","important");
    el.style.setProperty("bottom","auto","important");
    el.style.setProperty("left","50%","important");
    el.style.setProperty("right","auto","important");
    el.style.setProperty("transform","translateX(-50%)","important");
    el.style.setProperty("max-height","40vh","important");
  }catch(e){}
  if(coversTool(el)){hide(el,"covered");return;}
  try{el.setAttribute("data-lamptik-guard","clamped");}catch(e){}
}
function scan(root){
  if(!root||root.nodeType!==1)return;
  var nodes=[root];
  var kids=root.querySelectorAll?root.querySelectorAll("div,iframe,ins,section,aside"):[];
  for(var k=0;k<kids.length&&k<120;k++)nodes.push(kids[k]);
  for(var i=0;i<nodes.length;i++){
    var el=nodes[i];
    if(!el||el.nodeType!==1)continue;
    if(cards.indexOf(el)!==-1)continue;
    var cs;
    try{cs=window.getComputedStyle(el);}catch(e){continue;}
    if(!cs||cs.position!=="fixed")continue;
    var z=parseInt(cs.zIndex,10);
    if(!(z>=1000000000))continue;
    cards.push(el);
    place(el);
  }
}
function refresh(){
  for(var i=cards.length-1;i>=0;i--){
    if(!cards[i].isConnected){cards.splice(i,1);continue;}
    place(cards[i]);
  }
}
function start(){
  if(!document.body){window.setTimeout(start,250);return;}
  scan(document.body);
  var mo=new MutationObserver(function(records){
    for(var r=0;r<records.length;r++){
      var added=records[r].addedNodes;
      for(var n=0;n<added.length;n++){if(added[n]&&added[n].nodeType===1)scan(added[n]);}
    }
    if(pending)return;
    pending=window.setTimeout(function(){pending=0;refresh();},120);
  });
  mo.observe(document.body,{childList:true,subtree:true});
  var raf=0;
  function onMove(){
    if(raf)return;
    var schedule=window.requestAnimationFrame||function(f){return window.setTimeout(f,80);};
    raf=schedule(function(){raf=0;refresh();});
  }
  window.addEventListener("scroll",onMove,{passive:true});
  window.addEventListener("resize",onMove,{passive:true});
  if(mq&&mq.addEventListener)mq.addEventListener("change",onMove);
}
if(document.readyState==="loading"){window.setTimeout(start,0);}else{start();}
}catch(e){}})();`;

export function AdScripts() {
  /**
   * Server-rendered bootstrap — deliberately NOT a React effect.
   *
   * Measured on a cold production visit: the client bundle took 10–14s to
   * hydrate, so a `useEffect` equivalent would arm at
   * `DOMContentLoaded + 10.6s` at best. This script is in the server HTML, so
   * it exists before any JS chunk is parsed and nothing about it depends on
   * hydration. It arms nothing on load any more: it only installs the intent
   * listener, the guard and the service-worker registration.
   */
  const config = JSON.stringify({
    monetag: monetagInPage ? { src: monetagInPage.src, zone: monetagInPage.zone || "" } : null,
    hilltop: hilltopMultitagSrc || "",
  });

  const bootstrap = `(function(){try{
var cfg=${config};
if(window.__lamptikAdsBooted)return;
window.__lamptikAdsBooted=1;
function guard(){${GUARD_CARDS}}
function inject(src,attrs){var d=document,s=d.createElement("script");s.async=true;s.src=src;if(attrs){for(var k in attrs){if(attrs[k]){s.setAttribute(k,attrs[k]);}}}s.referrerPolicy="no-referrer-when-downgrade";(d.head||d.body||d.documentElement).appendChild(s);}
function arm(){
  if(window.__lamptikAdsArmed)return;
  window.__lamptikAdsArmed=1;
  if(cfg.monetag){try{inject(cfg.monetag.src,{"data-zone":cfg.monetag.zone,"data-cfasync":"false"});}catch(e){}}
  if(cfg.hilltop&&!window.__lamptikHilltopTag){window.__lamptikHilltopTag=1;try{inject(cfg.hilltop);}catch(e){}}
}
window.__lamptikArmAds=arm;
function intent(){try{arm();}catch(e){}}
document.addEventListener("lamptik:intent",intent,{once:true});
document.addEventListener("click",function(e){
  var t=e.target;
  if(!t||!t.closest)return;
  var hit=null;
  try{hit=t.closest('a[download],a[href*="/api/download"]');}catch(err){}
  if(hit)intent();
},true);
try{guard();}catch(e){}
try{if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){});}}catch(e){}
}catch(e){}})();`;

  return <script id="lamptik-ads-bootstrap" dangerouslySetInnerHTML={{ __html: bootstrap }} />;
}
