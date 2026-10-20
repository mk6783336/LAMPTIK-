import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MonitorPlay, Music2, ShieldCheck } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Downloader } from "@/components/downloader";
import { PlatformGrid } from "@/components/platform-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  organizationNode,
  webApplicationNode,
  websiteNode,
} from "@/components/seo/JsonLd";
import { ToolSeoContent } from "@/components/seo/ToolSeoContent";
import { TOOL_SEO } from "@/lib/content/tool-seo";
import { GUIDE_LIST } from "@/lib/content/guides";
import { pageAlternates, siteConfig, siteUrl } from "@/lib/site";

/** ≤60 chars, primary keyword first: Google never truncates it. */
const TITLE = "TikTok Video Downloader Without Watermark — HD MP4 & MP3";
/** Social cards have room; keep the richer, benefit-led version there. */
const SOCIAL_TITLE =
  "TikTok Video Downloader Without Watermark — Full HD 1080p MP4 & MP3 (Free, Fast)";
const DESCRIPTION =
  "Download TikTok videos without a watermark in Full HD 1080p MP4, convert to MP3, and resolve vt/vm short links. Free, no app, no sign-up — files save instantly to iPhone, Android and PC.";

export const metadata: Metadata = {
  // `absolute` bypasses the layout template: this is the exact SERP title.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [...siteConfig.keywords],
  alternates: pageAlternates("/"),
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
      organizationNode(),
      websiteNode(),
      webApplicationNode({
        id: `${siteUrl}/#app`,
        name: `${siteConfig.name} — TikTok Video Downloader`,
        url: siteUrl,
        description: DESCRIPTION,
        features: [
          "Download TikTok videos without a watermark",
          "Full HD 1080p MP4 downloads",
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
          "Three steps to save any public TikTok video as a clean HD MP4 or MP3 — no app, no sign-up.",
        steps: seo.steps,
        url: siteUrl,
        anchor: "how",
      }),
      faqPageNode(`${siteUrl}/#faq`, seo.faqs, siteUrl),
      breadcrumbNode(`${siteUrl}/#breadcrumb`, [{ name: "Home", url: siteUrl }]),
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
          {/* Slot A — top leaderboard above the hero. Reserved 90px, zero
              layout shift. */}
          <div className="shell pt-6 sm:pt-8">
            <AdSlot format="leaderboard" label="Advertisement" />
          </div>

          {/* Hero: copy left, instrument right on desktop; stacked and
              full-width on phones. */}
          <section className="pb-12 pt-8 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-7 sm:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 xl:gap-16">
              <div className="animate-rise min-w-0">
                <p className="eyebrow">
                  <span aria-hidden="true" className="eyebrow-dot" />
                  free · no app · no watermark
                </p>

                <h1 className="balance mt-4 text-[2.3rem] font-semibold leading-[1.02] tracking-headline sm:mt-5 sm:text-[3.1rem] lg:text-[3.5rem]">
                  TikTok videos.
                  <span className="text-gradient mt-1 block">
                    Without the watermark.
                  </span>
                </h1>

                <p className="pretty mt-4 max-w-lg text-[14.5px] leading-relaxed text-[var(--text-2)] sm:mt-5 sm:text-[15.5px]">
                  Download TikTok in HD MP4 — up to Full HD 1080p, no logo, no app — or
                  convert to MP3 with the original sound. Paste any tiktok.com,
                  vt.tiktok.com, or vm.tiktok.com link and the clean file saves straight
                  to your iPhone, Android, or PC.
                </p>

                <div className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {[
                    { label: "1080p source", Icon: MonitorPlay },
                    { label: "H.264 compatible", Icon: ShieldCheck },
                    { label: "MP3 audio", Icon: Music2 },
                  ].map(({ label, Icon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)] backdrop-blur"
                    >
                      <Icon className="size-3 text-[var(--accent-text)]" />
                      {label}
                    </span>
                  ))}
                </div>

                <Link
                  href="#how"
                  className="group mt-7 hidden items-center gap-1.5 text-[12.5px] text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)] sm:inline-flex"
                >
                  See how it works
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="animate-rise min-w-0 [animation-delay:80ms]">
                <Downloader />
              </div>
            </div>

            {/* Slot B — directly below the downloader / result card. */}
            <div className="shell mt-8 sm:mt-10">
              <AdSlot format="leaderboard" label="Advertisement" />
            </div>

            {/* Trust strip — the four facts people actually check, as glass
                tiles instead of a cramped definition list. */}
            <div className="shell mt-10 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {facts.map(([term, value]) => (
                  <div
                    key={term}
                    className="rounded-[16px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-md"
                  >
                    <dt className="micro truncate text-[9.5px] text-[var(--text-3)]">
                      {term}
                    </dt>
                    <dd className="mt-1 truncate text-[14px] font-medium tracking-tight">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* In-feed leaderboard — reserved 90px, zero layout shift. */}
          <section className="shell pb-2">
            <AdSlot format="leaderboard" />
          </section>

          <PlatformGrid />

          {/* Guides teaser: real content, internal links for SEO. */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    guides
                  </p>
                  <h2 className="balance mt-4 text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
                    Learn the details
                  </h2>
                </div>
                <Link
                  href="/guides"
                  className="group inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-text)] transition-opacity duration-200 hover:opacity-80"
                >
                  All guides
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
                      <h3 className="balance text-[15px] font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-[var(--accent-text)]">
                        {guide.title}
                      </h3>
                      <p className="pretty mt-2 text-[13px] leading-relaxed text-[var(--text-2)]">
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
                        <ArrowUpRight className="size-3.5" />
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
