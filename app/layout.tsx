import type { Metadata, Viewport } from "next";

import { AdScripts } from "@/components/ads/AdScripts";
import { DesktopSideRails } from "@/components/ads/DesktopSideRails";
import { StickyBottomAd } from "@/components/ads/StickyBottomAd";
import { ConsentModeScript } from "@/components/consent-mode";
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
  alternates: {
    canonical: "/",
    languages: { en: "/", "x-default": "/" },
  },
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#F4F6FA" },
  ],
  width: "device-width",
  initialScale: 1,
};

const bootScript = `(function(){try{var s=localStorage.getItem("lamptik-theme");var d=s?s==="dark":true;document.documentElement.classList.toggle("dark",d);}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          href={FONT_PRELOAD_URL}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <ConsentModeScript />
      </head>
      <body className="min-h-dvh">
        {children}
        {/* Desktop side rails (xl+ margins) + sticky bottom bar (Slot E).
            Both self-gate on configuration and reserve no space when ads
            are absent. */}
        <DesktopSideRails />
        <StickyBottomAd />
        {/* Adsterra Social Bar + Monetag Vignette. Both are `lazyOnload` and
            consent-gated, so first paint and LCP are untouched. */}
        <AdScripts />
      </body>
    </html>
  );
}
