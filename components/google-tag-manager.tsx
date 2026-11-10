import { GoogleTagManagerLoader } from "@/components/google-tag-manager-loader";
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
 * When it loads, and why: a throttled 390px trace put `gtm.js` and the tags it
 * fires inside the window a visitor is trying to use the tool in (239ms here,
 * plus a Clarity collect at 2.5s that this container loads). It is also not
 * the site's measurement path — GA4 is configured directly in
 * `components/google-analytics.tsx`, so page views, `download_start` and
 * `platform_switch` do not depend on this container being early.
 *
 * `afterInteractive` was early by a second; `lazyOnload` was no better, because
 * an inline bootstrap is part of the payload and executes at parse time
 * whatever the strategy says (measured: `gtm.js` at 792ms, `load` still
 * pending). `GoogleTagManagerLoader` therefore injects the container from a
 * client effect after `window.load`, with a 6s cap. The ordering that matters
 * is unchanged — the Consent Mode v2 defaults in `components/consent-mode.tsx`
 * are a plain inline head script, so they always run before any tag.
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
  return <GoogleTagManagerLoader containerId={gtmContainerId} />;
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
