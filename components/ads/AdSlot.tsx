"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  AD_RESERVED,
  adsterraBannerKey,
  adsterraRectangleKey,
  directLinkUrl,
  type AdFormat,
} from "@/lib/monetization";
interface AdSlotProps {
  /** Adsterra zone key. Falls back to NEXT_PUBLIC_ADSTERRA_BANNER_KEY / RECT_KEY. */
  zoneId?: string | null;
  /** leaderboard = 728×90 (300×250 on mobile), rectangle = 300×250. */
  format?: AdFormat;
  className?: string;
  /** Accessible label shown when a creative or house banner is visible. */
  label?: string;
  /** Load immediately with zero IntersectionObserver delay (above-the-fold). */
  eager?: boolean;
  /**
   * Bump to reload the iframe for a fresh paid impression (new video
   * resolved, "Download Another Video" clicked, new download attempt).
   * Throttled to at most one reload per 20 seconds GLOBALLY across every
   * slot on the page — ad networks count rapid same-size re-requests as
   * invalid traffic, so the user's 5th download inside a minute still
   * refreshes the banners, just on the network's clock.
   */
  refreshKey?: number;
  /**
   * Reserve the full creative box from mount (theater / loading console):
   * the slot is visibly on stage at t = 0 while the RTB creative loads
   * behind it, instead of painting 0 pixels until the fill message lands.
   * A dead auction still collapses to the compact sponsor-card fallback.
   */
  alwaysReserve?: boolean;
}

/** Timestamp of the last global ad refresh across all slots on the page. */
const REFRESH_THROTTLE_MS = 20_000;
let lastGlobalAdRefreshAt = 0;
/** First mobile viewport band: 300×250 wins where a 728×90 cannot even fit. */
const MOBILE_RECT_QUERY = "(max-width: 639px)";

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
 * - Mobile revenue swap: under 640px a `leaderboard` slot requests the
 *   high-fill 300×250 rectangle zone at native 1:1 scale instead of
 *   downscaling a 728×90 creative that mobile demand barely fills. The swap
 *   happens at hydration (SSR still reserves the desktop shape; neither
 *   shape paints anything until the creative fills, so the swap costs no
 *   layout shift).
 */
