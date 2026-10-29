import type { Metadata } from "next";
import Link from "next/link";

import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site";

/** One string for the three tags below, so the SERP description cannot
 *  drift from the social card. 110+ characters keeps it out of the
 *  "meta description too short" bucket. */
const DESCRIPTION =
  "Rules for using LAMP TIK: personal use only, respect for creators' copyright, no automated scraping, and the limits of what a download can promise.";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    images: ["/opengraph-image"],
    title: "Terms of Service · LAMP TIK",
    description: DESCRIPTION,
    url: "/terms",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service · LAMP TIK",
    description: DESCRIPTION,
  },
};

export default function TermsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service — LAMP TIK",
    url: `${siteUrl}/terms`,
    dateModified: "2026-10-20",
    isPartOf: { "@type": "WebSite", name: "LAMP TIK", url: siteUrl },
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
              <span>Terms</span>
            </nav>

            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-headline sm:text-5xl">
              Terms of service
            </h1>
            <p className="mt-3 text-sm text-[var(--text-3)]">
              Last updated: October 19, 2026
            </p>

            <div className="mt-10 space-y-9 text-base leading-relaxed text-[var(--text-2)]">
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  1. What LAMP TIK is
                </h2>
                <p className="mt-2">
                  LAMP TIK is an independent utility that resolves and downloads
                  publicly available TikTok video streams. It is not affiliated
                  with, endorsed by, or operated by TikTok or ByteDance. We do
                  not host videos and do not control what creators upload.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  2. Acceptable use
                </h2>
                <p className="mt-2">You agree to use LAMP TIK only to:</p>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>Download public videos you have a right to use.</span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>Keep downloads personal and offline.</span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>Respect creators&apos; rights and TikTok&apos;s terms.</span>
                  </li>
                </ul>
                <p className="mt-3">
                  You agree not to use the service for mass scraping, automated
                  harvesting, redistribution of others&apos; content, or any
                  unlawful purpose. We may restrict access to protect the
                  service.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  3. Your responsibility
                </h2>
                <p className="mt-2">
                  Copyright in downloaded videos belongs to their creators. You
                  are responsible for how you use what you download. See the{" "}
                  <Link
                    href="/guides/is-downloading-tiktok-videos-legal"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    legality guide
                  </Link>{" "}
                  for a plain-language overview.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  4. Copyright and DMCA takedowns
                </h2>
                <p className="mt-2">
                  LAMP TIK respects intellectual property rights and complies
                  with the Digital Millennium Copyright Act (DMCA). Copyright
                  in downloaded videos belongs to their creators; we do not
                  host, store, or claim any rights over the content that flows
                  through the tool.
                </p>
                <p className="mt-3">
                  If you are a copyright owner and believe material accessible
                  through this service infringes your rights, contact us
                  through the project repository with: (a) a description of the
                  copyrighted work, (b) the exact TikTok URL(s) at issue,
                  (c) your contact information, and (d) a good-faith statement
                  that the use is not authorized. Valid notices are actioned
                  promptly — typically by blocking the affected URL(s) from the
                  tool. Repeat infringement may result in permanent restrictions
                  on access.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  5. No warranty
                </h2>
                <p className="mt-2">
                  The service is provided &ldquo;as is&rdquo; without warranties
                  of any kind. We do not guarantee that every video will resolve
                  — private, deleted, or region-locked content cannot be
                  downloaded. We are not liable for damages arising from your
                  use of the service or downloaded content.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  6. Changes
                </h2>
                <p className="mt-2">
                  We may modify or discontinue the service at any time. These
                  terms may be updated; the date at the top reflects the latest
                  revision.
                </p>
              </section>
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
