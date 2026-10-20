# LAMP TIK

A production-ready, watermark-free TikTok video downloader. Paste a link, resolve the original MP4 stream, and save HD video or MP3 audio straight to your device.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Framer Motion · Lucide
**Vibe:** cyberpunk minimalism — deep `#0A0A0B`, neon cyan `#00F2FE` / magenta `#FE0979`, frosted glass.

---

## Features

- **No watermark** — fetches the TikTok CDN's clean `hdplay` / `play` stream, never re-encodes or overlays.
- **HD + MP3** — separate video and audio download actions; audio comes from TikTok's `audio/mpeg` track.
- **Direct file save** — downloads are streamed through `/api/download` with `Content-Disposition: attachment`, so browsers save the file instead of opening a tab.
- **Short links** — resolves `vt.tiktok.com` / `vm.tiktok.com` redirects server-side before extraction.
- **Clipboard paste** — one-tap paste button with permission-aware fallback.
- **Real states** — live validation, neon scanline loading skeleton, expanding result card, and accessible toast errors.
- **Dark / light mode** — dark by default, persisted in `localStorage`, zero flash on load.
- **Hardened by default** — strict URL validation, media-host allowlist, range pass-through, in-memory rate limiting, no server-side storage.
- **SEO ready** — metadata, JSON-LD (`WebApplication` + `FAQPage`), robots.txt, sitemap, dynamic favicon.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional; defaults to http://localhost:3000
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

Requires **Node.js 20.9+**.

### Environment

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended in prod | Public origin with no trailing slash. Used for canonical URLs, sitemap, robots and social metadata. |

No API keys are needed. TikTok extraction uses public endpoints.

---

## Architecture

```
app/
├── api/
│   ├── fetch/route.ts       POST /api/fetch     — validate + extract metadata, return download links
│   ├── download/route.ts    GET  /api/download  — allowlisted CDN stream → attachment download
│   └── health/route.ts      GET  /api/health    — liveness probe
├── globals.css              design tokens, glass, gradient border, skeleton, scanline
├── layout.tsx               fonts, theme boot script, metadata
├── page.tsx                 hero, downloader, trust strip, explainer, FAQ
├── icon.svg                 neon bolt favicon
├── robots.ts / sitemap.ts   SEO routes
components/
├── downloader.tsx           client state machine (idle → loading → success / error)
├── result-panel.tsx         thumbnail, caption, author, stats, download actions
├── toast.tsx                animated accessible notifications
├── site-header.tsx          sticky nav + theme toggle
├── how-it-works.tsx, faq.tsx, site-footer.tsx, ambient-background.tsx, logo.tsx
lib/
├── tiktok/
│   ├── parse.ts             URL validation, short-link detection, video ID / username extraction
│   ├── resolve.ts           vt/vm redirect resolution
│   ├── index.ts             provider orchestration, TTL cache, in-flight dedupe, error classification
│   ├── providers/tikwm.ts   primary extractor (HD clean MP4 + MP3)
│   ├── providers/page.ts    fallback: __UNIVERSAL_DATA_FOR_REHYDRATION__ page parse
│   ├── providers/oembed.ts  official oEmbed probe (exists vs. blocked)
│   ├── allowlist.ts         media host allowlist + safe filename / Content-Disposition
│   └── links.ts             builds same-origin proxy links
├── cache.ts, rate-limit.ts, errors.ts, http.ts, format.ts, request.ts, site.ts
```

### Extraction pipeline

1. **Validate & normalize** (`parse.ts`) — accepts `tiktok.com`, `m.tiktok.com`, `vt.tiktok.com`, `vm.tiktok.com`, and `/t/` short paths. Rejects profiles, feeds, and non-TikTok hosts. Photo posts are rejected with a friendly error.
2. **Resolve short links** (`resolve.ts`) — follows redirects with a mobile UA and re-parses the canonical URL.
3. **Check cache** — 10-minute in-memory TTL, plus in-flight de-duplication for bursts on the same video.
4. **Primary extractor** (`providers/tikwm.ts`) — calls the public TikWM resolver with `hd=1`, prefers `hdplay`, falls back to `play`, and takes audio from `music`.
5. **Fallback extractor** (`providers/page.ts`) — parses TikTok's embedded `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON (`webapp.video-detail → itemInfo → itemStruct`).
6. **Classify failures** (`providers/oembed.ts`) — if both extractors fail, the official oEmbed endpoint distinguishes "video exists but CDN is blocking" (503) from "video is gone/private" (404).
7. **Attach download links** — the client never talks to the CDN directly; both buttons point at `/api/download`.

TikTok's signed CDN URLs expire. Metadata is cached for only 10 minutes, and the UI asks users to fetch again if a stream 502s.

### API

**`POST /api/fetch`**

```bash
curl -s -X POST http://localhost:3000/api/fetch \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.tiktok.com/@scout2015/video/6718335390845095173"}'
```

```json
{
  "ok": true,
  "cached": false,
  "video": {
    "id": "6718335390845095173",
    "title": "Scramble up ur name & I'll try to guess it…",
    "duration": 10,
    "thumbnail": "https://…",
    "author": { "username": "scout2015", "nickname": "Scout, Suki & Stella", "avatar": "https://…" },
    "stats": { "plays": 159576, "likes": 35187, "comments": 5714, "shares": 1516 },
    "quality": "hd",
    "noWatermark": true,
    "source": "tikwm",
    "byteSize": 2004627,
    "downloads": {
      "video": "/api/download?kind=video&u=…&id=…&author=scout2015",
      "audio": "/api/download?kind=audio&u=…&id=…&author=scout2015"
    }
  }
}
```

Failures return `{ "ok": false, "error": { "code", "message", "hint"? } }` with `400` (invalid), `403` (private), `404` (missing), `422` (photo post), `429` (rate limited), `502` (CDN error), or `503` (resolver unavailable).

**`GET /api/download?kind=video|audio&u=<cdn-url>&id=…&author=…`**

Streams the CDN response (passing through `Range`, `Content-Length`, `Content-Range`) with:

```
Content-Disposition: attachment; filename="lamptik-scout2015-6718335390845095173.mp4"
```

Only hosts under `tiktokcdn*.com`, `tiktokv.com`, `tikwm.com`, `byteoversea.com`, and `ibytedtos.com` are accepted, and the final URL is re-checked after redirects.

**Rate limits (best-effort, per instance):** 20 metadata requests/min and 60 downloads/min per IP.

---

## Deployment notes

- Deploy on any Node 20.9+ host (Vercel, Docker, Fly.io, Render). Route handlers are `nodejs` runtime and stream responses.
- `maxDuration` is set to 30s for extraction and 60s for downloads. Adjust to your platform.
- The in-memory cache and rate limiter are per-instance and reset on deploy. For global limits, put a WAF/platform rate limiter in front.
- Set `NEXT_PUBLIC_SITE_URL` to your production origin.
- The TikWM resolver is a free, unofficial public API with no SLA. The direct-page fallback handles outages where TikTok does not challenge the request, and oEmbed keeps error messaging accurate. For high-traffic production use, plan for a maintained extraction provider or a self-hosted resolver.

---

## Legal

LAMP TIK is an independent project, not affiliated with TikTok or ByteDance. It does not host videos; it proxies publicly accessible streams on request. Download only content you own or have permission to use, and respect creators' rights, copyright law, and TikTok's Terms of Service. The author assumes no liability for misuse.

---

Built with Next.js. Designed for the dark mode enjoyers.
