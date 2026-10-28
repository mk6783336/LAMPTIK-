import Script from "next/script";

import { gtmContainerId } from "@/lib/analytics";

/**
 * Google Tag Manager container — `GTM-PF5KDMW4`.
 *
 * Two pieces, both required by Google:
 *
 * 1. The bootstrap snippet, rendered once from the root layout.
 * 2. A `<noscript>` iframe as the first element in `<body>`, for visitors
 *    with JavaScript disabled.
 *
 * Why `afterInteractive` instead of the raw snippet pasted "as high in the
 * head as possible": the raw form executes at parse time and competes with
 * the LCP image for bandwidth on the very first paint. `afterInteractive`
 * still places the tag in the document head, but schedules it after
 * hydration. The ordering that actually matters is preserved — the Consent
 * Mode v2 defaults in `components/consent-mode.tsx` are a plain inline head
 * script, so they always run before this container can load a single tag.
 *
 * One Google property per job: the direct GA4 tags (`G-TLNZNDJD4J` and
 * `G-8YQHV877RV`) in `components/google-analytics.tsx` remain the measurement
 * path for this site, and they are what the `download_start` /
 * `platform_switch` events are sent to. Do not also configure GA4
 * configuration tags for those measurement IDs inside this container — that
 * counts every page view once more per property.
 * GTM is here for everything else (remarketing, verification pixels, future
 * tags) and sees the same custom events through `lib/analytics.ts`, which
 * mirrors each one into `dataLayer`. The triggers that read those events are
 * in `gtm/GTM-PF5KDMW4-events.json`, with import steps in `gtm/README.md`.
 */
export function GoogleTagManager() {
  if (!gtmContainerId) return null;

  // JSON-encoded so the id can only ever land as a JS string literal.
  const id = JSON.stringify(gtmContainerId);

  return (
    <Script id="gtm-container" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${id});`}
    </Script>
  );
}

/**
 * The `<noscript>` half of the GTM install. Rendered immediately after the
 * opening `<body>` tag, exactly as Google specifies: without it, a visitor
 * who blocks JavaScript is never counted by the container at all.
 */
export function GoogleTagManagerNoScript() {
  if (!gtmContainerId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
          gtmContainerId,
        )}`}
        height="0"
        width="0"
        title="Google Tag Manager"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
