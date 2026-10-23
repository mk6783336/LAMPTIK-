---
name: security-shield
description: SSRF, input, secret and header invariants for every route in this app.
alwaysApply: true
---

# security-shield

Adapted from ECC's security-shield. This app fetches arbitrary user-supplied
URLs on the server and streams the response back — the highest-risk surface in
the repository. These invariants are not suggestions; a change that breaks one
is a bug even if it "works".

## 1. Every server-side fetch is SSRF-guarded

- Validate the target with `assertPublicMediaUrl()` (throws `AppError`) or
  `isPublicMediaUrl()` (boolean), both in [lib/security.ts](../../lib/security.ts).
  They enforce https, no embedded credentials and no private/loopback/link-local
  host.
- Redirects must be followed **manually** and re-validated on every hop, the way
  `app/api/download/route.ts` does (`redirect: "manual"`, `MAX_REDIRECTS`,
  `isPublicMediaUrl(currentUrl)` per hop). Never `redirect: "follow"` on a
  user-influenced URL.
- Never concatenate a user value into a hostname, template, SQL string or shell
  command. No `child_process`, no `eval`, no `new Function`.
- Cache/queue keys derived from a URL must be hashed, not echoed.

## 2. Bound every request body

- Use `readBoundedJson(request, maxBytes)` from `lib/security.ts`. The cap is
  4 KiB (`MAX_FETCH_BODY_BYTES`) because a URL is ~100 bytes.
- Never call `request.json()` / `request.text()` directly on an API route
  without a size check — a hostile client must not be able to make the function
  buffer megabytes.
- Validate shape after parsing: URL strings go through `detectLink` /
  `parseTikTokUrl`-style helpers, ids must match `[A-Za-z0-9_-]{1,64}`, and
  `kind`/`platform` are allow-listed (`app/api/download/route.ts`).

## 3. Secrets never enter the repo or the client

- Only `NEXT_PUBLIC_*` values may be read in a client component. Server keys
  stay unprefixed and are read inside route handlers.
- Never log a token, cookie, `Authorization` header or full environment object.
  Log ids and status codes only.
- `.env`, `.env.local` and `.scratch/` stay out of git (`.gitignore`); never
  `git add -f` them.
- Ad zone ids and the Monetag smartlink live in `lib/monetization.ts`, sourced
  from env with public defaults. Do not add a hardcoded new vendor id inline in
  a component.

## 4. Response and transport headers stay intact

`next.config.ts` owns the security envelope for every route:

- `Content-Security-Policy` (an ad-network allowlist — touching it without
  testing an actual ad load will break monetization),
- `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`,
- `Referrer-Policy: strict-origin-when-cross-origin`,
- `Permissions-Policy` (no camera/mic/geo),
- `Strict-Transport-Security`,
- `X-Content-Type-Options: nosniff` on every download response.

If you add a third-party origin (script, iframe, font), extend the CSP
allowlist in the same commit. Prefer `next/script` over inline tags; the one
sanctioned inline script is the theme boot script in `app/layout.tsx`.

## 5. Rate limit and fail closed

- New API routes call `rateLimit(...)` from `lib/rate-limit.ts` keyed by
  `getClientIp(request)`. That helper trusts the edge-written headers
  (`x-real-ip`, `cf-connecting-ip`) before `x-forwarded-for`; do not read the
  forwarding list directly — a client can prepend it and mint a fresh bucket
  per request.
- Errors return the JSON shape from `lib/errors.ts` (`AppError` /
  `errorResponse`) with a user-facing message — never a stack trace, upstream
  URL or SQL error.
- A download response carries `Content-Disposition: attachment` **only** after
  the payload is validated (content type, size, magic bytes); an error page must
  never be savable as `.mp4`.
