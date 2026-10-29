import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Youtube } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  webApplicationNode,
} from "@/components/seo/JsonLd";
import { Downloader } from "@/components/downloader";
import { PLATFORMS } from "@/lib/platforms";
import { pageAlternates, siteUrl } from "@/lib/site";

/** ≤60 chars, keyword first. */
const TITLE = "YouTube Video Downloader 1080p HD — Shorts & MP3";
const SOCIAL_TITLE = "YouTube Video Downloader 1080p HD — Shorts, Long Videos & MP3";
const DESCRIPTION =
  "Download YouTube videos in 1080p, 720p or 360p MP4 plus MP3 audio — Shorts and long uploads included. Free, unlimited, no app or sign-up.";

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
    title: "Paste any YouTube link",
    body: "Copy the video in the YouTube app (Share → Copy link) and paste it above. Nothing to install and no account: youtube.com/watch, youtu.be, /shorts/, /embed/ and 1-hour+ videos all resolve through the multi-engine waterfall.",
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
      "Yes — unlimited 1080p, 720p, 360p and MP3 downloads at no cost, in any browser. No account, no app install and no sign-up are required.",
  },
  {
    question: "Do I need to install anything to download YouTube videos?",
    answer:
      "No. The browser tool on this page resolves YouTube links directly — there is no app to install, and downloads save straight to your device.",
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

/**
 * A playlist item links here with `?url=` so the chosen video is already in
 * the field. Only an 11-character YouTube id survives: the parameter can
 * never smuggle another platform or an arbitrary URL into the resolver.
 */
function prefilledVideoUrl(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(
    /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[&?#].*)?$/,
  );
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : undefined;
}

export default async function YouTubeDownloaderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialUrl = prefilledVideoUrl(params.url);
  const pageUrl = `${siteUrl}/youtube-downloader`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
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
          "Free, unlimited, no sign-up and no app required",
        ],
      }),
      howToNode({
        id: `${pageUrl}/#howto`,
        name: "How to download a YouTube video in 1080p HD",
        description:
          "Paste any YouTube link into LAMP TIK and save 1080p MP4 or MP3 — no app and no account required.",
        steps: STEPS,
        url: pageUrl,
        anchor: "how",
      }),
      faqPageNode(`${pageUrl}/#faq`, FAQS, pageUrl),
      // Mirrors the visible trail in the hero: Home → /tools → this page.
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "Tools", url: `${siteUrl}/tools` },
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
          <section className="pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="hero-stage shell grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="animate-rise hero-copy min-w-0 lg:col-span-5">
                <Breadcrumb
                  trail={[
                    { name: "Home", href: "/" },
                    { name: "Tools", href: "/tools" },
                    { name: "YouTube Downloader" },
                  ]}
                />

                <p className="eyebrow mt-6">
                  <Youtube className="size-3.5 text-[#ff5c7a]" />
                  YouTube · Free · No app required
                </p>

                <h1 className="balance mt-4 text-4xl font-semibold leading-[1.02] tracking-headline sm:mt-5 sm:text-5xl">
                  YouTube videos.
                  <span className="text-gradient mt-1 block">In full 1080p HD.</span>
                </h1>

                <p className="pretty mt-4 max-w-lg text-base leading-relaxed text-[var(--text-2)] sm:mt-5 sm:text-base">
                  {DESCRIPTION}
                </p>

                <div className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {["1080p Full HD", "Shorts + long videos", "MP3 audio"].map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs text-[var(--text-2)] backdrop-blur"
                    >
                      <Check className="size-3 text-[var(--accent-text)]" />
                      {chip}
                    </span>
                  ))}
                </div>

                {/* Result mode only (lg+): fills the column beside the result
                    card with the sponsor showcase instead of empty space. */}
                <div className="hero-ads mt-8 space-y-3">
                  <AdSlot format="rectangle" label="Sponsored — keeps LAMP TIK free" />
                  <AdSlot format="leaderboard" label="Sponsored — keeps LAMP TIK free" />
                </div>
              </div>

              <div className="animate-rise min-w-0 lg:col-span-7 [animation-delay:80ms]">
                <Downloader platform="youtube" initialUrl={initialUrl} />
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
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-md"
                  >
                    <dt className="micro text-xs text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 text-sm font-medium leading-snug tracking-tight">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* Cross-links to the other downloaders */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                More downloaders
              </p>
              <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
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
                        <span className="text-base font-semibold tracking-tight">
                          {PLATFORMS[id].switcherLabel}
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                      </span>
                      <span className="pretty mt-1.5 block text-sm leading-relaxed text-[var(--text-2)]">
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
            <div className="shell mb-10">
              <AdSlot format="leaderboard" label="Advertisement" />
            </div>
            <div className="shell max-w-3xl">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                How it works
              </p>
              <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                YouTube HD in three steps
              </h2>
              <ol className="mt-6 space-y-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step.title}
                    className="flex gap-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent-text)]"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{step.title}</p>
                      <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <h2 className="mt-10 text-2xl font-semibold tracking-headline">
                YouTube downloader FAQ
              </h2>
              <div className="mt-4 space-y-3">
                {FAQS.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold tracking-tight">
                      {faq.question}
                    </summary>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
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
