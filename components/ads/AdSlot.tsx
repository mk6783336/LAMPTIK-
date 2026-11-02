"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { reportAdOutcome, type AdOutcome } from "@/lib/ad-telemetry";
import { cn } from "@/lib/cn";
import {
  AD_RESERVED,
  adSlotFormat,
  adZoneKey,
  directLinkUrl,
  type AdFormat,
  type AdSlotId,
} from "@/lib/monetization";
interface AdSlotProps {
  /**
   * Which placement this is. It decides the zone key, so two rectangles on
   * one page can auction in separate Adsterra zones instead of bidding five
   * times for one impression (see AD_SLOT_ZONES).
   */
  slot?: AdSlotId;
  /**
   * Hard override of the zone key — beats `slot`. `null` disables the slot
   * deliberately (renders nothing), which `slot` alone can never express.
   */
  zoneId?: string | null;
  /**
   * leaderboard = 728×90 (300×250 on mobile), rectangle = 300×250.
   * Defaults to the placement's native size when `slot` is given.
   */
  format?: AdFormat;
  className?: string;
  /** Accessible label shown when a creative or house banner is visible. */
  label?: string;
  /** Visible disclosure word. Localized pages pass their own ("Anzeige",
   *  "Patrocinado"); English pages keep the default. */
  sponsoredLabel?: string;
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

/**
 * How long a slot waits for a creative before collapsing to the house card.
 *
 * Raised from 8s: on mobile data Adsterra's auction regularly answers after
 * 8–12s, and the old timer was killing live paid impressions mid-flight. The
 * cost is that a genuinely unfilled slot shows its reserved box a little
 * longer before collapsing; the benefit is every late fill that used to be
 * thrown away.
 */
const CREATIVE_TIMEOUT_MS = 20_000;

/**
 * Minimum gap between two slots requesting the SAME zone key.
 *
 * Adsterra rate-limits identical zone calls from one page: four 300×250s fired
 * in the same tick typically return one creative and three blanks. Staggering
 * them gives each request its own auction window instead of one fill and three
 * dead boxes.
 */
const SAME_ZONE_STAGGER_MS = 700;

/** Reserved start time per zone key, so the stagger holds across components. */
const nextStartByKey = new Map<string, number>();

/**
 * Reveal a slot now, or after its turn behind another slot on the same zone.
 * Returns a cancel function for the unmount case.
 */
function scheduleReveal(key: string, reveal: () => void): () => void {
  const now = Date.now();
  const startAt = Math.max(now, (nextStartByKey.get(key) ?? 0) + SAME_ZONE_STAGGER_MS);
  nextStartByKey.set(key, startAt);

  if (startAt <= now) {
    reveal();
    return () => {};
  }
  const timer = window.setTimeout(reveal, startAt - now);
  return () => window.clearTimeout(timer);
}
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
  slot,
  format,
  className,
  label,
  sponsoredLabel = "Sponsored",
  eager,
  refreshKey,
  alwaysReserve,
}: AdSlotProps) {
  // `slot` implies the size; an explicit `format` still wins, so every call
  // site stays literal and a zone-table edit can never silently resize a slot.
  const baseFormat: AdFormat = format ?? (slot ? adSlotFormat(slot) : "leaderboard");

  const [visible, setVisible] = useState(false);
  const reveal = useCallback(() => setVisible(true), []);
  const [scale, setScale] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [creative, setCreative] = useState<{ identity: string; state: "filled" | "fallback" } | null>(
    null,
  );

  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  /** Clock for the in-flight auction; null when no frame is mounted. */
  const attemptRef = useRef<{ startedAt: number; reported: boolean } | null>(null);

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

  const mobileSwap = isMobile && baseFormat === "leaderboard";
  const effectiveFormat: AdFormat = mobileSwap ? "rectangle" : baseFormat;
  const { width, height } = AD_RESERVED[effectiveFormat];
  // Precedence: explicit `zoneId` (null disables) → the placement's own zone
  // at its native size → the shared per-format key.
  const key = (zoneId !== undefined ? (zoneId ?? "") : adZoneKey(slot, effectiveFormat)).trim();
  const slotIdentity = `${key}:${effectiveFormat}`;
  const creativeState = creative?.identity === slotIdentity ? creative.state : "pending";

  /**
   * One attempt, one record. The ref is replaced whenever a new frame is
   * mounted (first reveal, mobile swap, refresh), so a refreshed slot reports
   * every auction instead of only its first, and a late timer from a previous
   * attempt can never report against the new one.
   */
  const reportOutcome = useCallback(
    (outcome: AdOutcome) => {
      const attempt = attemptRef.current;
      if (!attempt || attempt.reported) return;
      attempt.reported = true;
      reportAdOutcome({
        slot,
        zoneKey: key,
        format: effectiveFormat,
        outcome,
        waitedMs: Date.now() - attempt.startedAt,
      });
    },
    [effectiveFormat, key, slot],
  );

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

  // Eager slots load on mount; everything else pre-warms within 900px of the
  // fold. 600px was roughly one phone screen: by the time a reader scrolled to
  // a slot it had only just started its auction, so the creative arrived late,
  // and 900px starts the request while the slot is still one scroll away.
  //
  // Both paths go through `scheduleReveal`, so two slots sharing a zone key
  // never fire in the same tick (see SAME_ZONE_STAGGER_MS).
  useEffect(() => {
    if (!key) return;
    const node = hostRef.current;
    if (!node) return;

    if (eager && typeof window !== "undefined") {
      return scheduleReveal(key, reveal);
    }

    let cancel: (() => void) | null = null;
    const start = () => {
      cancel = scheduleReveal(key, reveal);
    };

    if (typeof window !== "undefined") {
      const rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 900) {
        start();
        return () => cancel?.();
      }
    }

    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => cancel?.();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start();
          observer.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancel?.();
    };
  }, [key, eager, reveal]);

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

  // The auction clock starts when this iframe is committed — that is the
  // moment the request leaves the browser. `reloadToken` is in the deps even
  // though it does not change the URL string: a refresh remounts the frame
  // (new impression), and its clock must start over or the new auction would
  // inherit the previous one's wait time.
  useEffect(() => {
    if (!frameSrc) {
      attemptRef.current = null;
      return;
    }
    attemptRef.current = { startedAt: Date.now(), reported: false };
  }, [frameSrc, reloadToken]);

  // Attached as soon as the zone key is known, deliberately NOT gated on
  // `visible`: a tag that fails to load can error within a millisecond of the
  // iframe being inserted, and a signal posted before this listener exists is
  // lost — the slot would then report `timeout` and read as a dead zone. The
  // frame repeats its signal for the same reason; this is the other half.
  useEffect(() => {
    if (!key) return;

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data as { type?: unknown; key?: unknown };
      if (data.key !== key) return;
      if (data.type === "lamptik-ad-fill") {
        reportOutcome("filled");
        setCreative({ identity: slotIdentity, state: "filled" });
      } else if (data.type === "lamptik-ad-blocked") {
        // The network's tag script errored, so no creative can arrive: that is
        // an ad-blocker, not an empty auction. Collapse now instead of
        // holding a dead box for the full timeout.
        reportOutcome("blocked");
        setCreative({ identity: slotIdentity, state: "fallback" });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [key, slotIdentity, reportOutcome]);

  // Only the deadline belongs to the visible/pending window.
  // CREATIVE_TIMEOUT_MS (20s, was 8s): over mobile data Adsterra's RTB
  // creative often needs more than a few seconds to win the auction and
  // paint. The frame reports its own fill until then; this is only the point
  // where an empty slot stops pretending it might still fill.
  useEffect(() => {
    if (!key || !visible || creativeState !== "pending") return;
    const timeout = window.setTimeout(() => {
      reportOutcome("timeout");
      setCreative({ identity: slotIdentity, state: "fallback" });
    }, CREATIVE_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [key, slotIdentity, visible, creativeState, reportOutcome]);

  if (!key) return null;

  const isLeaderboard = effectiveFormat === "leaderboard";
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
          {sponsoredLabel}
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
                  reportOutcome("filled");
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
              <span className="text-amber-300/90">{sponsoredLabel}</span> · Recommended tools &amp; offers
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
