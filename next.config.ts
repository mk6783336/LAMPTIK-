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
 * `form-action 'self'`, `frame-ancestors 'none'` (clickjacking), and the
 * matching `X-Frame-Options: DENY` / COOP / CORP headers below.
 *
 * The isolated `/api/ad-frame` route carries its own frame-scoped policy so
 * the eval-heavy creative loader runs there, not in the page.
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Performance & optimization
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
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
              "frame-ancestors 'none'",
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
          // Prevent the page from being embedded in frames (clickjacking)
          {
            key: "X-Frame-Options",
            value: "DENY",
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
          // HSTS: browsers that have ever seen this over HTTPS keep it.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        // API routes: hardening headers without any framing or cache policy.
        // Deliberately NO X-Frame-Options / frame-ancestors here — the
        // same-origin `/api/ad-frame` creative must stay frameable by our
        // own pages, and the download proxy sets its own `no-store`.
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
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
