"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  AD_RESERVED,
  adsterraBannerKey,
  adsterraRectangleKey,
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
  const hasVisibleContent = creativeState !== "pending";

  return (
    <aside
      role="complementary"
      aria-label="Sponsored Advertisement"
      className={cn("w-full", className)}
      data-ad-slot={format}
      data-ad-state={creativeState}
    >
      {/* ONE disclosure pill — always visible, amber, never styled like a
          CTA, and never duplicated inside the creative/fallback card. */}
      <p className="mb-1.5 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/[0.03] px-2.5 py-1 text-xs font-medium text-amber-300/90">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400/80" />
          Sponsored
        </span>
      </p>

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
          height: hasVisibleContent ? scaled.height : 0,
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
            href="https://uplcm.com/4/12078941"
            target="_blank"
            rel="sponsored nofollow noopener"
            aria-label="Sponsored partner offer — opens in a new tab"
            className={cn(
              // Fluid inside the reserved slot (`w-full max-w-full box-border
              // overflow-hidden`): the old fixed-width scaled card was wider
              // than its parent on 390px screens and its right border was
              // clipped. No second "Sponsored" label inside — the pill above
              // is the single disclosure.
              "absolute inset-0 box-border flex w-full max-w-full overflow-hidden rounded-2xl border border-amber-500/25 bg-[linear-gradient(135deg,#12100a_0%,#0d0f14_55%,#090b12_100%)] p-2.5 text-white transition-colors hover:border-amber-400/50 sm:p-4",
              isLeaderboard
                ? "items-center justify-between gap-2 sm:gap-4"
                : "flex-col justify-between gap-3",
            )}
            style={{ backgroundColor: "#07080d", colorScheme: "dark" }}
          >
            <span className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-sm text-amber-300 sm:size-10 sm:text-base"
              >
                ↗
              </span>
              <span
                className={cn(
                  "min-w-0 font-semibold leading-snug text-slate-100",
                  isLeaderboard ? "text-xs sm:text-sm" : "text-sm sm:text-base",
                )}
              >
                Discover Recommended Tools &amp; Offers
              </span>
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 sm:px-3.5 sm:py-2 sm:text-xs",
                !isLeaderboard && "self-start",
              )}
            >
              Visit Sponsor ↗
            </span>
          </a>
        ) : null}
      </div>
    </aside>
  );
}
