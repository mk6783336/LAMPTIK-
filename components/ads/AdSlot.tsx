"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { AD_RESERVED, adsterraBannerKey, type AdFormat } from "@/lib/monetization";

interface AdSlotProps {
  /** Adsterra zone key. Falls back to NEXT_PUBLIC_ADSTERRA_BANNER_KEY. */
  zoneId?: string | null;
  /** leaderboard = 728×90, rectangle = 300×250. */
  format?: AdFormat;
  className?: string;
  /** Accessible label; also what a visitor sees while nothing is served. */
  label?: string;
}

/**
 * CLS-safe Adsterra slot.
 *
 * Three problems this solves, in order of how badly they break a page:
 *
 *  1. **Layout shift** — the box paints with the creative's exact height
 *     (`min-h-[90px]` / `min-h-[250px]`) on first render, so a late ad can
 *     never push content down.
 *  2. **Global collision** — Adsterra's tag writes `window.atOptions` before
 *     requesting its frame. Two slots on one page would fight over that
 *     global, and a client-side route change could leave a stale one behind.
 *     Each creative therefore runs in its own `srcdoc` iframe: its own
 *     window, its own `document.write`, zero leakage either way.
 *  3. **Mobile overflow** — the zone only serves 728×90. Under 740px the
 *     frame is CSS-scaled to fit (`transform: scale`) inside an
 *     `overflow-hidden` wrapper, so there is never horizontal scroll and
 *     never a squashed request the network can't fill.
 *
 * The tag itself is deferred behind an IntersectionObserver, so it costs
 * nothing during LCP and nothing at all until the slot is near the viewport.
 */
export function AdSlot({ zoneId, format = "leaderboard", className, label }: AdSlotProps) {
  // `undefined` means "use the configured leaderboard zone"; an explicit
  // `null`/"" means "this slot has no zone yet" — it keeps its reserved space
  // and stays empty rather than requesting a wrong-size creative.
  const key = (zoneId === undefined ? adsterraBannerKey ?? "" : zoneId ?? "").trim();
  const { width, height, minPx } = AD_RESERVED[format];

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(1);

  // Lazy: no network until the slot is within 200px of the viewport.
  useEffect(() => {
    if (!key) return;
    const node = hostRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [key]);

  // Scale the fixed creative to the available width. ResizeObserver (not a
  // media query) because the slot's own width is what matters — it sits in a
  // max-width shell, not the viewport edge.
  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const apply = (available: number) => {
      const next = Math.min(1, Math.max(0.3, available / width));
      setScale(next);
    };

    apply(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  // The creative is served from our own route rather than `srcdoc`: a srcdoc
  // iframe inherits THIS document's CSP, and Adsterra's loader needs eval plus
  // its creative CDNs. A real URL gets its own policy headers, so the page a
  // visitor browses stays strict while the ad can still run.
  // See app/api/ad-frame/route.ts.
  const frameSrc = useMemo(() => {
    if (!key || !visible) return "";
    const params = new URLSearchParams({ key, w: String(width), h: String(height) });
    return `/api/ad-frame?${params.toString()}`;
  }, [key, visible, width, height]);

  // Unconfigured == no ad, no reserved space, no request.
  if (!key) return null;

  const isLeaderboard = format === "leaderboard";
  const scaled = { width: width * scale, height: height * scale };

  return (
    <aside aria-label={label ?? "Advertisement"} className={cn("w-full", className)} data-ad-slot={format}>
      <p className="micro mb-1.5 text-center text-[9px] text-[var(--text-3)]/70">Advertisement</p>
      <div
        ref={hostRef}
        className={cn(
          "relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-[16px]",
          "border border-white/[0.07] bg-white/[0.015] backdrop-blur-sm",
          isLeaderboard ? "min-h-[90px] max-w-[728px]" : "min-h-[250px] max-w-[300px]",
        )}
        style={{ minHeight: minPx }}
      >
        {frameSrc ? (
          // Wrapper carries the *scaled* footprint so the flex parent centres
          // it correctly and nothing overflows on a 390px phone.
          <div
            className="relative shrink-0"
            style={{ width: scaled.width, height: scaled.height }}
          >
            <iframe
              title={label ?? "Advertisement"}
              src={frameSrc}
              width={width}
              height={height}
              loading="lazy"
              scrolling="no"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              className="absolute left-0 top-0 border-0"
              style={{
                width,
                height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        ) : (
          <span className="micro text-[9px] text-[var(--text-3)]/50">Ad space</span>
        )}
      </div>
    </aside>
  );
}
