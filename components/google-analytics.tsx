"use client";

import Script from "next/script";
import { useEffect } from "react";

import { gaMeasurementId } from "@/lib/analytics";
import { gtagCommand as gtag } from "@/lib/gtag";

/**
 * One Google tag for the whole site — GA4 property `G-TLNZNDJD4J`.
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
export function GoogleAnalytics() {
  useEffect(() => {
    if (!gaMeasurementId) return;
    gtag("js", new Date());
    gtag("config", gaMeasurementId);
  }, []);

  if (!gaMeasurementId) return null;

  return (
    <Script
      id="ga-gtag"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        gaMeasurementId,
      )}`}
    />
  );
}
