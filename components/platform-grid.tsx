import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PlatformIcon } from "@/components/platform-icons";
import { CREATOR_TOOLS } from "@/lib/creator-tools";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";

/**
 * Home-page cross-links as a four-up bento: one card per platform, each
 * carrying its own accent so the grid reads as a product family rather than
 * copies of the same tile. The fifth card is Twitter / X, which is not in
 * `PLATFORM_LIST` because it resolves through its own endpoint.
 *
 * `data-platform` / `data-platform-from` feed the GA4 click listener in
 * `components/google-analytics.tsx`: a server component cannot attach an
 * onClick, so the switch is reported from one delegated document listener.
 */
export function PlatformGrid() {
  return (
    <section className="section-pad border-t border-[var(--line)]">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              <span aria-hidden="true" className="eyebrow-dot" />
              One tool, every platform
            </p>
            <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
              Every platform. One paste.
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

        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_LIST.map((id) => {
            const config = PLATFORMS[id];
            return (
              <Link
                key={id}
                href={config.path}
                prefetch={true}
                data-accent={id}
                data-platform={id}
                data-platform-from="home"
                className="bento-card group flex flex-col"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="bento-icon">
                    <PlatformIcon platform={id} className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                </div>
                <h3 className="mt-6 text-base font-semibold tracking-tight">
                  {config.switcherLabel}
                </h3>
                <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                  {config.blurb}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--tool-ink)]">
                  Open downloader
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            );
          })}

          {/* The fifth surface. Not in `PLATFORM_LIST` on purpose: that union
              drives the shared multi-platform downloader, and X resolves
              through its own endpoint. Search Console reported this page as
              "Discovered - currently not indexed" with four inbound links in
              the whole site — the home page is one hop, so the card belongs
              here and not only in the footer. No `data-platform`: the GA4
              handler maps that attribute to the four shared-downloader
              platforms, and a fifth value would be silently dropped. */}
          <Link
            href="/twitter-video-downloader"
            prefetch={true}
            className="bento-card group flex flex-col"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="bento-icon">
                <span aria-hidden="true" className="text-sm font-semibold">
                  X
                </span>
              </span>
              <ArrowUpRight className="size-4 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
            </div>
            <h3 className="mt-6 text-base font-semibold tracking-tight">Twitter / X video</h3>
            <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
              Videos and GIFs from any x.com or twitter.com post — up to 1080p MP4, no
              watermark, no login.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--tool-ink)]">
              Open downloader
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        </div>

        {/* Hub link: the platform cards cover the four main downloaders, but a
            visitor hunting "mp3" or "stories" needs the fifteen task pages. */}
        <Link
          href="/tools"
          className="group mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--field)] px-4 py-3.5 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
        >
          <span className="pretty min-w-0 text-sm leading-relaxed text-[var(--text-2)]">
            <span className="font-semibold text-[var(--text)]">
              Looking for MP3, Shorts or Stories?
            </span>{" "}
            Every format and device question, sorted by task.
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--accent-text)]">
            All 15 tools
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* Creator micro-tools: four pages that answer questions the download
            giants do not (what TikTok pays, where a caption may sit, what the
            cover is, what the caption says). One hop from the home page, which
            is also what the crawl-depth fix needs. */}
        <div className="mt-10">
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-dot" />
            Creator tools
          </p>
          <h3 className="balance mt-3 text-2xl font-semibold leading-tight tracking-headline">
            For the people making the videos.
          </h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CREATOR_TOOLS.map((tool) => (
              <li key={tool.slug} className="flex">
                <Link href={`/${tool.slug}`} className="bento-card group flex w-full flex-col">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-snug tracking-tight">
                      {tool.name}
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                  </span>
                  <span className="pretty mt-2 block text-sm leading-relaxed text-[var(--text-2)]">
                    {tool.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
