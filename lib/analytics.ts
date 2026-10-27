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
