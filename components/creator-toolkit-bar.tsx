import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CREATOR_TOOLS } from "@/lib/creator-tools";
import { cn } from "@/lib/cn";

/**
 * Compact cross-link strip for the four creator micro-tools.
 *
 * Placed directly under the downloader on every platform page and inside
 * `ResultPanel`, because the person who has just pasted a link is the person
 * with a channel to grow: the same visit can become a second pageview (Pages /
 * Session was 2.40) and the four tools get the internal links they need to be
 * crawled and ranked without waiting on the sitemap.
 *
 * Pure server component — no client JS, no state, no layout shift. Every label
 * ships at ≥12px (the site's type floor) and the grid is 2×2 on phones so the
 * 390px viewport never scrolls sideways.
 */
const SHORT_LABELS: Record<string, { label: string; note: string }> = {
  "tiktok-money-calculator": { label: "Money calculator", note: "RPM per 1k views" },
  "tiktok-safe-zone-checker": { label: "Safe zone checker", note: "9:16 overlays" },
  "video-thumbnail-downloader": { label: "Thumbnail grabber", note: "HD cover image" },
  "tiktok-caption-hashtag-extractor": { label: "Caption & tags", note: "Copy any caption" },
};

export function CreatorToolkitBar({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="creator-toolkit-heading"
      className={cn(
        "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="creator-toolkit-heading" className="text-xs font-semibold tracking-tight">
          Creator toolkit <span className="font-normal text-[var(--text-3)]">— free</span>
        </h2>
        <Link
          href="/tools"
          className="text-xs font-medium text-[var(--accent-text)] underline-offset-4 hover:underline"
        >
          All tools
        </Link>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {CREATOR_TOOLS.map((tool) => {
          const short = SHORT_LABELS[tool.slug];
          if (!short) return null;
          return (
            <li key={tool.slug} className="min-w-0">
              <Link
                href={`/${tool.slug}`}
                className="group flex h-full items-start justify-between gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-2 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium leading-snug tracking-tight text-[var(--text)]">
                    {short.label}
                  </span>
                  {/* The note is the second line that made this block 162px on a
                      phone; the label alone still says which tool it is. */}
                  <span className="mt-0.5 hidden text-xs leading-snug text-[var(--text-3)] sm:block">
                    {short.note}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="mt-0.5 size-3 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent-text)]"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
