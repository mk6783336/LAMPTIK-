import { gtagCommand, pushDataLayerEvent } from "@/lib/gtag";

/**
 * Google Analytics 4 configuration.
 *
 * Two GA4 properties receive this site's traffic: `G-TLNZNDJD4J` (the
 * original) and `G-8YQHV877RV`. They share one gtag.js download: every
 * `config` call opens a destination, so a page view or custom event is sent
 * once to each property. That is two collect hits per event, one per `tid` —
 * not the double-counting a second tag on the *same* property would cause.
 *
 * The IDs are declared here, once, rather than pasted into each route.
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_GA_MEASUREMENT_ID_2`
 * override the first and second ID (comma-separated lists are accepted), and
 * setting one to an empty string removes that destination — so a preview, a
 * retired property or a new one needs no code change.
 *
 * Consent is handled separately: `components/consent-mode.tsx` puts Google
 * Consent Mode v2 into "denied" before this tag loads, and the tag itself
 * still sends cookieless page views in that state. Nothing here grants
 * storage on its own.
 */
const FALLBACK_GA_IDS = ["G-TLNZNDJD4J", "G-8YQHV877RV"] as const;

/** One env value → zero or more collated measurement IDs. `""` disables. */
function parseMeasurementIds(raw: string | undefined, fallback: string): string[] {
  const value = raw?.trim();
  if (value === "") return [];
  if (!value) return [fallback];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export const gaMeasurementIds: readonly string[] = Array.from(
  new Set([
    ...parseMeasurementIds(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, FALLBACK_GA_IDS[0]),
    ...parseMeasurementIds(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID_2, FALLBACK_GA_IDS[1]),
  ]),
);

/** The destination gtag.js is loaded with; the rest are `config`-only. */
export const gaMeasurementId = gaMeasurementIds[0] ?? "";

/**
 * Google Tag Manager container. Declared here, next to the measurement ID,
 * because both are the site's Google tag configuration and both are read by
 * the root layout. `NEXT_PUBLIC_GTM_ID` overrides it; an empty value disables
 * the container entirely (useful on a preview that should not pollute it).
 */
export const gtmContainerId =
  process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-PF5KDMW4";

/**
 * Structured parameters for a download click. The visible label cannot carry
 * this: "Server 02" is either the SD rendition or the alternate CDN, and the
 * audio button says "M4A" while the bridge's is a real MP3.
 */
export interface DownloadEventMeta {
  /** Container the visitor receives. */
  format: "mp4" | "m4a" | "mp3" | "audio";
  /** Where the bytes come from: forced-attachment proxy, raw CDN in the
   *  visitor's own gesture, or the ffmpeg bridge. */
  delivery: "proxy" | "direct" | "bridge";
  /** Video renditions only. */
  quality?: "hd" | "sd";
}

/** The custom events this site sends, kept as a union so a typo is a build
 *  error instead of a stray row in GA4. */
export type AnalyticsEvent = "download_start" | "platform_switch";

/**
 * Send one GA4 event.
 *
 * Consent is not checked here on purpose: Google Consent Mode decides at
 * collection time. With `analytics_storage: denied` the hit still leaves as a
 * cookieless ping, which is exactly what the privacy policy describes.
 */
export function trackEvent(
  name: AnalyticsEvent,
  params: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") return;

  // Mirrored into `dataLayer` so a GTM trigger can use the same event. GTM
  // reads plain objects, gtag.js reads commands — one push per consumer.
  if (gtmContainerId) pushDataLayerEvent(name, params);

  if (!gaMeasurementIds.length) return;
  gtagCommand("event", name, params);
}
