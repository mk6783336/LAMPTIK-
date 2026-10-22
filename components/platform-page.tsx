import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Downloader } from "@/components/downloader";
import { PlatformBento } from "@/components/platform-bento";
import { PlatformIcon } from "@/components/platform-icons";
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
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TOOL_SEO } from "@/lib/content/tool-seo";
import { PLATFORM_LIST, PLATFORMS, type Platform } from "@/lib/platforms";
import { siteUrl } from "@/lib/site";

/** Per-page hero + structured data. Static strings — no client state. */
const PAGE_CONTENT: Record<
  Exclude<Platform, "youtube">,
  {
    eyebrow: string;
    headlineLead: string;
    headlineAccent: string;
    lede: string;
    chips: string[];
    facts: Array<[string, string]>;
    appFeatures: string[];
  }
> = {
  tiktok: {
    eyebrow: "TikTok downloader",
    headlineLead: "TikTok video downloader,",
    headlineAccent: "without the watermark.",
    lede: "Download TikTok videos in HD MP4 — up to Full HD 1080p, no logo, no app — or convert to MP3 with the original sound. Paste any tiktok.com or vt/vm short link and the clean file saves straight to your device.",
    chips: ["1080p source", "MP3 audio", "vt/vm links"],
    facts: [
      ["Price", "Free"],
      ["Account", "Not required"],
      ["Watermark", "Never"],
      ["Download logs", "None kept"],
    ],
    appFeatures: [
      "Download TikTok videos without a watermark",
      "HD MP4 video downloads up to 1080p",
      "TikTok to MP3 converter — original sound audio",
      "Short link support (vt.tiktok.com, vm.tiktok.com)",
    ],
  },
  instagram: {
    eyebrow: "Instagram Reels",
    headlineLead: "Instagram Reels",
    headlineAccent: "downloader, in original HD.",
    lede: "Save any public Reel as the exact 1080p MP4 Instagram's own player streams — no watermark, no login, no app. Paste a /reel/, /p/, /tv/ or instagr.am link and the clean file lands straight in your iPhone or Android gallery.",
    chips: ["Original HD", "Reels & posts", "No login"],
    facts: [
      ["Price", "Free"],
      ["Account", "Not required"],
      ["Watermark", "Never"],
      ["Quality", "Original HD"],
    ],
    appFeatures: [
      "Download Instagram Reels without watermark",
      "Original 1080p HD MP4 quality",
      "Supports instagram.com/reel, /reels, /p, /tv and instagr.am links",
      "No login, no app, no sign-up",
    ],
  },
  facebook: {
    eyebrow: "Facebook HD video",
    headlineLead: "Facebook video",
    headlineAccent: "downloader, in full HD.",
    lede: "Save Watch videos, page uploads, and Reels at native HD — even long 1GB+ files. fb.watch and /share/v/ share links resolve instantly. No watermark, no app, no login: paste a link, keep the MP4.",
    chips: ["HD video", "1GB+ files", "fb.watch"],
    facts: [
      ["Price", "Free"],
      ["Account", "Not required"],
      ["Long videos", "1GB+"],
      ["Watermark", "Never"],
    ],
    appFeatures: [
      "Download Facebook videos in HD MP4",
      "Long videos supported (1GB+ Watch uploads)",
      "Resolves fb.watch and /share/v/ short links",
      "No login, no app, no sign-up",
    ],
  },
};

const APP_NAMES: Record<Exclude<Platform, "youtube">, string> = {
  tiktok: "LAMP TIK TikTok Downloader",
  instagram: "LAMP TIK Instagram Reels Downloader",
  facebook: "LAMP TIK Facebook Video Downloader",
};

const CANONICALS: Record<Exclude<Platform, "youtube">, string> = {
  tiktok: "/",
  instagram: "/instagram-reels-downloader",
  facebook: "/facebook-video-downloader",
};

/**
 * Shared downloader shell for the three platform pages: platform-reactive
 * hero (accents adopt the brand via `data-platform-theme`), the shared
 * Downloader pre-configured for the platform, the bento capability grid, and
 * one-click cross-links to the other downloaders.
 */
export function PlatformPage({ platform }: { platform: Exclude<Platform, "youtube"> }) {
  const content = PAGE_CONTENT[platform];
  const canonical = CANONICALS[platform];
  const others = PLATFORM_LIST.filter((id) => id !== platform);
  const seo = TOOL_SEO[platform];
  const pageUrl = `${siteUrl}${canonical}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      webApplicationNode({
        id: `${pageUrl}/#app`,
        name: APP_NAMES[platform],
        url: pageUrl,
        description: `${content.lede} ${seo.lede}`,
        features: content.appFeatures,
      }),
      howToNode({
        id: `${pageUrl}/#howto`,
        name: seo.heading,
        description: seo.lede,
        steps: seo.steps,
        url: pageUrl,
        anchor: "how",
      }),
      faqPageNode(`${pageUrl}/#faq`, seo.faqs, pageUrl),
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: PLATFORMS[platform].switcherLabel, url: pageUrl },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col" data-platform-theme={platform}>
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="animate-rise min-w-0 lg:col-span-5">
                <p className="eyebrow">
                  <PlatformIcon
                    platform={platform}
                    className="size-3.5 text-[var(--accent-text)]"
                  />
                  {content.eyebrow}
                </p>

                <h1 className="balance mt-4 text-4xl font-semibold leading-[1.02] tracking-headline sm:mt-5 sm:text-5xl">
                  {content.headlineLead}
                  <span className="text-gradient mt-1 block">{content.headlineAccent}</span>
                </h1>

                <p className="pretty mt-4 max-w-lg text-base leading-relaxed text-[var(--text-2)] sm:mt-5 sm:text-base">
                  {content.lede}
                </p>

                <div className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {content.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs text-[var(--text-2)] backdrop-blur"
                    >
                      <Check className="size-3 text-[var(--accent-text)]" />
                      {chip}
                    </span>
                  ))}
                </div>

                <Link
                  href="/guides"
                  className="group mt-7 hidden items-center gap-1.5 text-sm text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)] sm:inline-flex"
                >
                  Read the download guides
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="animate-rise min-w-0 lg:col-span-7 [animation-delay:80ms]">
                <Downloader platform={platform} />
              </div>
            </div>

            {/* Slot B — Outstream Video Ad + 300x250 + 728x90 directly below the downloader card. */}
            <div className="shell mt-8 sm:mt-10">
              <VideoAdUnit />
            </div>

            <div className="shell mt-10 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {content.facts.map(([term, value]) => (
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

          <PlatformBento platform={platform} />

          {/* Cross-links: every other downloader in one click. */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    More downloaders
                  </p>
                  <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                    Save from anywhere
                  </h2>
                </div>
                <Link
                  href="/guides"
                  className="group inline-flex items-center gap-1.5 text-sm text-[var(--accent-text)] transition-opacity duration-200 hover:opacity-80"
                >
                  Read the guides
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {others.map((id) => (
                  <Link
                    key={id}
                    href={PLATFORMS[id].path}
                    prefetch={true}
                    data-accent={id}
                    className="bento-card group flex items-start gap-4"
                  >
                    <span className="bento-icon">
                      <PlatformIcon platform={id} className="size-5" />
                    </span>
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

          <ToolSeoContent platform={platform} />
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