export function AdSlot({
  zoneId,
  format = "leaderboard",
  className,
  label,
  eager,
  refreshKey,
  alwaysReserve,
}: AdSlotProps) {
  const defaultKey = format === "rectangle" ? adsterraRectangleKey : adsterraBannerKey;

  const [visible, setVisible] = useState<boolean>(() => Boolean(eager));
  const [scale, setScale] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [creative, setCreative] = useState<{ identity: string; state: "filled" | "fallback" } | null>(
    null,
  );

  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Mobile rectangle swap — matchMedia only, so SSR and the first paint keep
  // the desktop shape and hydration fixes it with zero flash of content.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOBILE_RECT_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const mobileSwap = isMobile && format === "leaderboard";
  const effectiveFormat: AdFormat = mobileSwap ? "rectangle" : format;
  const { width, height } = AD_RESERVED[effectiveFormat];
  const key = (mobileSwap ? adsterraRectangleKey : (zoneId === undefined ? defaultKey ?? "" : zoneId ?? "")).trim();
  const slotIdentity = `${key}:${effectiveFormat}`;
  const creativeState = creative?.identity === slotIdentity ? creative.state : "pending";

  const prevRefreshRef = useRef<number | undefined>(undefined);

  // Throttled global impression refresh: one reload per slot per 20s, and at
  // most one reload for the WHOLE page per 20s.
  useEffect(() => {
    if (prevRefreshRef.current === refreshKey) return;
    prevRefreshRef.current = refreshKey;

    const schedule = () => {
      const elapsed = Date.now() - lastGlobalAdRefreshAt;
      if (elapsed < REFRESH_THROTTLE_MS) {
        window.setTimeout(schedule, REFRESH_THROTTLE_MS - elapsed);
        return;
      }
      lastGlobalAdRefreshAt = Date.now();
      setCreative(null);
      setReloadToken((token) => token + 1);
    };
    schedule();
    // refreshKey is the only trigger; the ref above dedupes re-renders.
  }, [refreshKey]);

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
    // reloadToken re-keys the iframe for a fresh impression cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible, creativeState, width, height, reloadToken]);

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

  if (!key) return null;

  const isLeaderboard = format === "leaderboard" && !mobileSwap;
  const scaled = { width: width * scale, height: height * scale };
  // alwaysReserve: pending/filled both hold the full creative box so the
  // slot is on stage immediately; fallback collapses to the compact card.
  const reserved = creativeState === "filled" || (alwaysReserve && creativeState === "pending");
  const showSponsoredCaption = creativeState === "filled" || reserved;
  return (
    <aside
      role="complementary"
      aria-label="Sponsored Advertisement"
      className={cn("w-full", className)}
      data-ad-slot={effectiveFormat}
      data-ad-state={creativeState}
    >
      {/* ONE subtle disclosure. A reserved/filled creative gets a tiny
          caption above its frame; the compact fallback bar carries its own
          inline label — so there is never a duplicate "Sponsored" pill
          stacked on top. */}
      {showSponsoredCaption ? (
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-3)]">
          Sponsored
        </p>
      ) : null}

      <div
        ref={hostRef}
        className={cn(
          "relative mx-auto box-border w-full max-w-full overflow-hidden",
          // Border around a live-or-reserved creative; the fallback card
          // carries its own border so there is never a clipped or doubled
          // outline.
          reserved && "rounded-2xl border border-amber-500/15 bg-[#07080d]",
          !isLeaderboard && "max-w-[300px]",
          isLeaderboard && "max-w-[728px]",
        )}
        style={{
          // Reserved (theater/console/loaded): the scaled creative's exact
          // height. Fallback: one compact 56px line (never a giant reserved
          // black box). Pending without reservation: zero.
          height:
            reserved ? scaled.height : creativeState === "fallback" ? 56 : 0,
          backgroundColor: "#07080d",
          colorScheme: "dark",
        }}
      >
        {frameSrc ? (
          <div
            className={cn(
              "shrink-0",
              // Center on both axes: absolute at left-1/2 while pending (the
              // host may be wider than the scaled creative mid-load), and
              // mx-auto once filled — a <1 scale (narrow measured column)
              // must never paint the creative hard-left against a wider
              // reserved dark box (the "lopsided black gap" bug).
              creativeState === "pending"
                ? "absolute left-1/2 top-0 -translate-x-1/2"
                : "relative mx-auto",
            )}
            style={{ width: scaled.width, height: scaled.height, backgroundColor: "#07080d" }}
          >
            <iframe
              key={reloadToken}
              ref={frameRef}
              title={label ?? "Sponsored advertisement"}
              src={frameSrc}
              width={width}
              height={height}
              loading="eager"
              scrolling="no"
              /* Hard anti-hijack lock. Deliberately WITHOUT allow-top-navigation
                 and allow-top-navigation-by-user-activation: no Adsterra
                 creative running in /api/ad-frame may ever move our top frame
                 (window.top.location = … dies at the sandbox boundary).
                 Popups (Direct Link offers) and form posts stay legal. */
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
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
            href={directLinkUrl}
            target="_blank"
            rel="sponsored nofollow noopener"
            aria-label="Sponsored partner offer — opens in a new tab"
            className="absolute inset-x-0 top-0 box-border flex h-14 max-h-[72px] w-full max-w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-amber-500/20 bg-[#0b0c12] px-3 text-white transition-colors hover:border-amber-400/40"
          >
            <span className="min-w-0 truncate text-xs font-medium text-slate-300">
              <span className="text-amber-300/90">Sponsored</span> · Recommended tools &amp; offers
            </span>
            <span className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
              Open ↗
            </span>
          </a>
        ) : null}
      </div>
    </aside>
  );
}
