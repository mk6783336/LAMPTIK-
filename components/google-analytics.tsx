"use client";

import Script from "next/script";
import { useEffect } from "react";

import { gaMeasurementIds, trackEvent } from "@/lib/analytics";
import { gtagCommand as gtag } from "@/lib/gtag";

/**
 * One Google tag for the whole site — gtag.js loaded once, then `config`d for
 * every GA4 destination in `gaMeasurementIds` (`G-TLNZNDJD4J`, then
 * `G-8YQHV877RV`). Loading the script twice, once per property, would pull
 * duplicate copies of the same library; configuring twice does not.
 *
 * Why this is a component and not a pasted `<head>` snippet:
 *
 * - It must be rendered exactly once per document, so it lives in the root
 *   layout rather than in every page.
 * - The tag has to load *after* the Consent Mode v2 defaults in the document
 *   head (`ConsentModeScript`), otherwise gtag.js starts with storage
 *   granted. `afterInteractive` keeps it off the critical path and after
 *   those inline defaults.
 *
 * NO manual `page_view` is sent here, on purpose. GA4's enhanced measurement
 * ships with "Page changes based on browser history events" enabled, and the
 * App Router's `pushState` navigations already look like page changes to it.
 * Adding a second page_view per route change (the usual Next.js guide
 * approach) counted every navigation twice — visible in the collect requests
 * as two hits with the same `dp`. That toggle lives in the GA4 admin UI (Web
 * stream → Enhanced measurement → Page views), not in a gtag option, so the
 * tag defers to it: `config` sends the first page view, GA sends the rest.
 */
/**
 * `config` must run once per document. Module scope (not a ref) so React
 * StrictMode's double-invoked effects in development, and any remount in
 * production, cannot count the same first page view twice.
 */
let configured = false;

export function GoogleAnalytics() {
  useEffect(() => {
    if (!gaMeasurementIds.length || configured) return;
    configured = true;
    gtag("js", new Date());
    for (const id of gaMeasurementIds) gtag("config", id);
  }, []);

  /**
   * Platform switches, tracked by delegation. The switcher and the home grid
   * are plain `<Link>`s (the grid is a server component), so the listener
   * reads `data-platform` / `data-platform-from` off the anchor instead of
   * turning every card into a client component. Capture phase: the event is
   * queued before the App Router starts the navigation.
   */
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor =
        event.target instanceof Element ? event.target.closest("a[data-platform]") : null;
      const to = anchor?.getAttribute("data-platform");
      if (!to) return;
      trackEvent("platform_switch", {
        from: anchor?.getAttribute("data-platform-from") ?? "direct",
        to,
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!gaMeasurementIds.length) return null;

  return (
    <Script
      id="ga-gtag"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        gaMeasurementIds[0],
      )}`}
    />
  );
}
