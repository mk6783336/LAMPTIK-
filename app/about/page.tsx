import type { Metadata } from "next";
import Link from "next/link";

import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "About LAMP TIK: a privacy-first, watermark-free media resolver built for creators archiving their own work — no accounts, no logs, strict copyright respect.",
  alternates: { canonical: "/about" },
  openGraph: {
    images: ["/opengraph-image"],
    title: `About ${siteConfig.name}`,
    description:
      "The mission behind LAMP TIK: fast, privacy-first, watermark-free stream resolution for creators — with zero download logging and strict copyright respect.",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteConfig.name,
        url: siteUrl,
        email: "support@lamptik.online",
        logo: { "@type": "ImageObject", url: `${siteUrl}/icon.svg` },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteConfig.name,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en",
      },
      {
    "@type": "AboutPage",
    name: "About LAMP TIK",
    url: `${siteUrl}/about`,
    dateModified: "2026-10-19",
    about: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <AmbientBackground />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <article className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-6 sm:pt-16">
            <nav aria-label="Breadcrumb" className="micro text-[var(--text-3)]">
              <Link href="/" className="hover:text-[var(--text-2)]">
                Home
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span>About</span>
            </nav>

            <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-headline sm:text-[2.6rem]">
              About LAMP TIK
            </h1>
            <p className="mt-3 text-[13.5px] text-[var(--text-3)]">
              Last updated: October 19, 2026
            </p>

            <div className="mt-10 space-y-9 text-[14.5px] leading-relaxed text-[var(--text-2)]">
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Our mission
                </h2>
                <p className="mt-2">
                  LAMP TIK exists for one reason: creators and viewers should be
                  able to keep a copy of a public video they already have rights
                  to — in the quality it was made, without a watermark painted
                  over it, and without handing over an account to do it. Every
                  design decision on this site follows from that: a single
                  paste-and-save flow, no sign-up wall, no app install, and no
                  dashboard collecting dust around the tool.
                </p>
                <p className="mt-3">
                  The people we build for are creators archiving their own
                  work before a ban, takedown, or region lock takes it down;
                  editors pulling a clean reference clip; and everyday viewers
                  saving something meaningful for offline watching. That
                  audience deserves a fast, honest tool — not a maze of fake
                  download buttons.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  How the technology works
                </h2>
                <p className="mt-2">
                  When you paste a TikTok link, our server resolves the public
                  video ID, follows any vt/vm short-link redirect, and asks
                  TikTok&apos;s CDN for the original source stream — the same
                  file the TikTok app itself plays. We then proxy that file
                  back to you with an attachment header, so your browser saves
                  it directly to your device instead of opening a player tab.
                </p>
                <p className="mt-3">
                  Crucially, all of this happens <strong className="text-[var(--text)]">server-side</strong>.
                  Your device never runs extraction code, never installs
                  anything, and never needs to be logged in to TikTok. Media
                  requests are restricted to TikTok-owned CDN domains, so the
                  tool cannot be repurposed as a general proxy, and rate
                  limiting keeps one user from degrading the service for
                  everyone else.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Privacy by architecture, not by policy
                </h2>
                <p className="mt-2">
                  The strongest privacy claim a tool can make is structural:
                  there is nothing to leak. LAMP TIK keeps no account system,
                  no download history, and no database of the links you
                  process. Links are handled in memory for the few seconds it
                  takes to resolve a stream, short-lived caches expire on their
                  own, and IP addresses are used only to rate-limit abuse.
                </p>
                <p className="mt-3">
                  Your theme choice and advertising consent live in your own
                  browser&apos;s storage, never on our servers. If we never
                  hold your download history, no subpoena, breach, or mistake
                  can hand it over. The full details are in our{" "}
                  <Link
                    href="/privacy"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    privacy policy
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Copyright comes first
                </h2>
                <p className="mt-2">
                  Uploading to TikTok doesn&apos;t transfer copyright — the
                  creator keeps it. LAMP TIK respects that: we publish clear{" "}
                  <Link
                    href="/terms"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    terms
                  </Link>{" "}
                  restricting use to content you have the right to handle, we
                  operate a{" "}
                  <Link
                    href="/contact"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    DMCA takedown process
                  </Link>{" "}
                  for rights holders, and we act on valid notices promptly. Our
                  own{" "}
                  <Link
                    href="/guides/is-downloading-tiktok-videos-legal"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    legality guide
                  </Link>{" "}
                  explains the landscape in plain language rather than pretending
                  the question doesn&apos;t exist.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  How we&apos;re funded
                </h2>
                <p className="mt-2">
                  LAMP TIK is free and stays free. When advertising is enabled,
                  it is served by Adsterra and Monetag through clearly labeled
                  units during the active download window only — never fake
                  download buttons, forced redirects, or Google AdSense cookies — and our{" "}
                  <Link
                    href="/privacy"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    cookie policy
                  </Link>{" "}
                  explains consent before any advertising cookie is set. Direct
                  sponsor placements, when sold, carry a{" "}
                  <code className="font-mono text-[13px]">rel=&quot;sponsored&quot;</code>{" "}
                  link and a visible “Sponsor” label.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Contact
                </h2>
                <p className="mt-2">
                  Questions, feedback, or a copyright concern? Reach us at{" "}
                  <a
                    href="mailto:support@lamptik.online"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    support@lamptik.online
                  </a>{" "}
                  or use the{" "}
                  <Link
                    href="/contact"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    contact page
                  </Link>
                  . We read everything.
                </p>
              </section>
            </div>

            <div className="panel mt-12 p-5 sm:p-6">
              <p className="text-[15px] font-medium tracking-tight">
                Ready to save your video in HD?
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                Paste a link, get the watermark-free original stream — no
                account, nothing stored.
              </p>
              <Link
                href="/#tool"
                className="btn btn-primary mt-4 h-11 px-5 text-[14px] font-semibold"
              >
                Try the LAMP TIK Downloader →
              </Link>
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
