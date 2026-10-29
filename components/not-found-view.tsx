import Link from "next/link";
import { ArrowUpRight, Compass, SearchX } from "lucide-react";

import { AmbientBackground } from "@/components/ambient-background";
import { PlatformIcon } from "@/components/platform-icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";

const SUGGESTIONS = [
  {
    href: "/",
    title: "TikTok Downloader",
    body: "Watermark-free HD MP4 and original-sound MP3 from any TikTok link.",
  },
  {
    href: "/instagram-reels-downloader",
    title: "Instagram Reels",
    body: "Original-quality Reels, photo-post videos, and IGTV at full 1080p.",
  },
  {
    href: "/facebook-video-downloader",
    title: "Facebook HD",
    body: "Long HD Watch videos (1GB+), page uploads, and instant fb.watch links.",
  },
] as const;

/**
 * On-brand 404 content: explain what happened, then get the visitor back to
 * work. Rendered by two boundaries — the `(site)` group's `not-found.tsx`,
 * which gets the layout's document, and `app/global-not-found.tsx`, which
 * documents itself because an unmatched URL belongs to no root layout.
 */
export function NotFoundView() {
  return (
    <>
      <AmbientBackground />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-14 pt-12 sm:pt-20">
            <div className="shell">
              <span className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Error 404
              </span>

              <h1 className="balance mt-5 max-w-2xl text-4xl font-semibold leading-[1.03] tracking-headline sm:text-5xl">
                This page isn’t{" "}
                <span className="text-gradient">on the reel.</span>
              </h1>
              <p className="pretty mt-4 max-w-xl text-base leading-relaxed text-[var(--text-2)]">
                The link may be mistyped, or the page has moved. The downloader
                itself is one click away — paste any TikTok, Instagram, or
                Facebook link and it works exactly as before.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/#tool"
                  className="btn btn-primary h-11 gap-2 px-5 text-sm font-semibold"
                >
                  <SearchX className="size-4" />
                  Open the downloader
                </Link>
                <Link href="/guides" className="btn btn-ghost h-11 gap-2 px-4 text-sm">
                  <Compass className="size-4" />
                  Browse the guides
                </Link>
              </div>
            </div>
          </section>

          <section className="pb-16 sm:pb-24">
            <div className="shell">
              <div className="grid gap-3.5 sm:grid-cols-3">
                {SUGGESTIONS.map((item, index) => {
                  const platform = PLATFORM_LIST[index];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-accent={platform}
                      className="bento-card group flex flex-col gap-5"
                    >
                      <span className="bento-icon">
                        <PlatformIcon platform={platform} className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-base font-semibold tracking-tight">
                            {item.title}
                          </span>
                          <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                        </span>
                        <span className="pretty mt-2 block text-sm leading-relaxed text-[var(--text-2)]">
                          {item.body}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <p className="mt-8 text-sm text-[var(--text-2)]">
                Looking for something specific?{" "}
                <Link
                  href="/contact"
                  className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
                >
                  Tell us
                </Link>{" "}
                and we’ll point you at it — {PLATFORMS.tiktok.name} included.
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
