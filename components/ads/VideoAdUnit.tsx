"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Play, VolumeX } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import {
  adsterraBannerKey,
  adsterraRectangleKey,
  monetagSmartlinkUrl,
  videoAdMp4Url,
} from "@/lib/monetization";

/**
 * Outstream video sponsor unit + paired Adsterra 300x250 and 728x90 slots.
 *
 * Disclosure first: the whole unit is `role="complementary"` and carries the
 * visible `AD · SPONSORED PARTNER` pill, so nothing here can be mistaken for
 * a LAMP TIK feature. The creative itself is an auto-playing muted loop
 * (video when configured, otherwise a 60fps canvas stream) whose only action
 * is a clearly labelled sponsor link.
 *
 * On mobile (< 640px) the native 300x250 rectangle is ordered first — it
 * fills faster and pays a higher mobile RPM than a scaled leaderboard.
 */
export function VideoAdUnit() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (videoAdMp4Url) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#07080d";
      ctx.fillRect(0, 0, w, h);

      const cx = w * (0.5 + 0.28 * Math.sin(t * 1.1));
      const cy = h * (0.5 + 0.22 * Math.cos(t * 0.9));
      const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.65);
      grad.addColorStop(0, "rgba(251, 191, 36, 0.18)");
      grad.addColorStop(0.5, "rgba(99, 102, 241, 0.16)");
      grad.addColorStop(1, "rgba(7, 8, 13, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const bars = 28;
      const barW = Math.max(4, Math.floor((w - 80) / bars) - 4);
      for (let i = 0; i < bars; i++) {
        const phase = t * 3.4 + i * 0.45;
        const amp = 0.25 + 0.65 * Math.abs(Math.sin(phase) * Math.cos(phase * 0.5));
        const bh = Math.max(8, amp * (h * 0.52));
        const bx = 40 + i * (barW + 4);
        const by = h - bh - 18;
        ctx.fillStyle = i % 2 === 0 ? "rgba(251, 191, 36, 0.34)" : "rgba(129, 140, 248, 0.34)";
        ctx.beginPath();
        ctx.roundRect(bx, by, barW, bh, 3);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <section
      role="complementary"
      aria-label="Sponsored Advertisement"
      className="w-full space-y-4"
      style={{ colorScheme: "dark" }}
    >
      {/* Disclosure pill shared by the video creative and both ad frames. */}
      <p className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/[0.03] px-2.5 py-1 text-xs font-medium text-amber-300/90">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400/80" />
          AD · SPONSORED PARTNER
        </span>
      </p>

      <div className="grid items-stretch gap-4 sm:grid-cols-[minmax(0,1fr)_320px]">
        {/* Rectangle is declared first in DOM order on phones so it paints
            before the canvas creative. */}
        <div className="order-first flex items-center justify-center rounded-2xl border border-amber-500/15 bg-[#07080d] p-2 sm:order-last">
          <AdSlot format="rectangle" zoneId={adsterraRectangleKey} eager label="Sponsored 300x250" />
        </div>

        {/* Outstream sponsored video creative. */}
        <a
          href={monetagSmartlinkUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          aria-label="Sponsored partner offer — opens in a new tab"
          className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/25 bg-[#07080d] p-5 text-white transition-colors duration-200 hover:border-amber-400/50"
          style={{ backgroundColor: "#07080d", colorScheme: "dark" }}
        >
          {videoAdMp4Url ? (
            <video
              src={videoAdMp4Url}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={560}
              height={260}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
            />
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/60 to-transparent"
          />

          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-[#07080d]/85 px-2.5 py-1 text-xs font-medium text-amber-300/90">
              Sponsored video
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#07080d]/80 px-2.5 py-1 text-xs font-medium text-white/60">
              <VolumeX className="size-3" />
              Muted
            </span>
          </div>

          <div className="relative z-10 my-3 flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 transition-transform duration-200 group-hover:scale-105">
              <Play className="size-4 translate-x-0.5" fill="currentColor" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-snug tracking-tight text-white">
                Sponsored partner · Discover Recommended Tools &amp; Offers
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                Advertising keeps LAMP TIK&apos;s download servers free. Opens the partner site in a new tab.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-xs text-slate-400">uplcm.com · Verified sponsor</span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-200 transition-transform duration-200 group-hover:translate-x-0.5">
              Visit Sponsor
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </a>
      </div>

      <AdSlot format="leaderboard" zoneId={adsterraBannerKey} label="Sponsored 728x90" />
    </section>
  );
}
