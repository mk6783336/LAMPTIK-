import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Youtube } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
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
import { YoutubeGate } from "@/components/youtube-gate";
import { PLATFORMS } from "@/lib/platforms";
import { pageAlternates, siteUrl } from "@/lib/site";

/** ≤60 chars, keyword first. */
const TITLE = "YouTube Video Downloader 1080p HD — Shorts & MP3";
const SOCIAL_TITLE =
  "YouTube Video Downloader 1080p HD — Shorts, Long Videos & MP3 (App Exclusive)";
const DESCRIPTION =
  "Download YouTube videos in Full HD 1080p, 720p, 360p MP4 plus MP3 audio — Shorts and long videos included. Free, unlimited, App-Exclusive: install the LAMP TIK web app once to unlock.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "YouTube video downloader 1080p",
    "YouTube Shorts downloader HD",
    "download YouTube video MP4",
    "YouTube to MP3 converter",
    "youtu.be downloader online",
    "download long YouTube video",
  ],
  alternates: pageAlternates("/youtube-downloader"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/youtube-downloader`,
    siteName: "LAMP TIK",
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

const STEPS = [
  {
    title: "Install the free LAMP TIK app (once)",
    body: "Tap “Install & Unlock Now” above — Android uses the native install prompt, iPhone uses Safari Share → Add to Home Screen. App Mode unlocks YouTube HD permanently on that device.",
  },
  {
    title: "Paste any YouTube link",
    body: "youtube.com/watch, youtu.be share links, /shorts/ clips, /embed/ and long 1-hour+ videos all resolve through the multi-engine waterfall.",
  },
  {
    title: "Pick 1080p, 720p, 360p or MP3 and save",
    body: "Streams proxy through the Edge CDN with Range resume support, so even 500MB+ files download reliably with under 15MB of server memory.",
  },
] as const;

const FAQS = [
  {
    question: "Is the YouTube downloader really free?",
    answer:
      "Yes — unlimited 1080p, 720p, 360p and MP3 downloads at no cost. Installing the free web app (no Play Store, no sign-up) is the only requirement.",
  },
  {
    question: "Why do I need to install the app for YouTube?",
    answer:
      "YouTube streams are heavier to resolve than TikTok clips. The app gate keeps bot abuse down so real users keep unlimited HD access without rate limits or accounts.",
  },
  {
    question: "Do Shorts and long videos both work?",
    answer:
      "Yes. Shorts resolve like any watch link, and long videos stream chunk-by-chunk with resume support — even 1-hour uploads save reliably to phone or PC.",
  },
  {
    question: "What quality do I get?",
    answer:
      "Up to Full HD 1080p MP4 when the mirror exposes it, plus 720p HD, 360p fast MP4, and highest-bitrate M4A/MP3 audio — all watermark-free by nature.",
  },
];

export default function YouTubeDownloaderPage() {
  const pageUrl = `${siteUrl}/youtube-downloader`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      webApplicationNode({
        id: `${pageUrl}/#app`,
        name: "LAMP TIK YouTube Video Downloader",
        url: pageUrl,
        description: DESCRIPTION,
        features: [
          "YouTube videos in Full HD 1080p MP4",
          "720p HD and 360p fast renditions",
          "YouTube Shorts downloader",
          "YouTube to MP3 — highest-bitrate audio",
          "Long videos with resumed, chunked streaming",
          "App-exclusive, free, no sign-up",
        ],
      }),
      howToNode({
        id: `${pageUrl}/#howto`,
        name: "How to download a YouTube video in 1080p HD",
        description:
          "Install the free LAMP TIK app once, paste any YouTube link, and save 1080p MP4 or MP3.",
        steps: STEPS,
        url: pageUrl,
        anchor: "how",
      }),
      faqPageNode(`${pageUrl}/#faq`, FAQS, pageUrl),
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "YouTube Downloader", url: pageUrl },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col" data-platform-theme="youtube">
        <SiteHeader />

        <main className="flex-1">
          <div className="shell pt-6 sm:pt-8">
            <AdSlot format="leaderboard" eager label="Advertisement" />
          </div>

          <section className="pb-12 pt-8 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-7 sm:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 xl:gap-16">
              <div className="animate-rise min-w-0">
                <p className="eyebrow">
                  <Youtube className="size-3.5 text-[#ff5c7a]" />
                  youtube · app exclusive
                </p>

                <h1 className="balance mt-4 text-[2.3rem] font-semibold leading-[1.02] tracking-headline sm:mt-5 sm:text-[3.1rem] lg:text-[3.4rem]">
                  YouTube videos.
                  <span className="text-gradient mt-1 block">In full 1080p HD.</span>
                </h1>

                <p className="pretty mt-4 max-w-lg text-[14.5px] leading-relaxed text-[var(--text-2)] sm:mt-5 sm:text-[15.5px]">
                  {DESCRIPTION}
                </p>

                <div className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {["1080p Full HD", "Shorts + long videos", "MP3 audio"].map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[11.5px] text-[var(--text-2)] backdrop-blur"
                    >
                      <Check className="size-3 text-[var(--accent-text)]" />
                      {chip}
                    </span>
                  ))}
                </div>

                <Link
                  href="/app-download"
                  className="group mt-7 hidden items-center gap-1.5 text-[12.5px] text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)] sm:inline-flex"
                >
                  How app install works
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="animate-rise min-w-0 [animation-delay:80ms]">
                <YoutubeGate />
              </div>
            </div>

            <div className="shell mt-8 sm:mt-10">
              <VideoAdUnit />
            </div>

            <div className="shell mt-10 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  ["Price", "Free"],
                  ["Account", "Not required"],
                  ["Best quality", "1080p HD"],
                  ["Videos", "Shorts + long"],
                ].map(([term, value]) => (
                  <div
                    key={term}
                    className="rounded-[16px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-md"
                  >
                    <dt className="micro truncate text-[9.5px] text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 truncate text-[14px] font-medium tracking-tight">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <div className="shell pb-2">
            <AdSlot format="leaderboard" />
          </div>

          {/* Cross-links to the other downloaders */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                more downloaders
              </p>
              <h2 className="balance mt-4 text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
                Save from anywhere
              </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
                {(["tiktok", "instagram", "facebook"] as const).map((id) => (
                  <Link
                    key={id}
                    href={PLATFORMS[id].path}
                    prefetch={true}
                    className="bento-card group flex items-start gap-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold tracking-tight">
                          {PLATFORMS[id].switcherLabel}
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                      </span>
                      <span className="pretty mt-1.5 block text-[13px] leading-relaxed text-[var(--text-2)]">
                        {PLATFORMS[id].blurb}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* How + FAQ (mirrors the JSON-LD) */}
          <section id="how" className="seo-section section-pad scroll-mt-24 border-t border-[var(--line)]">
            <div className="shell max-w-3xl">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                how it works
              </p>
              <h2 className="balance mt-4 text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
                YouTube HD in three steps
              </h2>
              <ol className="mt-6 space-y-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    className="flex gap-3.5 rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-[13px] font-bold text-[var(--accent-text)]"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold tracking-tight">{step.title}</p>
                      <p className="pretty mt-1 text-[13px] leading-relaxed text-[var(--text-2)]">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <h2 className="mt-10 text-[1.4rem] font-semibold tracking-headline">
                YouTube downloader FAQ
              </h2>
              <div className="mt-4 space-y-3">
                {FAQS.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <summary className="cursor-pointer list-none text-[14px] font-semibold tracking-tight">
                      {faq.question}
                    </summary>
                    <p className="pretty mt-2 text-[13px] leading-relaxed text-[var(--text-2)]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
