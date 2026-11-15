"use client";

import { useEffect, useState } from "react";

import { Glyph } from "@/components/glyph";
import { smartlinkUrl, smartlinkUrl2 } from "@/lib/monetization";
import { nextSmartlinkUrl, notePartnerClick } from "@/lib/smartlink";

/**
 * Visual partner placements.
 *
 * A text row is invisible next to a downloader that already looks like a
 * player, so the two lead units are built as an outstream video frame — poster
 * gradient, pulsing play button, "Ad · 0:05" counter, animated stream bars and
 * a moving scrubber — and the in-content unit is a multi-column promo card.
 * Three rules keep that honest:
 *
 *   - every unit says "Sponsored · Ad" at 12px, and the anchor carries
 *     `rel="sponsored nofollow noopener noreferrer"`;
 *   - the unit never claims to be this site's download. A click opens a
 *     Monetag Smartlink in a new tab; no file exists behind it;
 *   - the whole frame is the anchor, so a tap anywhere on the "player" opens
 *     the partner page. The cooldown in `lib/smartlink.ts` never applies here:
 *     an explicit click on a labelled partner unit is not an automatic trigger.
 *
 * The three in-flow variants are reserved display boxes: the root carries
 * `data-ad-slot` / `data-ad-reserve` and `--ad-ratio`, so `npm run check:ads`
 * can assert the box never collapses (728×90 desktop, 300×250 below 640px).
 * The sticky bar is deliberately not tagged as a slot: a 56px bar cannot honour
 * the 300×250 pin, and the audit exists for display units, not bars.
 */
export type VisualAdVariant = "under-tool" | "in-content" | "sticky-bottom" | "result";

const COPY = {
  "under-tool": {
    eyebrow: "Sponsored · Ad",
    headline: "Fast stream partner",
    body: "Same public link, a partner player with its own queue — opens in a new tab.",
    cta: "Watch / Open Fast Stream Partner",
  },
  "in-content": {
    eyebrow: "Sponsored · Ad",
    headline: "One server is never enough",
    body: "The partner tool runs its own pipeline: separate queue, separate player, same link.",
    cta: "Open partner player",
  },
  "sticky-bottom": {
    eyebrow: "Sponsored · Ad",
    headline: "Partner stream server",
    body: "One tap, new tab.",
    cta: "Open now",
  },
  result: {
    eyebrow: "Sponsored · Ad",
    headline: "Watch it on the partner player",
    body: "Your file above is already downloading. This opens a partner stream for the same link.",
    cta: "Watch / Open Partner",
  },
} as const;

/** Reserved ratio for the tagged slots; the sticky bar has none by design. */
const RATIO: Record<VisualAdVariant, string> = {
  "under-tool": "728 / 90",
  "in-content": "728 / 90",
  result: "300 / 250",
  "sticky-bottom": "",
};

function hrefFor(secondary: boolean): string {
  return secondary ? smartlinkUrl2 || smartlinkUrl : smartlinkUrl;
}

/** Four bars that read as a live stream, not a static icon. */
function StreamBars({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`flex items-end gap-[3px] ${className}`}>
      {[10, 16, 7, 13].map((height, index) => (
        <span
          key={height + index}
          className="w-[3px] rounded-full bg-[var(--accent-text)]/80 animate-pulse"
          style={{ height, animationDelay: `${index * 180}ms`, animationDuration: "1200ms" }}
        />
      ))}
    </span>
  );
}

