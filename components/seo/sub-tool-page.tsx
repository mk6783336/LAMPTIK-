import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Downloader } from "@/components/downloader";
import { PlatformIcon } from "@/components/platform-icons";
import {
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  webApplicationNode,
} from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSubTool } from "@/lib/content/sub-tools";
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
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: platform.name, url: `${siteUrl}${platform.path}` },
        { name: tool.h1Accent, url: pageUrl },
      ]),
    ],
  };

  const related = tool.related
    .map((slug) => getSubTool(slug))
    .filter((entry): entry is SubTool => Boolean(entry));

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
              <div className="animate-rise min-w-0 lg:col-span-5">
                <p className="eyebrow">
                  <PlatformIcon platform={tool.platform} className="size-3.5" />
                  {tool.eyebrow}
                </p>

                <h1 className="balance mt-4 text-4xl font-semibold leading-[1.02] tracking-headline sm:mt-5 sm:text-5xl">
                  {tool.h1Lead}
                  <span className="text-gradient mt-1 block">{tool.h1Accent}</span>
                </h1>

                <p className="pretty mt-4 max-w-lg text-base leading-relaxed text-[var(--text-2)] sm:mt-5">
                  {tool.lede}
                </p>

                <div className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {tool.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs text-[var(--text-2)]"
                    >
                      <Check className="size-3 text-[var(--accent-text)]" />
                      {chip}
                    </span>
                  ))}
                </div>

                <Link
                  href={platform.path}
                  className="group mt-7 hidden items-center gap-1.5 text-sm text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)] sm:inline-flex"
                >
                  {platform.name} video downloader
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="animate-rise min-w-0 lg:col-span-7 [animation-delay:80ms]">
                <Downloader platform={tool.platform} />
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

          {/* Same-platform + related sub-tools */}
          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                More tools
              </p>
              <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                Also save from {platform.name}
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
                        {entry.h1Lead} {entry.lede}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

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
                {tool.h1Accent} in two steps
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

              <h2 id="faq" className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-headline">
                {tool.h1Accent} FAQ
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
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
