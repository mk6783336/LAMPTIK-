import type { Metadata, Viewport } from "next";

import { AdScripts } from "@/components/ads/AdScripts";
import { DesktopSideRails } from "@/components/ads/DesktopSideRails";
import { ConsentModeScript } from "@/components/consent-mode";
import { InstallPwa } from "@/components/install-pwa";
import { googleSiteVerification } from "@/lib/ads";
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
  referrer: "strict-origin-when-cross-origin",
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
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
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
        <link rel="preconnect" href="https://bellnewyork.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://bellnewyork.org" />
        <link rel="preconnect" href="https://n6wxm.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://n6wxm.com" />
        <link rel="preconnect" href="https://uplcm.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://uplcm.com" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LAMP TIK" />
        <link
          rel="preload"
          href={FONT_PRELOAD_URL}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta name="color-scheme" content="dark" />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        {/* hreflang is per page (`alternates.languages` on the home tool and the
            four translated landings), not global: emitting this cluster from the
            root layout made every tool page claim a translation it never had. */}
        <ConsentModeScript />
      </head>
      <body className="min-h-dvh">
        <InstallPwa />
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
      </body>
    </html>
  );
}
