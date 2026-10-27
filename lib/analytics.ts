import { gtagCommand } from "@/lib/gtag";

/**
 * Google Analytics 4 configuration.
 *
 * One measurement ID for the whole site — the same tag every page shares, so
 * it is declared once in the root layout instead of being pasted into each
 * route. `NEXT_PUBLIC_GA_MEASUREMENT_ID` overrides it (previews, a second
 * property, or switching the ID without a code change); the fallback is the
 * production property `G-TLNZNDJD4J`.
 *
 * Consent is handled separately: `components/consent-mode.tsx` puts Google
 * Consent Mode v2 into "denied" before this tag loads, and the tag itself
 * still sends cookieless page views in that state. Nothing here grants
 * storage on its own.
 */
export const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-TLNZNDJD4J";

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
  if (!gaMeasurementId || typeof window === "undefined") return;
  gtagCommand("event", name, params);
}
