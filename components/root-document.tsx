import { AdScripts } from "@/components/ads/AdScripts";
import { DesktopSideRails } from "@/components/ads/DesktopSideRails";
import { AhrefsAnalytics } from "@/components/ahrefs-analytics";
import { ConsentModeScript } from "@/components/consent-mode";
import { GoogleAnalytics } from "@/components/google-analytics";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/google-tag-manager";
import { JsonLd, siteEntityGraph } from "@/components/seo/JsonLd";

import "@/app/globals.css";

/**
 * ONE primary font (Inter, latin subset) is vendored in /public/fonts and
 * declared in globals.css with font-display:swap. Next 15.x stopped injecting
 * the font preload tag for next/font (vercel/next.js#62332), so the stable
 * public path is preloaded explicitly below — one woff2, one preload, no
 * render blocking. Display/mono styles are system stacks (tailwind.config.ts):
 * zero extra downloads.
 */
const FONT_PRELOAD_URL = "/fonts/inter-latin.woff2";

/**
 * Theme boot script. Runs before first paint so a returning visitor never sees
 * the default dark document flash to light. The storage KEY is versioned on
 * purpose: older builds stored a `lamptik-theme=light` choice that kept
 * returning visitors in light mode forever, so a fresh key means every
 * existing browser starts in Obsidian dark once.
 */
const bootScript = `(function(){try{var s=localStorage.getItem("lamptik_theme_v3");var light=s==="light";var r=document.documentElement;r.classList.toggle("dark",!light);r.setAttribute("data-theme",light?"light":"dark");r.style.colorScheme=light?"light":"dark";}catch(e){var r=document.documentElement;r.classList.add("dark");r.setAttribute("data-theme","dark");r.style.colorScheme="dark";}})();`;

/**
 * The whole `<html>` document, shared by the two root layouts.
 *
 * Next requires every `<html>`/`<body>` to come from a root layout, and `<html
 * lang>` has to be decided there — which is why the site has two: `(site)`
 * passes `lang="en"`, and `(i18n)/[lang]` passes the landing's own BCP-47 tag
 * and direction. Both call this component, so the analytics, consent order,
 * entity graph and ad rails exist exactly once per document in both cases.
 */
export function RootDocument({
  lang,
  dir = "ltr",
  children,
}: {
  lang: string;
  dir?: "ltr" | "rtl";
  children: React.ReactNode;
}) {
  return (
    <html
      lang={lang}
      dir={dir}
      className="dark"
      data-theme="dark"
      suppressHydrationWarning
    >
      {/* `@next/next/no-head-element` points at `next/head`, which is the
          Pages Router API and cannot be used from an App Router root layout.
          A shared `<head>` is exactly what this component is for: both root
          layouts must emit the same document head, and Next only allows the
          element inside a layout file, which a shared component is not. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
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
        {/* Consent Mode v2 defaults must run before any Google script. */}
        <ConsentModeScript />
        {/* Google Tag Manager (GTM-PF5KDMW4), after the consent defaults so
            the container can never load a tag before storage is denied. */}
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
        {/* Desktop side rails (xl+ margins) only. Inline ad slots live in the
            document flow; nothing is allowed to float over the tool. */}
        <DesktopSideRails />
        {/* Adsterra Social Bar + Monetag Vignette, loaded for every visitor
            (no consent gate) after hydration, so first paint and LCP are
            untouched while every pageview is monetized. */}
        <AdScripts />
        {/* One Google tag for the whole site, configured for both GA4
            destinations (G-TLNZNDJD4J and G-8YQHV877RV). Rendered here so it
            exists exactly once per document, after the Consent Mode defaults
            in <head>. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
