"use client";

import { useEffect, useState } from "react";

import { Glyph } from "@/components/glyph";
import { smartlinkUrl, smartlinkUrl2 } from "@/lib/monetization";
import { nextSmartlinkUrl, notePartnerClick } from "@/lib/smartlink";

/**
 * Visual partner placements.
 *
 * A text link under a tool is invisible to a visitor who is used to SnapTik and
 * SaveFrom, so these slots are built like the display units those sites run:
 * a bordered card, a play/download glyph, a headline and a high-contrast CTA.
 * Two rules keep that honest and legal:
 *
 *   - every unit says "Sponsored · Ad" at 12px, and the anchor carries
 *     `rel="sponsored nofollow noopener noreferrer"`;
 *   - the unit never claims to be this site's download. A click opens a
 *     Monetag Smartlink in a new tab; no file exists behind it.
 *
 * Clicks are NEVER capped. The 90-second cooldown in `lib/smartlink.ts` exists
 * to stop an automatic trigger firing twice on one download burst; a visitor
 * pressing a button that says "Partner" is asking for that tab, and suppressing
 * it there is what makes a partner placement worthless.
 *
 * The three in-flow variants are real reserved display boxes: the root carries
 * `data-ad-slot` / `data-ad-reserve` and `--ad-ratio`, so `npm run check:ads`
 * can assert the box never collapses or shifts the page (728×90 leaderboard on
 * desktop, the 300×250 pin below 640px). The sticky bar is deliberately not
 * tagged as a slot: a 56px bar cannot honour the 300×250 mobile pin, and the
 * audit exists for display units, not navigation bars.
 */
export type VisualAdVariant = "under-tool" | "in-content" | "sticky-bottom" | "result";

const COPY = {
  "under-tool": {
    eyebrow: "Sponsored · Ad",
    headline: "Faster mirror, no queue",
    body: "A partner player for the same public link — opens in a new tab.",
    cta: "Open fast stream player",
  },
  "in-content": {
    eyebrow: "Sponsored · Ad",
    headline: "Tired of waiting on one server?",
    body: "The partner tool runs its own pipeline and its own queue.",
    cta: "Try the partner tool",
  },
  "sticky-bottom": {
    eyebrow: "Sponsored · Ad",
    headline: "Partner stream server",
    body: "One tap, new tab.",
    cta: "Open now",
  },
  result: {
    eyebrow: "Sponsored · Ad",
    headline: "Need a second source?",
    body: "Your file above is already downloading. This opens a partner player for the same link.",
    cta: "Open partner player",
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
      <div className="absolute inset-0 flex flex-col items-start justify-center gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        {/* Play/download glyph: the visual language of a stream player, at the
            size a leaderboard uses, without pretending a file is behind it. */}
        <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] sm:size-11">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="relative size-5 fill-current sm:size-6">
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            {copy.eyebrow}
          </p>
          <p className="text-sm font-semibold leading-snug text-[var(--text)] sm:text-base">
            {copy.headline}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-3)] sm:hidden">
            {copy.body}
          </p>
        </div>

        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={onPartnerClick}
          className="btn btn-primary h-9 w-full shrink-0 gap-1.5 px-3 text-sm font-semibold sm:h-10 sm:w-auto sm:px-4"
        >
          {copy.cta}
          <Glyph name="arrow-up-right" className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
