import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Downloader } from "@/components/downloader";
import { PhotoDownloader } from "@/components/photo-downloader";
import { PlaylistBrowser } from "@/components/playlist-browser";
import { PlatformIcon } from "@/components/platform-icons";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { PlatformBridge } from "@/components/seo/platform-bridge";
import {
  articleNode,
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  webApplicationNode,
} from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getGuide } from "@/lib/content/guides";
import { getSubTool } from "@/lib/content/sub-tools";
import { toolLabel } from "@/lib/content/sub-tools/groups";
import { SUB_TOOL_ANSWERS } from "@/lib/content/sub-tools/quick-answers";
import type { SubTool } from "@/lib/content/sub-tool-types";
import { PLATFORMS } from "@/lib/platforms";
import { siteUrl } from "@/lib/site";

/**
 * One programmatic sub-tool page: a single high-intent query, the shared
 * resolver for its platform, and copy written only for that query.
 *
 * The page owns no state — `Downloader` does — so it stays a server component
 * and ships no extra JavaScript beyond what the tool already needs.
 */
export function SubToolPage({ tool }: { tool: SubTool }) {
  const pageUrl = `${siteUrl}/${tool.slug}`;
  const platform = PLATFORMS[tool.platform];
  /** Same label the /tools hub prints on this page's card. */
  const label = toolLabel(tool);
  /** Snippet block + comparison rows, keyed by slug (see quick-answers.ts). */
  const answer = SUB_TOOL_ANSWERS[tool.slug];

  /**
   * Content revision date for the Article node.
   *
   * Ahrefs' page classifier reads these pages as articles (their copy is a
   * full how-to), so it expects Article markup alongside the tool schema. The
   * date is the last content edit, not the build time — an invented `now()`
   * would make every crawl look like a rewrite.
   */
  const SUB_TOOL_UPDATED_AT = "2026-11-03";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webApplicationNode({
        id: `${pageUrl}/#app`,
        name: tool.appName,
        url: pageUrl,
        description: tool.description,
        features: tool.features,
      }),
      howToNode({
        id: `${pageUrl}/#howto`,
        name: tool.h1Lead + " " + tool.h1Accent,
        description: tool.description,
        steps: tool.steps,
        url: pageUrl,
        anchor: "how",
      }),
      faqPageNode(`${pageUrl}/#faq`, tool.faqs, pageUrl),
      // The article view of the same page: the H1, the instant answer and the
      // steps are long-form content, so the Article node describes them for
      // the crawlers that classify this route as an article rather than a
      // tool form.
      articleNode({
        url: pageUrl,
        headline: `${tool.h1Lead} ${tool.h1Accent}`,
        description: tool.description,
        updatedAt: SUB_TOOL_UPDATED_AT,
      }),
      // Mirrors the visible trail in the hero exactly: Home → Tools → this
      // tool. The middle hop is the hub, which is where a reader arriving
      // from search can find the other fourteen without going back to home.
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "Tools", url: `${siteUrl}/tools` },
        { name: label, url: pageUrl },
      ]),
    ],
  };

  const related = tool.related
    .map((slug) => getSubTool(slug))
    .filter((entry): entry is SubTool => Boolean(entry));

  // Titles and summaries come from the guide itself, never duplicated here.
  const guideLinks = (tool.guides ?? []).flatMap((link) => {
    const guide = getGuide(link.slug);
    return guide ? [{ guide, anchor: link.anchor ?? guide.metaTitle ?? guide.title }] : [];
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col" data-platform-theme={tool.platform}>
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 lg:col-span-5">
                <Breadcrumb
                  trail={[
                    { name: "Home", href: "/" },
                    { name: "Tools", href: "/tools" },
                    { name: label },
                  ]}
                />

                <p className="eyebrow mt-6">
                  <PlatformIcon platform={tool.platform} className="size-3.5" />
                  {tool.eyebrow}
                </p>

                <h1 className="balance mt-4 text-4xl font-semibold leading-[1.02] tracking-headline sm:mt-5 sm:text-5xl">
                  {tool.h1Lead}
                  <span className="text-gradient mt-1 block">{tool.h1Accent}</span>
                </h1>

                {/* Instant answer, immediately under the H1: the question as
                    typed, then two sentences that answer it. This is the
                    featured-snippet and AI-answer shape — the reader gets the
                    answer before any scrolling, and the crawler gets one
                    unambiguous claim to quote. */}
                {answer ? (
                  <div className="mt-4 rounded-2xl border border-[var(--glass-border)] border-l-2 border-l-[var(--accent)] bg-[var(--glass-bg)] px-4 py-3.5">
                    <p className="text-sm font-semibold tracking-tight text-[var(--text)]">
                      {answer.query}
                    </p>
                    <p className="pretty mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">
                      {answer.answer}
                    </p>
                  </div>
                ) : null}

                <p className="pretty mt-4 max-w-lg text-base leading-relaxed text-[var(--text-2)] sm:mt-5">
                  {tool.lede}
                </p>

                {/* Facts, not controls: plain text, no pill, no button look.
                    Clarity counted these as dead clicks on phones. */}
                <ul className="mt-6 hidden flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-3)] sm:flex">
                  {tool.chips.map((chip) => (
                    <li key={chip} className="inline-flex items-center gap-1.5">
                      <Check aria-hidden="true" className="size-3 text-[var(--accent-text)]/80" />
                      {chip}
                    </li>
                  ))}
                </ul>

                <Link
                  href={platform.path}
                  className="group mt-7 hidden items-center gap-1.5 text-sm text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)] sm:inline-flex"
                >
                  {platform.name} video downloader
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="min-w-0 lg:col-span-7">
                {tool.toolKind === "photo" ? (
                  <PhotoDownloader />
                ) : tool.toolKind === "playlist" ? (
                  <PlaylistBrowser />
                ) : (
                  <Downloader platform={tool.platform} />
                )}
              </div>
            </div>

            <div className="shell mt-8 sm:mt-10">
              <VideoAdUnit />
            </div>

            <div className="shell mt-10 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {tool.facts.map(([term, value]) => (
                  <div
                    key={term}
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3"
                  >
                    <dt className="micro text-xs text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 text-sm font-medium leading-snug tracking-tight">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* In flow, directly under the tool: the only in-content path from
              these 22 indexed pages to the two Google has not crawled yet. */}
          <PlatformBridge host={tool.platform} />

          {/* Same-platform + related sub-tools */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                More tools
              </p>                <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                  {tool.relatedHeading ?? `Also save from ${platform.name}`}
                </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
                {related.map((entry) => (
                  <Link key={entry.slug} href={`/${entry.slug}`} className="bento-card group flex items-start gap-4">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold tracking-tight">{entry.h1Accent}</span>
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                      </span>
                      <span className="pretty mt-1.5 block text-sm leading-relaxed text-[var(--text-2)]">
                        {/* A sibling country card is a destination, not a
                            summary: its lede is three sentences about another
                            market and would triple the height of this grid. */}
                        {tool.relatedHeading ? `${entry.h1Lead} ${entry.h1Accent}` : `${entry.h1Lead} ${entry.lede}`}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section id="how" className="seo-section section-pad scroll-mt-24 border-t border-[var(--line)]">
            <div className="shell mb-10">
              <AdSlot slot="article" format="leaderboard" label="Advertisement" />
            </div>
            <div className="shell max-w-3xl">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                How it works
              </p>
              {/* Neutral heading: accents like "Every slide, saved." read as a
                  broken sentence when the template appends "in two steps". */}
              <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                Two steps, start to finish.
              </h2>
              <ol className="mt-6 space-y-3">
                {tool.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent-text)]"
                    >
                      {index + 1}
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

              {tool.notes?.length ? (
                <div className="mt-10">
                  <h2 className="text-2xl font-semibold tracking-headline">
                    Worth knowing before you save.
                  </h2>
                  <div className="mt-4 space-y-3">
                    {tool.notes.map((note) => (
                      <div
                        key={note.title}
                        className="rounded-xl border border-[var(--glass-border)] border-l-2 border-l-[var(--accent)] bg-[var(--field)] p-4"
                      >
                        <p className="text-sm font-semibold tracking-tight">{note.title}</p>
                        <p className="pretty mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">
                          {note.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <h2 id="faq" className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-headline">
                Frequently asked questions
              </h2>
              <div className="mt-4 space-y-3">
                {tool.faqs.map((faq) => (
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

          {/* Mechanism-by-mechanism comparison. Stacked cards, not a table:
              three columns at 390px is horizontal overflow, which the site
              does not ship. */}
          {answer?.comparison.length ? (
            <section className="section-pad border-t border-[var(--line)]">
              <div className="shell max-w-3xl">
                <p className="eyebrow">
                  <span aria-hidden="true" className="eyebrow-dot" />
                  Side by side
                </p>
                <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                  How this differs from a typical downloader.
                </h2>
                <div className="mt-6 space-y-3">
                  {answer.comparison.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
                    >
                      <p className="micro text-xs text-[var(--text-3)]">{row.label}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-[var(--accent-text)]">LAMP TIK</p>
                          <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">
                            {row.ours}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--text-3)]">
                            Typical downloader
                          </p>
                          <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">
                            {row.theirs}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {guideLinks.length > 0 ? (
            <section className="section-pad border-t border-[var(--line)]">
              <div className="shell">
                <p className="eyebrow">
                  <span aria-hidden="true" className="eyebrow-dot" />
                  Keep reading
                </p>
                <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                  The details behind this tool
                </h2>
                <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
                  {guideLinks.map(({ guide, anchor }) => (
                    <Link
                      key={guide.slug}
                      href={`/guides/${guide.slug}`}
                      className="bento-card group flex flex-col"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-base font-semibold tracking-tight">{anchor}</span>
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                      </span>
                      <span className="pretty mt-2 block text-sm leading-relaxed text-[var(--text-2)]">
                        {guide.description}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
