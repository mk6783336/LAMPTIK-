---
name: monetization-integrity
description: Ad placement, click-handler timing, download flow and CDN referrer invariants.
globs: ["components/ads/**", "components/result-panel.tsx", "app/api/download/**", "lib/monetization.ts"]
alwaysApply: true
---

# monetization-integrity

Adapted from ECC's monetization rules. This site pays for itself with Adsterra
banners, the Monetag Vignette and the Monetag SmartLink. Every one of these
invariants was learned from a production failure — a blocked button, a lost
impression or a download that died.

## 1. The ad never blocks the tool

- The Download CTA is always reachable with a plain tap. No full-screen layer,
  no `backdrop-blur` bar, no fixed footer, no modal may sit over the tool.
- Full-screen vendor overlays are already handled by `VignetteGuard`
  (`components/ads/VignetteGuard.tsx`): it collapses fixed, near-max-z-index,
  viewport-covering layers **after a 6s impression window**. Do not add a
  competing watchdog, and do not remove this one to "clean up" the page.
- Our own UI layers carry `data-lamptik-ui` so the guard skips them. New
  overlays (dialogs, modals) must set it.
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
- It is fire-and-forget and session-capped (`ad_download_direct_ts`, 2 min).
  Never `await` it, never delay the file for it, never gate the download behind
  a sponsor click or a countdown completion.
- The 10-second gate is a **theater**: the countdown is UI. At `0` the resolved
  URL goes to the browser's download manager (hidden `<a download>`), and the
  card immediately offers "Download Another Video". Do not reintroduce
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
- The Android app mirrors this: `ApiClient.BROWSER_UA` + `refererFor(url)` in
  `DownloaderScreen.enqueue`. Keep them in sync with the server.

## 5. Keys, caps, and measurement

- Zone ids/scripts come from `lib/monetization.ts` env values; no new hardcoded
  vendor ids in components.
- `data-cfasync="false"` on network scripts stays.
- Don't change cap windows (`DOWNLOAD_DIRECT_CAP_MS`, `DIRECT_LINK_CAP_MS`) or
  the ad script load strategy without a measurement showing the trade — the
  current numbers exist to stop tab spam and to keep LCP clean.
