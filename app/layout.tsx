import type { Metadata, Viewport } from "next";

import { AdScripts } from "@/components/ads/AdScripts";
import { AhrefsAnalytics } from "@/components/ahrefs-analytics";
import { DesktopSideRails } from "@/components/ads/DesktopSideRails";
import { ConsentModeScript } from "@/components/consent-mode";
import { GoogleAnalytics } from "@/components/google-analytics";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/google-tag-manager";
import { JsonLd, siteEntityGraph } from "@/components/seo/JsonLd";
import { googleSiteVerification } from "@/lib/ads";
import { ahrefsSiteVerification } from "@/lib/analytics";
import { monetagVerification } from "@/lib/monetization";
import { siteConfig, siteUrl } from "@/lib/site";

import "./globals.css";

/**
 * ONE primary font (Inter, latin subset) is vendored in /public/fonts and
 * declared in globals.css with font-display:swap. Next 15.x stopped
 * injecting the font preload tag for next/font (vercel/next.js#62332), so
 * the stable public path is preloaded explicitly below — one woff2, one
 * preload, no render blocking. Display/mono styles are system stacks
 * (tailwind.config.ts): zero extra downloads.
 */
const FONT_PRELOAD_URL = "/fonts/inter-latin.woff2";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteConfig.title, template: "%s · LAMP TIK" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  publisher: siteConfig.creator,
  // Canonical only: the hreflang cluster is emitted once, as real <link>
  // tags below (see HREFLANG_LINKS). Declaring it here as well produced two
  // identical alternate sets in every <head>.
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
    // Ahrefs Site Audit ownership check. Must be in the server HTML: Ahrefs
    // states it does not render JavaScript when it looks for this tag. The
    // matching `/ahrefs_…` file in public/ is a second, independent method.
    other: { "ahrefs-site-verification": ahrefsSiteVerification },
  },
  // Monetag domain verification. Renders `<meta name="monetag" content="…">`
  // only when NEXT_PUBLIC_MONETAG_META is set, so an unconfigured deploy never
  // advertises a verification token it does not own.
  ...(monetagVerification ? { other: { monetag: monetagVerification } } : {}),
};

/**
 * The site ships one theme: Obsidian Dark (#050505).
 *
 * It used to follow `prefers-color-scheme`, which meant a desktop set to
 * light — or any browser that reports light by default — got a washed-out
 * grey page that is not the product. Dark is now unconditional: the only way
 * to see light mode is to press the toggle, which writes an explicit
 * `lamptik_theme_v3=light` that this boot script honours on later visits.
 *
 * The storage KEY is versioned on purpose: older builds stored a
 * `lamptik-theme=light` choice that kept returning visitors in light mode
 * forever. Reading a fresh key means every existing browser starts in
 * Obsidian dark (#050505) once, with no stale value carried over.
 */
export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const bootScript = `(function(){try{var s=localStorage.getItem("lamptik_theme_v3");var light=s==="light";var r=document.documentElement;r.classList.toggle("dark",!light);r.setAttribute("data-theme",light?"light":"dark");r.style.colorScheme=light?"light":"dark";}catch(e){var r=document.documentElement;r.classList.add("dark");r.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="dark"
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        {/* Resource hints: exactly one ad origin is warmed. `n6wxm.com` and
            `idealistic-revenue.com` are click-time destinations (Direct Link),
            so preconnecting to them only burned sockets and made Lighthouse
            report unused/duplicate preconnects. `bellnewyork.org` is the only
            origin the page actually fetches from at load, and it is declared
            once — a `dns-prefetch` alongside a `preconnect` is free, two
            `preconnect`s to the same host are not. */}
        <link rel="preconnect" href="https://bellnewyork.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://bellnewyork.org" />
        {/* No `manifest.json` link and no install-prompt code: the PWA shell
            was retired when the real Chrome extension and Android app landed
            (/apps). The one remaining service worker, `/sw.js`, is the ad
            network's domain-verification worker — not a PWA stub. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="LAMP TIK" />
        <link
          rel="preload"
          href={FONT_PRELOAD_URL}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta name="color-scheme" content="dark" />
        {/* One entity graph for the whole site: Organization + WebSite +
            SoftwareApplication, stated once here and referenced by `@id` from
            every page's own schema. This is the disambiguation that stops
            "LAMP TIK" being summarised as a lamp shop. */}
        <JsonLd data={siteEntityGraph()} />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        {/* hreflang is per page (`alternates.languages` on the home tool and the
            four translated landings), not global: emitting this cluster from the
            root layout made every tool page claim a translation it never had. */}
        <ConsentModeScript />
        {/* Google Tag Manager (GTM-PF5KDMW4). Deliberately after the Consent
            Mode defaults above: the container must never load a tag before
            storage is denied. */}
        <GoogleTagManager />
        {/* Ahrefs Web Analytics: cookieless page counts, verified by the
            data-key attribute on this tag. Loaded once per document. */}
        <AhrefsAnalytics />
      </head>
      <body className="min-h-dvh">
        {/* GTM's no-JavaScript fallback, first element in <body> as Google
            specifies. */}
        <GoogleTagManagerNoScript />
        {children}
        {/* Desktop side rails (xl+ margins) only. The fixed sticky bottom bar
            was removed: on phones it parked a blurred bar over the last
            control and, together with the inline slots, produced a pile of
            stacked dark ad boxes. Inline slots live in the document flow. */}
        <DesktopSideRails />
        {/* Adsterra Social Bar + Monetag Vignette. Loaded for every visitor
            (no consent gate) after hydration, so first paint and LCP are
            untouched while every pageview is monetized. */}
        <AdScripts />
        {/* One Google tag for the whole site, configured for both GA4
            destinations (G-TLNZNDJD4J and G-8YQHV877RV). Rendered here so it
            exists exactly once per document, after the Consent Mode defaults
            in <head>, and sends a page_view on client-side navigations too. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
