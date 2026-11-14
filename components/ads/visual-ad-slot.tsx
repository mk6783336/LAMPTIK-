"use client";

import { useEffect, useState } from "react";

import { Glyph } from "@/components/glyph";
import { smartlinkUrl, smartlinkUrl2 } from "@/lib/monetization";
import { claimSmartlink } from "@/lib/smartlink";

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
 *   - the unit never claims to be this site's download. A click opens the
 *     Monetag Smartlink in a new tab; no file exists behind it.
 *
 * The frequency cap applies to the sticky bar and the in-content unit, not to
 * the explicit "Server 02" partner button in the result panel — that one is a
 * deliberate click on a labelled offer, which is the market convention.
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

function hrefFor(primary: boolean): string {
  return primary ? smartlinkUrl : smartlinkUrl2 || smartlinkUrl;
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
  const href = hrefFor(!secondary);
  const [dismissed, setDismissed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [guardVisible, setGuardVisible] = useState(true);

  // The sticky bar remembers a dismissal for the session, not forever: an
  // ad the visitor cannot get rid of is the pattern this site measures itself
  // against, and a permanent hide would silently delete the placement.
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
    // This is also what keeps the site's tap audit green — its first failure
    // was a fixed bar covering a CTA.
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

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem("lamptik:sticky-ad:v1", "hidden");
    } catch {
      // Ignore: dismissal still applies to this render.
    }
  };

  const sponsorClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!claimSmartlink(event)) {
      setNote("Partner link already opened recently. It reopens after four hours.");
    } else {
      setNote(null);
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
            onClick={sponsorClick}
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
        {note ? <p className="mx-auto mt-1 max-w-3xl text-xs text-[var(--text-3)]">{note}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={`panel relative overflow-hidden ${className}`}
      data-ad-unit={variant}
      aria-label="Sponsored partner"
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        {/* Play/download glyph: the visual language of a stream player, at the
            size a 320×100 banner uses, without pretending a file is behind it. */}
        <span className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] sm:size-14">
          <span className="absolute inset-0 animate-pulse rounded-xl bg-[var(--accent)]/10" />
          <svg viewBox="0 0 24 24" aria-hidden="true" className="relative size-6 fill-current sm:size-7">
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            {copy.eyebrow}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-[var(--text)] sm:text-base">
            {copy.headline}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-3)] sm:text-sm">
            {copy.body}
          </p>
        </div>

        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={sponsorClick}
          className="btn btn-primary h-10 shrink-0 gap-1.5 px-3 text-sm font-semibold sm:h-11 sm:px-4"
        >
          {copy.cta}
          <Glyph name="arrow-up-right" className="size-3.5" />
        </a>
      </div>
      {note ? <p className="px-3 pb-3 text-xs text-[var(--text-3)]">{note}</p> : null}
    </div>
  );
}
