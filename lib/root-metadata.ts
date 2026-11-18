import type { Metadata, Viewport } from "next";

import { googleSiteVerification } from "@/lib/ads";
import { ahrefsSiteVerification } from "@/lib/analytics";
import { monetagVerification } from "@/lib/monetization";
import { siteConfig, siteUrl } from "@/lib/site";
import { bingSiteVerification } from "@/lib/verification";

/**
 * Metadata shared by both root layouts.
 *
 * The app renders two documents — `app/(site)` for the English tool pages and
 * `app/(i18n)/[lang]` for the four translated landings — because `<html lang>`
 * can only be set by a root layout, and the locale is only known inside the
 * `[lang]` segment. Everything that is not language-specific lives here so the
 * two documents cannot drift: title template, canonical base, verification
 * tags, robots policy, referrer policy and social defaults.
 *
 * A page's own `metadata` still wins field by field; the locale pages override
 * title, description, canonical and hreflang, and inherit the rest.
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteConfig.title, template: "%s · LAMP TIK" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  publisher: siteConfig.creator,
  // Canonical only: the hreflang cluster is emitted per page (the home tool
  // and its four translated landings), never from a layout.
  alternates: { canonical: "/" },
  category: "utilities",
  formatDetection: { telephone: false, address: false, email: false },
  // Requested by ClickAdilla for site verification: send the full referrer on
  // same-scheme hops and none only when a secure page links to plain HTTP.
  referrer: "no-referrer-when-downgrade",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    // One `other` map, not two keys: a second `other` in this literal would
    // replace this one, silently dropping the Ahrefs tag whenever the Monetag
    // token is configured. Both must survive together.
    other: {
      "ahrefs-site-verification": ahrefsSiteVerification,
      // Bing's HTML-tag method. Same `other` map for the same reason: a second
      // `other` key would replace this one and drop the Ahrefs tag.
      ...(bingSiteVerification ? { "msvalidate.01": bingSiteVerification } : {}),
      ...(monetagVerification ? { monetag: monetagVerification } : {}),
    },
  },
};

/**
 * The site ships one theme: Obsidian Dark (#050505).
 *
 * It used to follow `prefers-color-scheme`, which meant a desktop set to light
 * got a washed-out grey page that is not the product. Dark is unconditional;
 * the in-page toggle writes `lamptik_theme_v3=light`, which the boot script in
 * `RootDocument` honours on later visits.
 */
export const rootViewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};
