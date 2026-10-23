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
  dedicated 300×250 under the download buttons, the Stage-A unit inside the
  resolve/loading console, and the countdown theater's center-stage unit), the
  click-triggered Direct Link (`triggerDownloadDirectLink`), and the inline
  10-second download theater in `result-panel.tsx`.
- Ads are visible DURING the two natural waits — CDN resolving (`LoadingConsole`,
  `downloader.tsx`) and the 10-second countdown (`result-panel.tsx`) — but the
  file hand-off is never gated, awaited or delayed by any of them.
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
  Never `await` it.
- **The unified click flow (all 4 platforms, identical) — download FIRST,
  theater SECOND:**
  1. *t = 0ms:* `triggerDownloadDirectLink()` fires synchronously, and IN THE
     SAME GESTURE a hidden **same-origin `<iframe src="/api/download?…">`**
     starts the attachment stream — Chrome's native download manager begins at
     ~0s. This is the only sanctioned file hand-off. The hand-off happens at
     0ms, never behind a countdown: a post-10s hand-off died to Chrome twice
     (transient user activation expiry + cross-origin CDN iframe refusal).
     Chromium ignores the `download` attribute on cross-origin anchors, a
     `target="_blank"` CDN URL inline-plays Instagram/Meta CDN video instead of
     downloading, and a `window.open` sponsor tab in the same tick cancels an
     anchor navigation — the hidden same-origin iframe avoids all three, keeps
     the page put, and starts Chrome's native download manager 100% of the time
     when fired inside the gesture. Do NOT reintroduce cross-origin
     `<a download>`, `window.location`/`_self` navigation, delayed
     `setTimeout` hand-offs, or in-page `fetch()`/Blob/IndexedDB buffering.
     The iframe must stay mounted ≥300 s (removing it aborts a still-streaming
     transfer).
  2. *t = 0ms → 10s:* the panel becomes the 10-second POST-download sponsor
     theater over a freshly keyed `alwaysReserve` 300×250 banner — ads run
     while bytes already move in the tray. A ~6s same-origin HEAD probe flips
     dead/expired streams to the failure card (Retry / Try Server 02 /
     re-resolve) with the raw-CDN fallback link (`theater.fallbackUrl`), so a
     silent bodyless 502 never impersonates a successful download.
  3. The theater headline reads "✅ Download Started in Your Browser!" from
     the first second, with "Download Another Video" and Server 01 / Server 02 /
     MP3 re-click links appearing near/after 0s (each re-runs the same flow).
- A real user gesture must exist for the initial click; do not auto-start
  downloads on mount.

## 4. Server-side CDN referrers and headers

`app/api/download/route.ts` is the reason most downloads work at all:

- `PLATFORM_PROFILES` supplies the platform `Referer`; `profileFor()` overrides
  it to `https://loader.to/` for `loader.to` / `savenow.to` / `oceansaver.in`
  hosts and to `https://www.tikwm.com/` for TikWM. Never drop these.
- Keep `Accept: */*`, `Accept-Encoding: identity` and the desktop User-Agent —
  several CDNs return gzip error pages without them.
- **Failure contract — never a savable junk file.** A download navigation must
  NEVER receive HTML or JSON, and never a 302 to an HTML page — Chrome saves
  any 2xx navigation body as the file, and the old 302-to-`/?dl=…` fallback got
  saved as `download.html`. Every failure is therefore:
  1. TikTok (video or audio): one self-heal INSIDE the route — re-resolve a
     fresh stream via TikWM using the id already tagged on the link, retry once
     (`freshTikTokStreams` + `recoverFromFailure`).
  2. Anything else: `verifiedBinaryHandoff` — probe the CDN hop with a ranged
     fetch and 302 the visitor's browser to it ONLY if the final hop serves a
     real media content type (a dead Loader.to job answers `text/html` to every
     IP — redirecting there used to save that page as `download.html`).
  3. Otherwise a **bodyless 502** (`failDownload`): a failed download, nothing
     saved. Accept BOTH `u` and `url` query params (`parseRequest`) so a param
     mismatch can never invalidate a real download link.
- Direct hand-off above `DOWNLOAD_DIRECT_HANDOFF_MB` (default 200) also passes
  through `verifiedBinaryHandoff` — never a blind 302.
- The result panel's Server 01 / Server 02 / MP3 links are all same-origin
  `/api/download` URLs (direct CDN upstreams ride along via the `u` param), so
  the proxy referers/validation always apply and the click handler has exactly
  one attachment transport.
- `Content-Disposition: attachment` only after validation; `nosniff` always.

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
