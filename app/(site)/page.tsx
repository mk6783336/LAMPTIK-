import type { Metadata } from "next";
import Link from "next/link";
import { MonitorPlay, Music2, ShieldCheck } from "lucide-react";

import { Glyph } from "@/components/glyph";

import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { CreatorToolkitBar } from "@/components/creator-toolkit-bar";
import { Downloader } from "@/components/downloader";
import { PlatformGrid } from "@/components/platform-grid";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  APP_ID,
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  ORG_ID,
  SITE_ID,
  webApplicationNode,
} from "@/components/seo/JsonLd";
import { ToolSeoContent } from "@/components/seo/ToolSeoContent";
import { TOOL_SEO } from "@/lib/content/tool-seo";
import { GUIDE_LIST } from "@/lib/content/guides";
import { LANDING_LANGUAGES, siteConfig, siteUrl } from "@/lib/site";

/**
 * Brand first, keyword phrase intact: 51 chars, no truncation in a SERP.
 *
 * This replaced a title A/B that split visitors between a keyword-first and a
 * brand-first wording. The test could not conclude: Search Console shows 47
 * impressions and 15 clicks in 28 days, so neither arm would ever reach
 * significance, while making the homepage render per request (the cookie had
 * to be read server-side) cost TTFB on the one URL that matters most. The
 * brand query is also the only query the site ranks for at all — 14 of those
 * 15 clicks are brand clicks from Pakistan at position 2.0 — so the brand-led
 * wording is the one that has to answer it.
 */
const TITLE = "LAMP TIK — TikTok Video Downloader, No Watermark MP4";
/** Social cards have room; keep the richer, benefit-led version there. */
const SOCIAL_TITLE =
  "TikTok Video Downloader Without Watermark — Direct MP4 & MP3 (Free, Fast)";
const DESCRIPTION =
  "Save TikTok videos as the MP4 file TikTok serves — no watermark, plus MP3 of the original sound. vt/vm short links work too; free, no app, no sign-up.";

