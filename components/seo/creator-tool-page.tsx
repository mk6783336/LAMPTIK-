import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Check } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import {
  breadcrumbNode,
  faqPageNode,
  JsonLd,
  webApplicationNode,
} from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCreatorTool, type CreatorTool } from "@/lib/creator-tools";
import { siteUrl } from "@/lib/site";

/**
 * The shell every creator micro-tool shares.
 *
 * It renders the same furniture as the downloader pages — header, consent,
 * breadcrumb, ads, FAQ, related links — and nothing else, so each route file
 * only owns its interactive panel. The ad slots are the same reserved-ratio
 * components as the rest of the site: the box is sized from the first paint, so
 * a late creative cannot move the page (CLS stays at zero).
 */
export function CreatorToolPage({
  tool,
  children,
}: {
  tool: CreatorTool;
  children: ReactNode;
}) {
  const pageUrl = `${siteUrl}/${tool.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webApplicationNode({
        id: `${pageUrl}/#app`,
        name: tool.name,
        url: pageUrl,
        description: tool.description,
        features: tool.features,
      }),
      // `faqPageNode` takes a mutable array; the content is `readonly`.
      faqPageNode(`${pageUrl}/#faq`, [...tool.faqs], pageUrl),
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "Tools", url: `${siteUrl}/tools` },
        { name: tool.name, url: pageUrl },
      ]),
    ],
  };

  const related = tool.related
    .map((slug) => getCreatorTool(slug))
    .filter((entry): entry is CreatorTool => Boolean(entry));

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-10 pt-6 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 lg:col-span-5">
                <Breadcrumb
                  trail={[
                    { name: "Home", href: "/" },
                    { name: "Tools", href: "/tools" },
                    { name: tool.name },
                  ]}
                />

                <p className="eyebrow mt-4 sm:mt-6">
                  <span aria-hidden="true" className="eyebrow-dot" />
                  {tool.eyebrow}
                </p>

                <h1 className="balance mt-3 text-[30px] font-semibold leading-[1.05] tracking-headline sm:mt-5 sm:text-5xl">
                  {tool.h1Lead}
                  <span className="text-gradient mt-1 block">{tool.h1Accent}</span>
                </h1>

                <p className="pretty mt-3 max-w-lg text-sm leading-relaxed text-[var(--text-2)] sm:mt-5 sm:text-base">
                  {tool.lede}
                </p>

                <ul className="mt-5 hidden flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-3)] sm:flex">
                  {tool.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="inline-flex items-center gap-1.5">
                      <Check aria-hidden="true" className="size-3 text-[var(--accent-text)]/80" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-w-0 lg:col-span-7">{children}</div>
            </div>

            <div className="shell mt-8 sm:mt-10">
              <VideoAdUnit />
            </div>

            <div className="shell mt-8 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {tool.facts.map(([term, value]) => (
                  <div
                    key={term}
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3"
                  >
                    <dt className="micro text-xs text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 text-sm font-medium leading-snug tracking-tight">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
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
              <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                Three steps, no account.
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

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Keep going
              </p>
              <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                The other creator tools.
              </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
                {related.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/${entry.slug}`}
                    className="bento-card group flex flex-col"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-base font-semibold tracking-tight">{entry.name}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                    </span>
                    <span className="pretty mt-2 block text-sm leading-relaxed text-[var(--text-2)]">
                      {entry.description}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href="/tools"
                className="group mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--field)] px-4 py-3.5 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
              >
                <span className="pretty min-w-0 text-sm leading-relaxed text-[var(--text-2)]">
                  <span className="font-semibold text-[var(--text)]">
                    Need the file, not the analysis?
                  </span>{" "}
                  Every downloader is one click away.
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--accent-text)]">
                  All tools
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
