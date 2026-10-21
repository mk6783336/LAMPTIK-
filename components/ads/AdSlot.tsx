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

/** Track whether the first ad slot on the current page view has claimed eager load. */
let firstSlotClaimed = false;

/**
 * CLS-safe, zero-white-flash Adsterra slot.
 *
 * - Uses `#07080d` dark background and `colorScheme: 'dark'` on the iframe and
 *   container so mobile browsers never flash white while ads load.
 * - Pre-warms slots 600px before they enter the viewport (`rootMargin: '600px 0px'`),
 *   and loads the first above-the-fold slot immediately with zero delay.
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

  // Load the first above-the-fold slot immediately with zero delay, and
  // pre-load subsequent slots 600px before they scroll into view.
  useEffect(() => {
    if (!key) return;
    if (eager || !firstSlotClaimed) {
      firstSlotClaimed = true;
      setVisible(true);
      return;
    }
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
    const timeout = window.setTimeout(() => setCreative({ identity: slotIdentity, state: "fallback" }), 3_200);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
    };
  }, [key, slotIdentity, visible, creativeState]);

  if (!key) return null;

  const isLeaderboard = format === "leaderboard";
  const scaled = { width: width * scale, height: height * scale };
  const hasVisibleContent = creativeState !== "pending";

  return (
    <aside
      aria-label={label ?? "Advertisement"}
      className={cn("w-full", className)}
      data-ad-slot={format}
      data-ad-state={creativeState}
    >
      {hasVisibleContent ? (
        <p className="micro mb-1.5 text-center text-[9px] text-[var(--text-3)]/70">Advertisement</p>
      ) : null}
      <div
        ref={hostRef}
        className={cn(
          "relative mx-auto w-full max-w-[728px] overflow-hidden",
          hasVisibleContent && "rounded-[16px] border border-white/[0.07] bg-[#07080d]",
          !isLeaderboard && "max-w-[300px]",
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
              title={label ?? "Advertisement"}
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
            aria-label="Sponsored: High-Speed Unlimited HD Video Stream Server"
            className={cn(
              "absolute left-0 top-0 flex overflow-hidden rounded-[15px] border border-cyan-300/20 bg-[radial-gradient(ellipse_at_top_left,_rgba(8,145,178,0.24),_transparent_55%),linear-gradient(135deg,#08121f_0%,#111827_52%,#090b12_100%)] p-4 text-white shadow-[0_18px_48px_-24px_rgba(34,211,238,0.4)] transition-colors hover:border-cyan-200/50",
              isLeaderboard ? "items-center justify-between gap-4" : "flex-col justify-between gap-5",
            )}
            style={{
              width,
              height,
              backgroundColor: "#07080d",
              colorScheme: "dark",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-xl text-cyan-200">
                ⚡
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">Sponsored</span>
                <span className={cn("mt-1 block font-semibold leading-snug", isLeaderboard ? "text-[15px]" : "text-[17px]")}>
                  High-Speed Unlimited HD Video Stream Server
                </span>
              </span>
            </span>
            <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-950", !isLeaderboard && "self-start")}>
              Explore server
            </span>
          </a>
        ) : null}
      </div>
    </aside>
  );
}
