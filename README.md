# LAMP TIK — watermark-free video downloader, measured

**[lamptik.online](https://www.lamptik.online)** is a production Next.js 15 downloader for
TikTok, Instagram Reels, Facebook and YouTube. Paste a link, get the file the platform
actually serves — no account, no app install, nothing stored on the server, and no
resolution label the file cannot back up.

This repository is the whole website: the resolvers, the streaming proxy, the UI, the
ad layer and the build gates. A thin Expo client in [`mobile-app/`](mobile-app/) talks to
the same API routes; [`extension/`](extension/) is the Manifest V3 browser extension.

## What the files actually are (measured)

YouTube does not publish one universal MP4. Above 720p it stores video and audio
separately, and a downloader that hands you 1080p has merged them — that is a re-encode.
This site returns the single muxed stream YouTube still serves and states its height
instead of renaming it.

| Platform | Delivered container | Measured `tkhd` ceiling | Notes |
| --- | --- | --- | --- |
| YouTube | MP4 · H.264 + AAC (muxed) | **640 × 360** | No merge, no 1080p label; audio via MP3 bridge |
| TikTok | MP4 · H.264 | **576 × 1024** | Watermark-free stream as published |
| Instagram Reels | MP4 | **718 × 1276** | Reels, photo-post videos, IGTV |
| Facebook | MP4 | **720 × 1280 – 1080 × 1920** | HD Watch, page uploads, `fb.watch` |
| X / Twitter | MP4 | **up to 3840 × 2160** | Highest published variant |
| Audio | M4A (AAC) / MP3 | **128–256 kbps** | No fake 320 kbps upscale |

Measured 2026-11-13 from the container headers (`tkhd`), not from a marketing page.
Full method and per-format caveats:
[measured video files vs 1080p labels](https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels).

## Downloaders

| Platform | Page |
| --- | --- |
| TikTok (no watermark, MP3) | https://www.lamptik.online/tiktok-video-downloader |
| X / Twitter (MP4, up to 4K) | https://www.lamptik.online/twitter-video-downloader |
| Facebook (HD, `fb.watch`) | https://www.lamptik.online/facebook-video-downloader |
| Instagram Reels | https://www.lamptik.online/instagram-reels-downloader |
| YouTube (MP4 + MP3) | https://www.lamptik.online/youtube-downloader |

Localized landing pages are written per market, not machine-translated, and each one
declares the others as translations of the same topic:

- Deutsch — https://www.lamptik.online/de
- Français — https://www.lamptik.online/fr
- Español — https://www.lamptik.online/es
- Português — https://www.lamptik.online/pt · Facebook: https://www.lamptik.online/pt/facebook-video-downloader

## Apps and one-click tools

- **Chrome extension (Manifest V3)** — https://www.lamptik.online/apps ·
  download [`lamptik-chrome-extension.zip`](https://www.lamptik.online/lamptik-chrome-extension.zip)
  and load it from `chrome://extensions` → Developer mode → Load unpacked.
  It injects a "⚡ Download MP4 (LAMP TIK)" button on YouTube/Shorts, TikTok,
  Instagram Reels, X and Facebook video pages, and its popup can send the current tab
  straight to the matching downloader.
- **Bookmarklet** — on [/apps](https://www.lamptik.online/apps), drag the
  "⚡ Download with LAMP TIK" link to the bookmarks bar: it opens the downloader with
  the current page URL, no install required.
- **Android APK** — sideload build from the `latest-apk` release, linked on `/apps`.

## How a resolve works

1. `POST /api/fetch` validates and normalises the link, then routes by platform.
2. Short links (`vm.tiktok.com`, `fb.watch`, `youtu.be`) are expanded server-side, so an
   expired redirect never reaches the browser.
3. Each platform has a waterfall: native API first, then a bridge (`yt-dlp` on a small
   host) and, for YouTube, Innertube clients in an explicit order
   (iOS → TVHTML5 → Android VR → visionOS → embedded) plus Piped/Invidious mirrors.
4. The browser downloads through `/api/download`, which forwards `Range` requests to the
   CDN and forces `Content-Disposition: attachment` — the file lands in the browser's own
   download manager, never in IndexedDB or a Blob.
5. Errors carry a stable code (`PROVIDER_UNAVAILABLE`, `LINK_UNSUPPORTED`, …) and the UI
   offers a source link instead of a dead end.

## Ads, stated plainly

One network: Monetag. Visual partner cards sit under the tool, between content sections,
in the result panel and in a dismissible bottom bar; each is labelled *Sponsored · Ad*
and opens a Smartlink in a new tab. The MultiTag zone (`quge5.com`, zone `312113`) loads
after hydration; its Web Push worker (zone `12293328`) is served from `/sw.js`.

The Smartlink rotation starts with the high-CPM primary (zone `12078941`), then the two
secondary zones. The trigger on a download click is capped in `localStorage` at one open
per 90 seconds and ten per day. A click on a labelled partner button is never capped.
The input, Paste and Fetch controls are never covered by this site's own UI.

## Build and gates

```bash
npm install
npm run dev                 # local dev
npm run verify              # typecheck + lint + links + claims + build
npm run check:ads           # box-model audit: slot size, overlays, tap-through
npm run check:metadata -- --local=http://127.0.0.1:3100
npm run extension:build     # extension/ → public/*.zip (deterministic)
npm run indexnow            # submit changed sitemap URLs to IndexNow
```

Four rules are enforced, not aspirational: a green `verify`, SSRF-guarded upstream hops,
the 12px type floor / three button variants, and ads that never cover the download CTA.
See [`AGENTS.md`](AGENTS.md) and [`.claude/rules/`](.claude/rules/).

## Stack

Next.js 15.5 (App Router, React 19, TypeScript strict), Tailwind 3.4, Node runtime for
the resolvers, Edge for the streaming proxy. No database: nothing about a download is
stored. Client-side frequency caps live in `localStorage`.

## License and responsible use

The code is published for reference and self-hosting. Download only content you have the
right to use; the site is not affiliated with TikTok, ByteDance, Instagram, Facebook, X or
YouTube. DMCA and contact: support@lamptik.online.
