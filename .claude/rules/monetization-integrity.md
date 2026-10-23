---
name: monetization-integrity
description: Ad placement, click-handler timing, download flow and CDN referrer invariants.
globs: ["components/ads/**", "components/result-panel.tsx", "app/api/download/**", "lib/monetization.ts"]
alwaysApply: true
---

# monetization-integrity

Adapted from ECC's monetization rules. This site pays for itself with Adsterra
banners and the Monetag SmartLink (Direct Link). Every one of these invariants
was learned from a production failure — a blocked button, a lost impression,
a download that died or a page that froze on a phone.

## 1. The ad never blocks the tool

- The Download CTA is always reachable with a plain tap. No full-screen layer,
  no `backdrop-blur` bar, no fixed footer, no modal may sit over the tool.
- **The Monetag Vignette script and the Adsterra Social Bar are banned.** Both
  inject invisible `position: fixed; inset: 0; z-index: 2147483647` layers whose
  tap-through depends on a remote creative rendering; when it hangs, the layer
  swallows every tap and scroll on mobile (the "site frozen" production
  failure). Do not re-add them to `AdScripts.tsx` or `lib/monetization.ts`, and
  do not add any other script that paints a viewport-covering layer.
- The only sanctioned monetization surfaces are: in-flow `AdSlot` banners (the
  SnapTik ad-sandwich: one slot between the URL input and the result zone, one
  dedicated 300×250 under the download buttons, and the parallel theater's
  center-stage unit), the click-triggered Direct Link
  (`triggerDownloadDirectLink`), and the inline parallel 10-second download
  theater in `result-panel.tsx` (UI only — the file download itself fires at
  t = 0 s and is never gated, awaited or delayed by any of it).
- `data-ad-guard="tool"` / `data-ad-guard="result"` mark the protected regions;
  keep them on the downloader and result panel.

## 2. Ads live in the document flow

- One `AdSlot` per section, inside `role="complementary"` with a single
  `Sponsored` disclosure. Never two unspaced slots in the same container, never
  a duplicate "Sponsored" pill.
- Reserve space, don't shift it: the slot keeps `height` from `AD_RESERVED` /
  the filled creative and shrinks to one compact sponsor line on fallback
  (`max-h-[72px]`), never a giant empty black card.
- Never render an ad above the tool card on mobile; the pre-FAQ leaderboard and
  the below-tool unit are the sanctioned positions. `StickyBottomAd` is
  intentionally deleted — do not reintroduce a fixed bottom bar.
- Rendering is env-gated: no zone key → `AdSlot` returns `null` and reserves
  nothing. Keep that behaviour.

## 3. The click handler stays synchronous

- `triggerDownloadDirectLink()` (in `lib/monetization.ts`) must be called at the
  top of the download click handler, **before any `await`** — popup blockers
  only honour `window.open` while the user activation is alive
  (`components/result-panel.tsx`, `startDownload`).
- It is fire-and-forget and session-capped (`lamptik_dl_direct_ts`, 30 s).
  Never `await` it, never delay the file for it, never gate the download behind
  a sponsor click or a countdown completion.
- The parallel 10-second theater is **UI only and never a gate**: at click
  time the resolved URL already went to the browser's download manager (the
  `<a download>` default navigation) and the Direct Link already fired. The
  theater merely fills the panel while the bytes move; at `0` it flips to
  "✅ Download Started in Your Browser!" and offers "Download Another Video"
  plus Server 01 / Server 02 / MP3 re-click links. Do not reintroduce
  `fetch()`/Blob/IndexedDB buffering of media bytes in the page.
- A real user gesture must exist for the initial click; do not auto-start
  downloads on mount.

## 4. Server-side CDN referrers and headers

`app/api/download/route.ts` is the reason most downloads work at all:

- `PLATFORM_PROFILES` supplies the platform `Referer`; `profileFor()` overrides
  it to `https://loader.to/` for `loader.to` / `savenow.to` / `oceansaver.in`
  hosts and to `https://www.tikwm.com/` for TikWM. Never drop these.
- Keep `Accept: */*`, `Accept-Encoding: identity` and the desktop User-Agent —
  several CDNs return gzip error pages without them.
- On `401/403/404/429` or a network failure, hand off with
  `NextResponse.redirect(target, 302)` so the visitor's own IP fetches the file.
  Do not turn a CDN block into a JSON error.
- `Content-Disposition: attachment` only after validation; `nosniff` always.
- Any failure answering a browser navigation (`401/403/429`/5xx, snuffed error
  payload, missing URL) must end in a **302 redirect** (`handOffToCdn` or
  `redirectToPage`), never a JSON body — mobile Chrome saves an error response
  to a navigation download as `download.json`.

## 5. Keys, caps, and measurement

- Zone ids/scripts come from `lib/monetization.ts` env values; no new hardcoded
  vendor ids in components.
- `data-cfasync="false"` on network scripts stays.
- `refreshKey`-driven banner refreshes are throttled to one reload per slot
  per 20 s AND one reload page-wide per 20 s (`AdSlot`) — rapid same-size
  re-requests would count as invalid traffic. Do not lower those windows.
- Don't change cap windows (`DIRECT_LINK_CAP_MS` 30 s, refresh 20 s) or the
  ad script load strategy without a measurement showing the trade — the
  current numbers exist to stop tab spam and invalid traffic while keeping
  repeat downloads monetizable and LCP clean.
