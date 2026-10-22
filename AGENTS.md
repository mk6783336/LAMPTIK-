# AGENTS.md — LAMP TIK

Guidance for coding agents working in this repository. Keep it short, keep it
true; the four rule files in [`.claude/rules/`](.claude/rules/) are the
enforceable part of this document.

## What this repo is

A production Next.js 15.5 (App Router, React 19, TypeScript strict, Tailwind
3.4) media downloader for TikTok, Instagram Reels, Facebook and YouTube, plus a
native Android app that is built **without Gradle** and ships as a signed APK
from `public/downloads/`.

```
app/                 routes; app/api/{fetch,youtube,download,apk,ad-frame} are the edge/node endpoints
components/          UI; ads live in components/ads/
lib/                 resolvers, security, monetization, platform config
android-app/         framework-only Java app + build-native-apk.sh (aapt2 → javac → d8 → zipalign → apksigner)
public/downloads/    signed APKs (v3.3 current, older names kept as identical aliases)
```

## Commands

```bash
npm run dev            # local dev
npm run typecheck      # tsc --noEmit
npm run lint           # next lint (separate gate; ignoreDuringBuilds is intentional)
npm run build          # next build — the exact thing Vercel runs
npm run verify         # typecheck + lint + build: run this before every commit

# Native APK (needs JDK 21 + Android SDK build-tools ≥35, platform 34)
JAVA_HOME=… ANDROID_HOME=… bash android-app/build-native-apk.sh
```

`build-tools` 34 ships a d8 that crashes on JDK 18+ class files; the script
picks the newest installed build-tools for that reason. Never pin 34.

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
   never cover the Download CTA, the click handler stays synchronous, the
   server keeps its CDN referrers.

## Working agreements

- This repo has **no test suite**. Verify behaviour by exercising it: `curl`
  the API routes, drive the page in a browser, check response headers and the
  DOM rather than trusting a build's exit code.
- Prefer editing existing files. A new component is justified only when the
  thing it renders is reusable; the download flow, ad slots and platform pages
  already exist — extend them.
- Downloads are handed to the browser's own download manager. Do not
  reintroduce in-page `fetch()`/Blob/IndexedDB buffering of media bytes.
- Android and web ship together: a version bump touches `android-app/app/src/main/AndroidManifest.xml`,
  `android-app/app/build.gradle`, `android-app/app/src/main/res/values/strings.xml`,
  `lib/site.ts`, `next.config.ts` and the rebuild in `public/downloads/`.
- Never commit `.env*`, `public/downloads/*.idsig`, `.next/` or `.scratch/`.
