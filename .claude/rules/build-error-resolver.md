---
name: build-error-resolver
description: Green build gate — typecheck, lint and next build must pass before any commit.
alwaysApply: true
---

# build-error-resolver

Adapted from ECC's build-error-resolver. This repo's Vercel build is exactly
`next build` with `eslint.ignoreDuringBuilds: true`, so a type error is the only
thing standing between a commit and a failed deploy. Treat it that way.

## The gate

Before **any** commit, from the repo root:

```bash
npm run verify     # tsc --noEmit && next lint --max-warnings=0 && next build
```

All three must exit 0. If you touched `android-app/`, also rebuild and inspect
the APK (see below). Report a gate that could not run as a limitation — never
as a pass.

## Fix the cause, not the checker

- No `any`, `as unknown as`, `@ts-expect-error`, `@ts-ignore` to silence an
  error. The one existing `eslint-disable` (in `result-panel.tsx`, for
  `next/no-img-element` on CDN thumbnails) is a known exception — do not add
  more.
- No `typescript.ignoreBuildErrors`, no removing `--max-warnings=0`, no
  deleting a check.
- If a type is genuinely unknown, model it: `unknown` + narrowing, a discriminated
  union, or a `zod`-free manual parser in the route (this repo has no runtime
  schema library by design).

## Failure modes specific to this codebase

| Symptom | Cause | Fix |
| --- | --- | --- |
| `You're importing a component that needs useState` | client hook in a server component | add `"use client"` at the top of the component file (see `components/result-panel.tsx`) |
| `Dynamic server usage` / prerender crash | `window`/`document`/`localStorage` at module scope | touch them inside `useEffect` or a guarded function (`components/install-pwa.tsx`) |
| `Module not found: node:*` in a route | Node built-in used in an `edge` route | keep `runtime = "edge"` routes Web-standard, or move the route to `runtime = "nodejs"` (`app/api/apk/route.ts`) |
| Huge first-load JS | heavy client import in a route file | keep ads/analytics behind `next/script` `afterInteractive` (`components/ads/AdScripts.tsx`) |
| `next lint` deprecation noise | Next 15 warning | informational only; the exit code is what matters |

## Android build gate

```bash
JAVA_HOME=… ANDROID_HOME=… \
  VERSION_CODE=33 VERSION_NAME=3.3 bash android-app/build-native-apk.sh
"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --print-certs public/downloads/lamptik-v3.3.apk
"$ANDROID_HOME/build-tools/35.0.0/aapt2" dump badging public/downloads/lamptik-v3.3.apk | head -1
```

- Signature must verify (v1 + v2 + v3) with the existing keystore; a new key
  would break updates over an installed app.
- `versionCode`/`versionName` in the manifest must match `lib/site.ts`.
- Keep the previous filenames as byte-identical copies (the script does this),
  so cached links never 404.

## Before you say "done"

1. `npm run verify` exits 0 on the final tree (rerun after the last edit).
2. Any route you changed answers correctly with `curl` (status, content type,
   `Content-Disposition`).
3. Any UI you changed was exercised in a browser: the DOM shows the expected
   state, and the console has no new errors.
