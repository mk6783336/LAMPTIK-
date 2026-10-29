import type { Metadata } from "next";
import Link from "next/link";

import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What LAMP TIK stores (almost nothing), how advertising cookies work, and how to control them. Privacy-first by design.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    images: ["/opengraph-image"],
    title: "Privacy Policy · LAMP TIK",
    description:
      "What LAMP TIK stores (almost nothing), how advertising cookies work, and how to control them. Privacy-first by design.",
    url: "/privacy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy · LAMP TIK",
    description:
      "What LAMP TIK stores (almost nothing), how advertising cookies work, and how to control them.",
  },
};

export default function PrivacyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy — LAMP TIK",
    url: `${siteUrl}/privacy`,
    dateModified: "2026-10-19",
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
              <span>Privacy</span>
            </nav>

            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-headline sm:text-5xl">
              Privacy policy
            </h1>
            <p className="mt-3 text-sm text-[var(--text-3)]">
              Last updated: October 29, 2026
            </p>

            <div className="mt-10 space-y-9 text-base leading-relaxed text-[var(--text-2)]">
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  The short version
                </h2>
                <p className="mt-2">
                  LAMP TIK does not require an account, does not store the links
                  you download, and does not keep logs of your activity. The
                  only data stored about you lives in your own browser (theme
                  and privacy choices). Advertising, if enabled, uses cookies
                  governed by your consent choice, and Google Analytics 4 counts
                  page views under that same choice — cookieless until you
                  accept, and never told which links you download.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  What we process
                </h2>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">TikTok links you submit.</strong>{" "}
                      They are processed in memory to resolve the video stream
                      and are not written to any database or log.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">Rate-limiting identifiers.</strong>{" "}
                      Your IP address is held in memory only long enough to
                      rate-limit abuse, then discarded.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">Local preferences.</strong>{" "}
                      Your theme and ad-consent choices are stored in your
                      browser&apos;s local storage on your device, never on our
                      servers.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">Aggregate page views.</strong>{" "}
                      Google Analytics 4 (measurement IDs G-TLNZNDJD4J and G-8YQHV877RV) records
                      which pages are visited, the referring site, approximate
                      location and device type. Ahrefs Web Analytics counts
                      page views alongside it, without cookies and without
                      storing personal data. Neither service receives the video
                      links you paste, and neither receives a file you download.
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Advertising and cookies
                </h2>
                <p className="mt-2">
                  This site may display advertising served by Google AdSense.
                  When ads are enabled:
                </p>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      Google and its partners may use cookies or similar
                      technologies to serve ads based on your prior visits to
                      this or other websites.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      Google&apos;s use of advertising cookies enables it and
                      its partners to serve ads to you based on your visit to
                      this site and/or other sites on the internet.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      You may opt out of personalized advertising by visiting{" "}
                      <a
                        href="https://www.google.com/settings/ads"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-text)] underline underline-offset-4"
                      >
                        Google Ads Settings
                      </a>
                      , or opt out of a third-party vendor&apos;s use of
                      cookies for personalized advertising at{" "}
                      <a
                        href="https://www.aboutads.info/choices/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-text)] underline underline-offset-4"
                      >
                        aboutads.info
                      </a>
                      .
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      We ask for consent before any advertising storage is
                      granted, and your choice is stored locally on your
                      device. You can change it at any time by clearing this
                      site&apos;s data in your browser.
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Cookie policy (detailed)
                </h2>
                <p className="mt-2">
                  A cookie is a small text file placed on your device by a
                  website. LAMP TIK itself only uses local storage — a browser
                  feature with the same purpose — and only for two choices you
                  make: your theme (dark/light) and your advertising consent.
                  Neither is sent to our servers.
                </p>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">Strictly necessary.</strong>{" "}
                      The theme and consent values in your browser&apos;s
                      local storage. No advertising cookie is set before you
                      consent.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">Advertising cookies (only after consent).</strong>{" "}
                      When ads are enabled and you accept, Google AdSense may
                      set cookies to select, deliver, and measure ads —
                      including the DoubleClick cookie, which helps Google
                      show ads based on your visits to this and other sites.
                      Declining keeps the site fully functional with
                      non-personalized ads or no ads at all.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>
                      <strong className="text-[var(--text)]">Analytics cookies (only after consent).</strong>{" "}
                      Google Analytics 4 may set the <code className="text-[var(--text)]">_ga</code>{" "}
                      cookie once you press Accept, so a returning visit is not
                      counted as a new person. Until then it runs in Google
                      Consent Mode with storage denied: no cookie is set and the
                      hit carries no identifier that could tie it to a returning
                      device. Declining keeps that cookieless mode permanently.
                      There is no fingerprinting and no tracking pixel beyond the
                      Google tag and the optional ad units.
                    </span>
                  </li>
                </ul>
                <p className="mt-3">
                  You can delete or block cookies in your browser settings at
                  any time; blocking them does not affect the downloader.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Your GDPR / EEA rights
                </h2>
                <p className="mt-2">
                  If you are in the European Economic Area or the UK, you have
                  rights under the General Data Protection Regulation:
                  access to your data, correction, erasure, restriction of
                  processing, data portability, and the right to withdraw
                  consent at any time (without affecting earlier processing).
                </p>
                <p className="mt-3">
                  The legal basis for processing the TikTok links you submit is
                  our legitimate interest in operating the tool you asked to
                  use; advertising cookies rely on your consent, which you can
                  withdraw by clearing this site&apos;s data in your browser.
                  Because we store essentially nothing about you, most requests
                  can be answered by simply confirming the absence of records.
                  Contact us through the project repository to exercise any of
                  these rights.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Third-party links
                </h2>
                <p className="mt-2">
                  This site links to TikTok and other external sites. We are not
                  responsible for their privacy practices. Review the privacy
                  policy of any site you visit.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Children&apos;s privacy
                </h2>
                <p className="mt-2">
                  LAMP TIK is not directed at children under 13 and does not
                  knowingly collect information from them.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Changes
                </h2>
                <p className="mt-2">
                  We may update this policy. The &ldquo;last updated&rdquo;
                  date at the top reflects the latest revision.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Contact
                </h2>
                <p className="mt-2">
                  Questions? Open an issue on the project repository or use the
                  contact method listed there.
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
