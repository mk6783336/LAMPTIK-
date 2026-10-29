import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { PlatformIcon } from "@/components/platform-icons";
import { breadcrumbNode, JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  GROUPED_TOOL_COUNT,
  GROUPED_TOOLS,
  toolLabel,
} from "@/lib/content/sub-tools/groups";
import { PLATFORMS, PLATFORM_LIST } from "@/lib/platforms";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * /tools — the index for every programmatic sub-tool.
 *
 * Two jobs. For a visitor, it answers "which of these sixteen pages do I
 * actually want?" by grouping them by task instead of by platform. For a
 * crawler, it turns sixteen leaf pages into one hop from the home page, which
 * is the difference between pages that get discovered and pages that sit in
 * the sitemap waiting.
 *
 * Content comes from `GROUPED_TOOLS`, so a tool added to the sub-tool index
 * appears here — and in the schema's ItemList — without touching this file.
 */
const TITLE = "All 16 Download Tools — Video & Audio by Task";
const DESCRIPTION =
  "All sixteen LAMP TIK downloaders in one place: YouTube MP4 and MP3, Shorts, TikTok Stories, Instagram Reels, Facebook HD and fb.watch links — grouped by task.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: pageAlternates("/tools"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/tools`,
    siteName: "LAMP TIK",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function ToolsPage() {
  const pageUrl = `${siteUrl}/tools`;

  // One ItemList in group order: the same sixteen links the page renders, so
  // the structured data can never advertise a tool the visitor cannot click.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}/#collection`,
        url: pageUrl,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#software` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: GROUPED_TOOL_COUNT,
          itemListElement: GROUPED_TOOLS.flatMap((group) => group.tools).map(
            (tool, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: toolLabel(tool),
              description: tool.description,
              url: `${siteUrl}/${tool.slug}`,
            }),
          ),
        },
      },
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "Tools", url: pageUrl },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-12 pt-10 sm:pb-14 sm:pt-14 lg:pt-20">
            <div className="shell">
              <nav
                aria-label="Breadcrumb"
                className="micro flex items-center gap-2 text-[var(--text-3)]"
              >
                <Link href="/" className="transition-colors hover:text-[var(--text-2)]">
                  Home
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--text-2)]">Tools</span>
              </nav>

              <p className="eyebrow mt-6">
                <span aria-hidden="true" className="eyebrow-dot" />
                The index
              </p>
              <h1 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-[1.03] tracking-headline sm:text-5xl">
                Every downloader.
                <span className="text-gradient mt-1 block">Sorted by what you need.</span>
              </h1>
              <p className="pretty mt-4 max-w-xl text-base leading-relaxed text-[var(--text-2)]">
                {GROUPED_TOOL_COUNT} tools across four platforms, all served by the same
                resolver. Pick the task you came for — a file format, a post that expires, a
                phone, a short link — and the page that answers it is one click away.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {[
                  `${GROUPED_TOOL_COUNT} tools`,
                  "4 platforms",
                  "No account",
                  "No watermark",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs text-[var(--text-2)]"
                  >
                    <Check className="size-3 text-[var(--accent-text)]" />
                    {chip}
                  </span>
                ))}
              </div>

              {/* Jump links: four anchors, so the page is navigable without
                  scrolling through all sixteen cards first. */}
              <nav aria-label="Tool categories" className="mt-7 flex flex-wrap gap-2">
                {GROUPED_TOOLS.map((group) => (
                  <a
                    key={group.id}
                    href={`#${group.id}`}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
                  >
                    {group.title}
                    <span className="tabular-nums text-[var(--text-3)]">
                      {group.tools.length}
                    </span>
                  </a>
                ))}
              </nav>
            </div>

            <div className="shell mt-9">
              <VideoAdUnit />
            </div>
          </section>

          {GROUPED_TOOLS.map((group, groupIndex) => (
            <section
              key={group.id}
              id={group.id}
              className="section-pad scroll-mt-24 border-t border-[var(--line)]"
            >
              <div className="shell">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      <span aria-hidden="true" className="eyebrow-dot" />
                      {String(groupIndex + 1).padStart(2, "0")} · {group.tools.length} tools
                    </p>
                    <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                      {group.title}
                    </h2>
                    <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                      {group.intent}
                    </p>
                  </div>
                </div>

                <ul className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.tools.map((tool) => {
                    const platform = PLATFORMS[tool.platform];
                    return (
                      <li key={tool.slug} className="flex">
                        <Link
                          href={`/${tool.slug}`}
                          data-platform={tool.platform}
                          className="bento-card group flex w-full flex-col"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                              <PlatformIcon
                                platform={tool.platform}
                                className="size-3.5"
                              />
                              {platform.name}
                            </span>
                            <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                          </div>
                          <h3 className="mt-4 text-base font-semibold leading-snug tracking-tight">
                            {toolLabel(tool)}
                          </h3>
                          <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                            {tool.description}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* One in-flow banner after the second group: between groups
                    it never sits over a card or a CTA. */}
                {groupIndex === 1 ? (
                  <div className="mt-10">
                    <AdSlot format="leaderboard" label="Advertisement" />
                  </div>
                ) : null}
              </div>
            </section>
          ))}

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Not on the list?
              </p>
              <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
                Start with the platform itself.
              </h2>
              <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                Every sub-tool above is a shortcut into one of these four pages. If your link
                is not a Short, a Story, a Reel or a Shorts URL, the platform downloader
                handles it directly — same resolver, same limits.
              </p>

              <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {PLATFORM_LIST.map((id) => {
                  const platform = PLATFORMS[id];
                  return (
                    <Link
                      key={id}
                      href={platform.path}
                      data-platform={id}
                      className="bento-card group flex flex-col"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="bento-icon">
                          <PlatformIcon platform={id} className="size-5" />
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                      </div>
                      <h3 className="mt-6 text-base font-semibold tracking-tight">
                        {platform.switcherLabel}
                      </h3>
                      <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                        {platform.blurb}
                      </p>
                    </Link>
                  );
                })}
              </div>

              <p className="mt-10 text-sm text-[var(--text-2)]">
                Want the mechanics rather than the links?{" "}
                <Link
                  href="/guides"
                  className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
                >
                  Read the guides
                </Link>{" "}
                on bitrates, broken links and what each platform actually publishes.
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
