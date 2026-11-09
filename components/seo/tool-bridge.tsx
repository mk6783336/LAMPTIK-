import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { BridgeLink } from "@/lib/i18n/tool-bridges";

/**
 * A compact strip of internal links, placed above the fold.
 *
 * Why it exists: `/facebook-video-downloader` and `/twitter-video-downloader`
 * still answer "URL is unknown to Google" while the pages around them are
 * indexed — the only links that reach them sit in the footer, which is the last
 * thing a crawler walks. This strip puts the same dofollow links a few hundred
 * bytes into the indexed pages instead.
 *
 * It is in flow and wraps, so it can never cover the Download CTA and cannot
 * overflow at 390px. `lang` is set on every link that leaves the page's
 * language: the creator tools are English-only, and marking them otherwise
 * would promise a translation that does not exist.
 */
export function ToolBridge({ heading, links }: { heading: string; links: BridgeLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3.5">
      <h2 className="text-sm font-semibold tracking-tight">{heading}</h2>
      <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              lang={link.lang}
              hrefLang={link.lang}
              className="inline-flex items-center gap-1 text-sm text-[var(--accent-text)] underline-offset-4 hover:underline"
            >
              {link.label}
              <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
