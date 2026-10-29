import type { NextConfig } from "next";

/**
 * Ad-network Content-Security-Policy.
 *
 * Adsterra and Monetag rotate hundreds of real-time-bidding creative domains
 * (`bellnewyork.org`, `n6wxm.com`, `uplcm.com`, `3nbf4.com`, plus per-auction
 * CDNs) that cannot be enumerated ahead of time — a tight origin whitelist
 * silently kills live creatives in production. The page policy is therefore
 * deliberately permissive on the five ad-carrying directives (`https:` +
 * `unsafe-inline`/`unsafe-eval` + `data:`/`blob:`), while the hardening that
 * actually matters stays strict: `object-src 'none'`, `base-uri 'self'`,
 * `form-action 'self'`, and same-origin framing only (`frame-ancestors 'self'`
 * + `X-Frame-Options: SAMEORIGIN`) — plus COOP / CORP below. Framing is
 * SAMEORIGIN rather than DENY because our own pages embed `/api/ad-frame` in
 * an <iframe>: `DENY` / `frame-ancestors 'none'` blocked that frame and every
 * inline ad slot fell back to the house card.
 *
 * The isolated `/api/ad-frame` route carries its own frame-scoped policy so
 * the eval-heavy creative loader runs there, not in the page.
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // ESLint runs as its own gate (npm run lint + CI); it must not be able to
  // fail a production deployment after typecheck and compilation pass.
  eslint: { ignoreDuringBuilds: true },
  // Performance & optimization
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // Required by `app/global-not-found.tsx`: the app has two root layouts
    // ((site) and (i18n)/[lang]), so an unmatched URL has no layout to give
    // it a document, and Next's built-in bare 404 would replace the branded
    // page that the single-root-layout build used to serve.
    globalNotFound: true,
  },
  /**
   * Tool-shaped URLs that visitors and old backlinks use. The TikTok downloader
   * is the home page, so `/tiktok-downloader` is a permanent redirect to it
   * rather than a 404: a keyword URL that answers (even by redirecting) is a
   * trust signal, and listing the 404 in the sitemap would be a quality
   * penalty instead.
   */
  async redirects() {
    return [
      { source: "/tiktok-downloader", destination: "/", permanent: true },
    ];
  },
  // Security headers + cache policy
  async headers() {
    return [
      {
        // Apply to every HTML route. API routes are excluded on purpose: the
        // blanket `Cache-Control` below would otherwise override the
        // download proxy's `no-store` and let a CDN cache signed media.
        // `sw.js` is excluded: a service worker inherits the CSP of the
        // response that served it, and Monetag's worker importScripts from
        // 3nbf4.com. The page policy would block that import and the worker
        // would fail to install with a bare "evaluation failed" error.
        source: "/((?!api/|sw\\.js$).*)",
        headers: [
          // Content Security Policy — permissive on ad-carrying directives
          // (see the module header), strict everywhere else. 'unsafe-inline'
          // is additionally required by the inline theme boot script and
          // Framer Motion's injected styles.
          {
            key: "Content-Security-Policy",
            value: [
              // Auto-upgrade stray http:// subresources (some ad creatives
              // request http assets): https-capable hosts load cleanly
              // instead of spamming console violations; the rest stay blocked.
              "upgrade-insecure-requests",
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https: data: blob:",
              "font-src 'self' data: https:",
              "media-src 'self' https: blob:",
              "frame-src 'self' https: blob:",
              // The Social Bar renders its strip in a cross-origin frame.
              "child-src 'self' https: blob:",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Same-origin framing only: our own pages embed /api/ad-frame.
              "frame-ancestors 'self'",
            ].join("; "),
          },
          // Prevent MIME-type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Legacy XSS mitigation (defense-in-depth)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer policy - no leaks, preserves origin when crossing
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Restrict browser features (camera, mic, geolocation)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HTML: revalidate every visit but let the CDN cache it (speed).
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          // Clickjacking guard that still allows our own /api/ad-frame embeds
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Modern isolation: no cross-origin window/credential leakage, and
          // our own documents/images can't be embedded or framed by others.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          // HSTS: browsers that have ever seen this over HTTPS keep it, and
          // `preload` makes the domain eligible for browser-baked HTTPS-only
          // enforcement (Lighthouse "Ensure HSTS is enabled").
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // API routes: hardening headers without any cache policy (the
        // download proxy sets its own `no-store`). Framing is SAMEORIGIN /
        // `frame-ancestors 'self'`: `/api/ad-frame` must stay embeddable by
        // our own pages while third-party sites still cannot frame it.
        source: "/api/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Hashed build assets: safe to cache forever. This was the mobile
        // "slow loading" bug — a blanket no-store header disabled browser
        // caching of JS/CSS, so every visit re-downloaded the whole bundle.
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Monetag service worker. It MUST be revalidated on every request
        // (a stale worker keeps serving an expired ad config) and it needs
        // `Service-Worker-Allowed: /` so the worker can claim the whole site
        // scope instead of just /sw.js.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          // Worker-scoped policy: exactly what Monetag's bundle needs, and
          // nothing inherited from the page (no 'unsafe-eval', no ad frames).
          { key: "Content-Security-Policy", value: "script-src 'self' https://3nbf4.com" },
        ],
      },
      {
        // Self-hosted font: long-lived cache, revalidate in background.
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Raster/vector brand assets.
        source: "/:file(icon.svg|favicon.ico|icon.png|apple-icon.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
