"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  AD_RESERVED,
  adsterraBannerKey,
  adsterraRectangleKey,
  monetagSmartlinkUrl,
  type AdFormat,
} from "@/lib/monetization";

interface AdSlotProps {
  /** Adsterra zone key. Falls back to NEXT_PUBLIC_ADSTERRA_BANNER_KEY / RECT_KEY. */
  zoneId?: string | null;
  /** leaderboard = 728×90, rectangle = 300×250. */
  format?: AdFormat;
  className?: string;
  /** Accessible label shown when a creative or house banner is visible. */
  label?: string;
  /** Load immediately with zero IntersectionObserver delay (above-the-fold). */
  eager?: boolean;
}

/**
 * CLS-safe, zero-white-flash Adsterra slot with an explicit sponsorship
 * disclosure.
 *
 * - Every unit renders inside `role="complementary"` carrying ONE visible
 *   `Sponsored` pill, so a visitor can always tell advertising from site
 *   functionality (never a duplicate badge inside the card itself).
 * - `#07080d` background + `colorScheme: 'dark'` on the frame and container:
 *   no white flash while the RTB creative loads.
 * - Slots pre-warm 600px before entering the viewport; the first
 *   above-the-fold slot takes `eager` and loads with zero delay.
 */
export function AdSlot({ zoneId, format = "leaderboard", className, label, eager }: AdSlotProps) {
  const defaultKey = format === "rectangle" ? adsterraRectangleKey : adsterraBannerKey;
  const key = (zoneId === undefined ? defaultKey ?? "" : zoneId ?? "").trim();
  const { width, height } = AD_RESERVED[format];
  const slotIdentity = `${key}:${format}`;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => Boolean(eager));
  const [scale, setScale] = useState(1);
  const [creative, setCreative] = useState<{ identity: string; state: "filled" | "fallback" } | null>(null);
  const creativeState = creative?.identity === slotIdentity ? creative.state : "pending";

  // Eager slots load now; everything else pre-warms within 600px of the fold.
  useEffect(() => {
    if (!key || eager) return;
    const node = hostRef.current;
    if (!node) return;

    if (typeof window !== "undefined") {
      const rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 600) {
        setVisible(true);
        return;
      }
    }

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
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [key, eager]);

  // Scale the fixed creative to the available width.
  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const apply = (available: number) => {
      if (available <= 0) return;
      setScale(Math.min(1, Math.max(0.3, available / width)));
    };

    apply(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  const frameSrc = useMemo(() => {
    if (!key || !visible || creativeState === "fallback") return "";
    const params = new URLSearchParams({ key, w: String(width), h: String(height) });
    return `/api/ad-frame?${params.toString()}`;
  }, [key, visible, creativeState, width, height]);

  useEffect(() => {
    if (!key || !visible || creativeState !== "pending") return;

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data as { type?: unknown; key?: unknown };
      if (data.type === "lamptik-ad-fill" && data.key === key) {
        setCreative({ identity: slotIdentity, state: "filled" });
      }
    };

    window.addEventListener("message", onMessage);
    // 8s (was 4s): over mobile data Adsterra's RTB creative often needs more
    // than a few seconds to win the auction and paint — falling back early
    // was throwing away live paid impressions.
    const timeout = window.setTimeout(() => setCreative({ identity: slotIdentity, state: "fallback" }), 8_000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
    };
  }, [key, slotIdentity, visible, creativeState]);

  // Unconfigured == no ad, no disclosure, no reserved space, no request.
  if (!key) return null;

  const isLeaderboard = format === "leaderboard";
  const scaled = { width: width * scale, height: height * scale };

  return (
    <aside
      role="complementary"
      aria-label="Sponsored Advertisement"
      className={cn("w-full", className)}
      data-ad-slot={format}
      data-ad-state={creativeState}
    >
      {/* ONE subtle disclosure. A filled creative gets a tiny caption above
          its frame; the compact fallback bar carries its own inline label —
          so there is never a duplicate "Sponsored" pill stacked on top. */}
      {creativeState === "filled" ? (
        <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-3)]">
          Sponsored
        </p>
      ) : null}

      <div
        ref={hostRef}
        className={cn(
          "relative mx-auto box-border w-full max-w-full overflow-hidden",
          // Border only around a live creative; the fallback card carries its
          // own border so there is never a clipped or doubled outline.
          creativeState === "filled" && "rounded-2xl border border-amber-500/15 bg-[#07080d]",
          !isLeaderboard && "max-w-[300px]",
          isLeaderboard && "max-w-[728px]",
        )}
        style={{
          // Filled: the scaled creative's exact height. Fallback: one compact
          // 56px line (never a giant reserved black box). Pending: zero.
          height:
            creativeState === "filled" ? scaled.height : creativeState === "fallback" ? 56 : 0,
          backgroundColor: "#07080d",
          colorScheme: "dark",
        }}
      >
        {frameSrc ? (
          <div
            className={cn("shrink-0", creativeState === "pending" ? "absolute left-1/2 top-0 -translate-x-1/2" : "relative")}
            style={{ width: scaled.width, height: scaled.height, backgroundColor: "#07080d" }}
          >
            <iframe
              ref={frameRef}
              title={label ?? "Sponsored advertisement"}
              src={frameSrc}
              width={width}
              height={height}
              loading="eager"
              scrolling="no"
              onLoad={() => {
                const creativeFrame = frameRef.current?.contentDocument?.querySelector("iframe");
                if (
                  creativeFrame?.getAttribute("width") === String(width) &&
                  creativeFrame.getAttribute("height") === String(height)
                ) {
                  setCreative({ identity: slotIdentity, state: "filled" });
                }
              }}
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute left-0 top-0 border-0 bg-[#07080d]"
              style={{
                width,
                height,
                backgroundColor: "#07080d",
                colorScheme: "dark",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        ) : creativeState === "fallback" ? (
          <a
            href={monetagSmartlinkUrl}
            target="_blank"
            rel="sponsored nofollow noopener"
            aria-label="Sponsored partner offer — opens in a new tab"
            className="absolute inset-x-0 top-0 box-border flex h-14 max-h-[72px] w-full max-w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-amber-500/20 bg-[#0b0c12] px-3 text-white transition-colors hover:border-amber-400/40"
          >
            <span className="min-w-0 truncate text-xs font-medium text-slate-300">
              <span className="text-amber-300/90">Sponsored</span> · Recommended tools &amp;
              offers
            </span>
            <span className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
              Open ↗
            </span>
          </a>
        ) : null}
      </div>
    </aside>
  );
}