export function VisualAdSlot({
  variant,
  secondary = false,
  className = "",
}: {
  variant: VisualAdVariant;
  /** Use NEXT_PUBLIC_SMARTLINK_URL_2 when configured; falls back to primary. */
  secondary?: boolean;
  className?: string;
}) {
  const copy = COPY[variant];
  const ratio = RATIO[variant];
  const [href, setHref] = useState(hrefFor(secondary));
  const [dismissed, setDismissed] = useState(false);
  const [guardVisible, setGuardVisible] = useState(true);

  // Rotation between the two account links. Initial href is the primary, so
  // SSR/hydration match; after mount the next trigger's link is chosen from the
  // stamp count. `secondary` units always point at the second link when set.
  useEffect(() => {
    if (!smartlinkUrl) return;
    setHref(secondary ? smartlinkUrl2 || smartlinkUrl : nextSmartlinkUrl());
  }, [secondary]);

  useEffect(() => {
    if (variant !== "sticky-bottom") return;
    try {
      if (window.sessionStorage.getItem("lamptik:sticky-ad:v1") === "hidden") {
        setDismissed(true);
      }
    } catch {
      // Storage blocked: show the bar; the × still works for this pageview.
    }

    // A bottom bar must never sit over the tool. While any ad-guard region
    // (tool or result panel) is on screen the bar stays out of the way; it
    // appears once the visitor has scrolled into the reading part of the page.
    const guards = Array.from(document.querySelectorAll("[data-ad-guard]"));
    if (!guards.length) {
      setGuardVisible(false);
      return;
    }
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setGuardVisible(visible.size > 0);
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    for (const guard of guards) observer.observe(guard);
    return () => observer.disconnect();
  }, [variant]);

  if (!href) return null;
  if (variant === "sticky-bottom" && (dismissed || guardVisible)) return null;

  // No preventDefault anywhere: the anchor opens the tab. Recording the click
  // only updates rotation parity and can never cancel it.
  const onPartnerClick = () => notePartnerClick(href);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem("lamptik:sticky-ad:v1", "hidden");
    } catch {
      // Ignore: dismissal still applies to this render.
    }
  };

  if (variant === "sticky-bottom") {
    return (
      <div
        role="complementary"
        aria-label="Sponsored partner"
        className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] sm:px-4"
        data-ad-unit="sticky-bottom"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <Glyph name="arrow-up-right" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              {copy.eyebrow}
            </p>
            <p className="truncate text-sm font-medium text-[var(--text)]">{copy.headline}</p>
          </div>
          <a
            href={href}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={onPartnerClick}
            className="btn btn-primary h-9 shrink-0 px-3 text-xs font-semibold"
          >
            {copy.cta}
          </a>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close sponsored bar"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--text-3)] transition-colors hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  const videoFrame = variant === "under-tool" || variant === "result";

  return (
    <div
      data-ad-slot={variant}
      data-ad-reserve={variant}
      data-ad-unit={variant}
      style={{ "--ad-ratio": ratio } as React.CSSProperties}
      className={`ad-reserve relative w-full overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] ${
        variant === "result" ? "mx-auto max-w-[340px]" : ""
      } ${className}`}
      aria-label="Sponsored partner"
    >
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={onPartnerClick}
        className="group absolute inset-0 flex flex-col justify-center gap-2 p-3 text-left sm:flex-row sm:items-center sm:gap-4 sm:p-4"
      >
        {videoFrame ? (
          <>
            {/* Poster: a dim two-tone gradient so the white play glyph reads as
                a video surface in both themes, without an image request. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--accent-soft),transparent_60%),linear-gradient(120deg,rgba(0,0,0,0.28),transparent)]"
            />
            <span className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-xs font-medium text-white/90">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              Ad · 0:05
            </span>
            {/* Scrubber along the bottom edge: the one cue that says "video". */}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/15">
              <span className="block h-full w-2/3 animate-pulse bg-[var(--accent)]" />
            </span>

            <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg sm:size-12">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/10" style={{ animationDuration: "2600ms" }} />
              <svg viewBox="0 0 24 24" aria-hidden="true" className="relative ml-0.5 size-5 fill-current">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            </span>

            <span className="relative z-10 min-w-0 flex-1">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
                {copy.eyebrow}
                <StreamBars />
              </span>
              <span className="mt-0.5 block text-sm font-semibold leading-snug text-[var(--text)] sm:text-base">
                {copy.headline}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[var(--text-3)] sm:hidden">
                {copy.body}
              </span>
            </span>

            <span className="btn btn-primary relative z-10 h-9 w-full shrink-0 gap-1.5 rounded-full px-3 text-sm font-semibold sm:h-10 sm:w-auto sm:px-4">
              <span aria-hidden="true">▶</span>
              {copy.cta}
              <Glyph name="arrow-up-right" className="size-3.5" />
            </span>
          </>
        ) : (
          <>
            {/* In-content: a three-part promo card. The two graphic tiles give
                it the density of a display creative instead of a text strip. */}
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              </span>
              <span className="grid size-9 place-items-center rounded-lg border border-[var(--glass-border)] text-[var(--accent-text)]">
                <Glyph name="arrow-up-right" className="size-4" />
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
                  {copy.eyebrow}
                </span>
                <StreamBars />
                <span className="rounded-full border border-[var(--glass-border)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-3)]">
                  New
                </span>
              </span>
              <span className="mt-0.5 block text-sm font-semibold leading-snug text-[var(--text)] sm:text-base">
                {copy.headline}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[var(--text-3)] sm:hidden">
                {copy.body}
              </span>
            </span>

            <span className="btn btn-primary h-9 w-full shrink-0 gap-1.5 rounded-full px-3 text-sm font-semibold sm:h-10 sm:w-auto sm:px-4">
              {copy.cta}
              <Glyph name="arrow-up-right" className="size-3.5" />
            </span>
          </>
        )}
      </a>
    </div>
  );
}
