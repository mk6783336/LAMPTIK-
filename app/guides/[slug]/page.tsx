import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { guideTool } from "@/lib/content/guide-tool";
import { getGuide, GUIDE_LIST } from "@/lib/content/guides";
import { siteConfig, siteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_LIST.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  // Compact title in the tab/SERP, full editorial title on the page itself.
  const title = guide.metaTitle ?? guide.title;

  return {
    title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      images: ["/opengraph-image"],
      title: `${title} · ${siteConfig.name}`,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      type: "article",
      publishedTime: guide.updatedAt,
      modifiedTime: guide.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const tool = guideTool(guide.slug);

  const guideUrl = `${siteUrl}/guides/${guide.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        datePublished: guide.updatedAt,
        dateModified: guide.updatedAt,
        inLanguage: "en",
        author: { "@type": "Organization", name: "LAMP TIK Editorial Team" },
        publisher: { "@type": "Organization", name: siteConfig.name },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": guideUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${siteUrl}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: guideUrl },
        ],
      },
    ],
  };

  const related = guide.related
    .map((relatedSlug) => getGuide(relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

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
          <article className="shell pb-16 pt-9 sm:pb-24 sm:pt-14">
            <div className="mx-auto max-w-3xl">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--text-3)]"
              >
                <Link href="/" className="transition-colors hover:text-[var(--text-2)]">
                  Home
                </Link>
                <span aria-hidden="true">/</span>
                <Link href="/guides" className="transition-colors hover:text-[var(--text-2)]">
                  Guides
                </Link>
                <span aria-hidden="true">/</span>
                <span className="min-w-0 truncate text-[var(--text-2)]">{guide.title}</span>
              </nav>

              <header className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1 text-[11px] text-[var(--text-2)]">
                    <BookOpen className="size-3 text-[var(--accent-text)]" />
                    Guide
                  </span>
                  <time dateTime={guide.updatedAt} className="micro text-[var(--text-3)]">
                    Updated {guide.updatedAt}
                  </time>
                </div>

                <h1 className="balance mt-4 text-[2.05rem] font-semibold leading-[1.08] tracking-headline sm:text-[2.6rem]">
                  {guide.title}
                </h1>

                {/* Short answer, formatted for featured snippets. */}
                <p className="pretty mt-5 rounded-[16px] border border-[var(--glass-border)] border-l-2 border-l-[var(--accent)] bg-[var(--glass-bg)] px-4 py-3.5 text-[14.5px] leading-relaxed text-[var(--text-2)] backdrop-blur-md">
                  {guide.shortAnswer}
                </p>

                {/* Contextual inline link to the tool this article is about.
                    Exact-match anchor text, high on the page, one click away. */}
                <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                  Ready to try it? You can{" "}
                  <Link
                    href={tool.href}
                    className="font-medium text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
                  >
                    {tool.anchor}
                  </Link>{" "}
                  right here — {tool.inline}
                </p>
              </header>

              {/* In-article leaderboard — below the intro, above the body. */}
              <div className="mt-8">
                <AdSlot format="leaderboard" eager label="Advertisement" />
              </div>

              <div className="mt-11 space-y-11">
                {guide.sections.map((section, index) => (
                  <section key={section.heading}>
                    <div className="flex items-center gap-3">
                      <span className="micro shrink-0 tabular-nums text-[var(--text-3)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden="true" className="rule flex-1" />
                    </div>
                    <h2 className="balance mt-3 text-[1.25rem] font-semibold tracking-tight sm:text-[1.4rem]">
                      {section.heading}
                    </h2>
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 48)}
                        className="pretty mt-3 text-[14.5px] leading-[1.75] text-[var(--text-2)]"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.list ? (
                      <ul className="mt-4 space-y-2.5">
                        {section.list.map((item) => (
                          <li
                            key={item.slice(0, 48)}
                            className="flex gap-3 text-[14px] leading-relaxed text-[var(--text-2)]"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--glow-cyan)]"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>

              {/* Pre-CTA video + multi-slot ad unit — after the last section. */}
              <div className="mt-12">
                <VideoAdUnit />
              </div>

              <div className="panel relative mt-12 overflow-hidden p-5 sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full opacity-70"
                  style={{
                    background:
                      "radial-gradient(closest-side, var(--mesh-b), transparent 72%)",
                  }}
                />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold tracking-tight">{tool.heading}</p>
                    <p className="pretty mt-1 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                      {tool.body}{" "}
                      <Link
                        href={tool.href}
                        className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 hover:decoration-[var(--accent)]"
                      >
                        {tool.anchor}
                      </Link>
                    </p>
                  </div>
                  <Link
                    href={tool.href}
                    className="btn btn-primary group h-10 shrink-0 gap-1.5 px-4 text-[13px] font-semibold"
                  >
                    <Sparkles className="size-3.5" />
                    {tool.cta}
                    <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {related.length > 0 ? (
                <nav aria-label="Related guides" className="mt-12">
                  <p className="micro text-[var(--text-3)]">Related guides</p>
                  <ul className="mt-4 grid gap-2.5">
                    {related.map((entry) => (
                      <li key={entry.slug}>
                        <Link
                          href={`/guides/${entry.slug}`}
                          className="group flex items-center justify-between gap-4 rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--field)]"
                        >
                          <span className="min-w-0 text-[13.5px] font-medium transition-colors duration-200 group-hover:text-[var(--accent-text)]">
                            {entry.title}
                          </span>
                          <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent-text)]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
