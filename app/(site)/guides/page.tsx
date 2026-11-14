import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Glyph } from "@/components/glyph";

import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { articleNode } from "@/components/seo/JsonLd";
import { PlatformBridge } from "@/components/seo/platform-bridge";
import { GUIDE_LIST } from "@/lib/content/guides";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guides — TikTok downloads explained",
  description:
    "Practical guides: downloading TikTok videos without watermarks, extracting MP3 audio, fixing broken short links, and doing it legally.",
  alternates: { canonical: "/guides" },
  openGraph: {
    images: ["/opengraph-image"],
    title: `Guides · ${siteConfig.name}`,
    description:
      "Practical guides to watermark-free TikTok downloads, MP3 extraction, short links, and the legal side.",
    url: "/guides",
    type: "website",
  },
};

export default function GuidesPage() {
  const pageUrl = `${siteUrl}/guides`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collection`,
        name: "LAMP TIK Guides",
        // Absolute, not `/guides`: a relative URL in structured data is
        // reported as a validation error by both Google's Rich Results test
        // and Ahrefs ("Structured data has Google rich results validation
        // error", 1 page) — this hub was that page, with 13 relative values
        // in its @graph.
        url: pageUrl,
        inLanguage: "en",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#software` },
        // The ordered index. `hasPart` below lists the same guides, but a
        // crawler reads it as prose; an ItemList is what says "this page is a
        // category and these are its members in order" — the exact item Ahrefs
        // reported on this hub and not on `/tools`, which already had one.
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: GUIDE_LIST.length,
          itemListElement: GUIDE_LIST.map((guide, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: guide.title,
            url: `${siteUrl}/guides/${guide.slug}`,
          })),
        },
        // `WebPage`, not `Article`: these entries describe the guide pages
        // without being the articles themselves. Typing them Article made
        // Google's validator demand datePublished, author and image on a hub
        // listing that has none of them — the one-page rich-results error in
        // the 29 Oct audit. The guide pages carry a complete Article node.
        hasPart: GUIDE_LIST.map((guide) => ({
          "@type": "WebPage",
          name: guide.title,
          description: guide.description,
          dateModified: guide.updatedAt,
          url: `${siteUrl}/guides/${guide.slug}`,
        })),
      },
      // The hub is a library index, but its intro copy is editorial — Ahrefs
      // classifies it as an "Article Guide" page, and it was one of the twelve
      // pages in the article-schema issue. The Article node describes the
      // library itself; the CollectionPage above still lists every guide.
      articleNode({
        url: pageUrl,
        headline: "LAMP TIK Guides — downloading videos without a watermark",
        description:
          "Practical guides to downloading TikTok, Instagram and Facebook videos without a watermark: quality, formats, broken short links and the legal side.",
        updatedAt: "2026-11-03",
      }),
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Guides", item: pageUrl },
        ],
      },
    ],
  };

  const [featured, ...rest] = GUIDE_LIST;

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
          <section className="pb-12 pt-10 sm:pb-16 sm:pt-16">
            <div className="shell">
              <nav aria-label="Breadcrumb" className="micro flex items-center gap-2 text-[var(--text-3)]">
                <Link href="/" className="transition-colors hover:text-[var(--text-2)]">
                  Home
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--text-2)]">Guides</span>
              </nav>

              <p className="eyebrow mt-6">
                <span aria-hidden="true" className="eyebrow-dot" />
                The library
              </p>
              <h1 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-[1.03] tracking-headline sm:text-5xl">
                Guides for{" "}
                <span className="text-gradient">clean downloads.</span>
              </h1>
              <p className="pretty mt-4 max-w-xl text-base leading-relaxed text-[var(--text-2)]">
                Short, practical articles about downloading TikTok videos the right way —
                quality, formats, broken links, and the legal side. No fluff, no affiliate
                detours.
              </p>
            </div>
          </section>

          <section className="pb-16 sm:pb-24">
            <div className="shell">
              {/* Featured guide: the widest tile in the grid, one clear
                  entry point for first-time readers. */}
              <Link
                href={`/guides/${featured.slug}`}
                className="bento-card group grid gap-6 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-center"
              >
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1 text-xs font-medium text-[var(--accent-text)]">
                    <BookOpen className="size-3" />
                    Start here
                  </span>
                  <h2 className="balance mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-2xl">
                    {featured.title}
                  </h2>
                  <p className="pretty mt-2.5 max-w-lg text-sm leading-relaxed text-[var(--text-2)]">
                    {featured.description}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end">
                  <time
                    dateTime={featured.updatedAt}
                    className="micro tabular-nums text-[var(--text-3)]"
                  >
                    Updated {featured.updatedAt}
                  </time>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-text)]">
                    Read the guide
                    <Glyph name="arrow-up-right" className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>

              <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
                {rest.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="bento-card group flex flex-col justify-between gap-6"
                  >
                    <div className="min-w-0">
                      <h2 className="balance text-base font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-[var(--accent-text)]">
                        {guide.title}
                      </h2>
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

              <PlatformBridge host="guide" />

              {/* Bottom video + multi-slot ad unit — after the guide grid. */}
              <div className="mt-12">
              </div>

              <p className="mt-10 text-sm text-[var(--text-2)]">
                Ready to download?{" "}
                <Link
                  href="/#tool"
                  className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
                >
                  Back to the downloader
                </Link>
                .
              </p>
            </div>
          </section>
        </main>

        {/* No download happens on this page, so the post-intent arm is
            scroll depth after a real dwell (lib/ad-intent.ts). */}
        <SiteFooter />
      </div>
    </>
  );
}
