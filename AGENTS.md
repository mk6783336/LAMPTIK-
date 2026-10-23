# AGENTS.md — LAMP TIK

Guidance for coding agents working in this repository. Keep it short, keep it
true; the four rule files in [`.claude/rules/`](.claude/rules/) are the
enforceable part of this document.

## What this repo is

A production Next.js 15.5 (App Router, React 19, TypeScript strict, Tailwind
3.4) web downloader for TikTok, Instagram Reels, Facebook and YouTube. It is a
**pure web tool** — there is no native app, no APK and no install flow.

```
app/                 routes; app/api/{fetch,youtube,download,ad-frame} are the edge/node endpoints
components/          UI; ads live in components/ads/
lib/                 resolvers, security, monetization, platform config
```

## Commands

```bash
npm run dev            # local dev
npm run typecheck      # tsc --noEmit
npm run lint           # next lint (separate gate; ignoreDuringBuilds is intentional)
npm run build          # next build — the exact thing Vercel runs
npm run verify         # typecheck + lint + build: run this before every commit
```

## The four gates

1. [**build-error-resolver**](.claude/rules/build-error-resolver.md) — nothing
   is committed unless `npm run verify` passes. No `any`, no suppressions, no
   `ignoreBuildErrors` to get green.
2. [**security-shield**](.claude/rules/security-shield.md) — SSRF-guard every
   upstream hop, bound every request body, never commit a secret, keep the
   security headers.
3. [**frontend-ux-consistency**](.claude/rules/frontend-ux-consistency.md) —
   7-step type scale (12px floor), 4 radii, 3 button variants, zero horizontal
   overflow at 390px.
4. [**monetization-integrity**](.claude/rules/monetization-integrity.md) — ads
   never cover the Download CTA and never paint a full-viewport overlay, the
   click handler stays synchronous, the server keeps its CDN referrers.

## Working agreements

- This repo has **no test suite**. Verify behaviour by exercising it: `curl`
  the API routes, drive the page in a browser, check response headers and the
  DOM rather than trusting a build's exit code.
- Prefer editing existing files. A new component is justified only when the
  thing it renders is reusable; the download flow, ad slots and platform pages
  already exist — extend them.
- Downloads are handed to the browser's own download manager. Do not
  reintroduce in-page `fetch()`/Blob/IndexedDB buffering of media bytes.
- Monetization is overlay-free. The Monetag Vignette script and the Adsterra
  Social Bar are banned: both paint invisible `position: fixed; inset: 0`
  layers that freeze taps/scrolls on mobile when their creative hangs. Only
  in-flow banners and the click-triggered Direct Link are allowed.
- Never commit `.env*`, `.next/` or `.scratch/`.