export const metadata: Metadata = {
  // `absolute` bypasses the layout template: this is the exact SERP title.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [...siteConfig.keywords],
  // Home is the English member of the translated landing cluster.
  alternates: { canonical: "/", languages: LANDING_LANGUAGES },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: siteConfig.name,
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SOCIAL_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function HomePage() {
  const seo = TOOL_SEO.tiktok;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // The homepage is the brand's landing entity: name it with the brand in
      // front, and point it at the site, organisation and product nodes by
      // `@id`. This is the node a "LAMP TIK" query should resolve to, instead
      // of a legal page that merely repeats the brand in its body text.
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: "LAMP TIK Video Downloader — TikTok, Instagram, Facebook & YouTube",
        description: DESCRIPTION,
        isPartOf: { "@id": SITE_ID },
        about: { "@id": ORG_ID },
        mainEntity: { "@id": APP_ID },
        breadcrumb: { "@id": `${siteUrl}/#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
        },
        inLanguage: "en",
      },
      webApplicationNode({
        id: `${siteUrl}/#app`,
        name: `${siteConfig.name} — TikTok Video Downloader`,
        url: siteUrl,
        description: DESCRIPTION,
        features: [
          "Download TikTok videos without a watermark",
          "MP4 downloads at the size TikTok serves (measured 576×1024)",
          "TikTok to MP3 — original sound audio",
          "Fast SD MP4 for slow connections",
          "Short link support (vt.tiktok.com, vm.tiktok.com)",
          "No app, no login, no download logs",
        ],
      }),
      howToNode({
        id: `${siteUrl}/#howto`,
        name: "How to download a TikTok video without a watermark",
        description:
          "Three steps to save any public TikTok video as a clean MP4 or MP3 — no app, no sign-up.",
        steps: seo.steps,
        url: siteUrl,
        anchor: "how",
      }),
      faqPageNode(`${siteUrl}/#faq`, seo.faqs, siteUrl),
      // The homepage is the TikTok downloader, so its trail starts at the hub
      // rather than at Home: "Home → TikTok" would point both ends at `/`.
      breadcrumbNode(`${siteUrl}/#breadcrumb`, [
        { name: "Tools", url: `${siteUrl}/tools` },
        { name: "TikTok Downloader", url: siteUrl },
      ]),
    ],
  };

  const facts: Array<[string, string]> = [
    ["Price", "Free"],
    ["Account", "Not required"],
    ["Watermark", "Never"],
    ["Download logs", "None kept"],
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          {/* Hero: copy left, instrument right on desktop; stacked and
              full-width on phones. A 12-column grid ties the value
              proposition and the tool card together instead of leaving a
              dead horizontal gap between them. */}
          <section className="pb-10 pt-4 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 lg:col-span-5">
                {/* Mobile fold: the breadcrumb costs ~20px above the CTA and
                    the sticky header already carries the navigation, so it is
                    hidden below `sm` rather than removed from the page. */}
                <div className="hidden sm:block">
                  <Breadcrumb
                    trail={[{ name: "Tools", href: "/tools" }, { name: "TikTok Downloader" }]}
                  />
                </div>

                <p className="eyebrow mt-3 sm:mt-6">
                  <span aria-hidden="true" className="eyebrow-dot" />
                  Free · No app required · No watermark
                </p>

                <h1 className="balance mt-3 text-[30px] font-semibold leading-[1.05] tracking-headline sm:mt-5 sm:text-5xl">
                  TikTok videos.
                  <span className="text-gradient mt-1 block">
                    Without the watermark.
                  </span>
                </h1>

                <p className="pretty mt-2 line-clamp-2 max-w-lg text-sm leading-relaxed text-[var(--text-2)] sm:mt-5 sm:line-clamp-none sm:text-base">
                  Download TikTok as MP4 — the file TikTok serves, measured 576×1024, no
                  logo, no app — or convert to MP3 with the original sound. Paste any
                  tiktok.com,
                  vt.tiktok.com, or vm.tiktok.com link and the clean file saves straight
                  to your iPhone, Android, or PC.
                </p>

                {/* Fact row, NOT chips. These three used to be bordered pills
                    that read as buttons — Clarity showed 27% of mobile sessions
                    tapping them and getting nothing, because they are facts
                    about the file, not controls. Plain text with an icon
                    removes the affordance instead of faking a target. */}
                <ul className="mt-6 hidden flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-3)] sm:flex">
                  {[
                    { label: "TikTok's own file", Icon: MonitorPlay },
                    { label: "H.264 compatible", Icon: ShieldCheck },
                    { label: "MP3 audio", Icon: Music2 },
                  ].map(({ label, Icon }) => (
                    <li key={label} className="inline-flex items-center gap-1.5">
                      <Icon aria-hidden="true" className="size-3 text-[var(--accent-text)]/80" />
                      {label}
                    </li>
                  ))}
                </ul>

                <Link
                  href="#how"
                  className="group mt-7 hidden items-center gap-1.5 text-sm text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)] sm:inline-flex"
                >
                  See how it works
                  <Glyph
                    name="arrow-up-right"
                    className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              <div className="min-w-0 lg:col-span-7">
                <Downloader />
                <CreatorToolkitBar className="mt-3" />
              </div>
            </div>

            {/* Internal links where the banner stack used to sit. These are the
                pages with the highest RPM and the clearest intent — X video and
                the three Tier-1 country pages — so the homepage passes its
                authority to them instead of to an ad exchange. */}
            <nav
              aria-label="Popular pages"
              className="shell mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:mt-10"
            >
              <span className="micro text-xs text-[var(--text-3)]">Popular</span>
              <Link
                href="/twitter-video-downloader"
                className="text-[var(--text-2)] underline decoration-[var(--glass-border)] underline-offset-4 transition-colors hover:text-[var(--text)]"
              >
                X / Twitter video, up to 4K
              </Link>
              <Link
                href="/download-videos-united-states"
                className="text-[var(--text-2)] underline decoration-[var(--glass-border)] underline-offset-4 transition-colors hover:text-[var(--text)]"
              >
                US video downloader
              </Link>
              <Link
                href="/download-videos-united-kingdom"
                className="text-[var(--text-2)] underline decoration-[var(--glass-border)] underline-offset-4 transition-colors hover:text-[var(--text)]"
              >
                UK video downloader
              </Link>
              <Link
                href="/download-videos-germany"
                className="text-[var(--text-2)] underline decoration-[var(--glass-border)] underline-offset-4 transition-colors hover:text-[var(--text)]"
              >
                Downloader für Deutschland
              </Link>
            </nav>

            {/* Trust strip — the four facts people actually check, as glass
                tiles instead of a cramped definition list. */}
            <div className="shell mt-10 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {facts.map(([term, value]) => (
                  <div
                    key={term}
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-md"
                  >
                    <dt className="micro text-xs text-[var(--text-3)]">
                      {term}
                    </dt>
                    <dd className="mt-1 text-sm font-medium leading-snug tracking-tight">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <PlatformGrid />

          {/* Guides teaser: real content, internal links for SEO. */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    Guides
                  </p>
                  <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                    Learn the details
                  </h2>
                </div>
                <Link
                  href="/guides"
                  className="group inline-flex items-center gap-1.5 text-sm text-[var(--accent-text)] transition-opacity duration-200 hover:opacity-80"
                >
                  All guides
                  <Glyph
                    name="arrow-up-right"
                    className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {GUIDE_LIST.slice(0, 3).map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="bento-card group flex flex-col justify-between gap-6"
                  >
                    <div>
                      <h3 className="balance text-base font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-[var(--accent-text)]">
                        {guide.title}
                      </h3>
                      <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                        {guide.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <time
                        dateTime={guide.updatedAt}
                        className="micro tabular-nums text-[var(--text-3)]"
                      >
                        {guide.updatedAt}
                      </time>
                      <span
                        aria-hidden="true"
                        className="grid size-7 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--field)] text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--accent-text)]"
                      >
                        <Glyph name="arrow-up-right" className="size-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* How-to steps, comparison table, FAQ (same array as the JSON-LD)
              and the internal-link matrix. */}
          <ToolSeoContent platform="tiktok" />
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
