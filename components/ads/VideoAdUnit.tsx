"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Play, Sparkles, VolumeX } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import {
  adsterraBannerKey,
  adsterraRectangleKey,
  monetagSmartlinkUrl,
  videoAdMp4Url,
} from "@/lib/monetization";

/**
 * High-RPM Outstream Video Ad Player + Paired Adsterra 300x250 & 728x90 Unit.
 *
 * - Plays an auto-playing (muted, loop, playsInline) HTML5 video or
 *   60fps hardware-accelerated canvas stream with an instant click-through
 *   overlay to the Monetag Direct Link (`https://uplcm.com/4/12078941`).
 * - Pairs with live Adsterra `300x250` (`f0075be743457b9b238d0d701fbd9d8b`)
 *   and `728x90` (`a907b6525c54481ebdaccb4ed1cac87e`) units.
 * - On mobile (`< 640px`), prioritizes the native `300x250` rectangle first
 *   alongside the `728x90` unit because `300x250` fills faster and pays higher
 *   mobile RPM without shrinking.
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

      // Animated neon wave bars & glowing orb
      const cx = w * (0.5 + 0.28 * Math.sin(t * 1.1));
      const cy = h * (0.5 + 0.22 * Math.cos(t * 0.9));
      const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.65);
      grad.addColorStop(0, "rgba(34, 211, 238, 0.38)");
      grad.addColorStop(0.5, "rgba(99, 102, 241, 0.22)");
      grad.addColorStop(1, "rgba(7, 8, 13, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Equalizer / high-speed stream bars
      const bars = 28;
      const barW = Math.max(4, Math.floor((w - 80) / bars) - 4);
      for (let i = 0; i < bars; i++) {
        const phase = t * 3.4 + i * 0.45;
        const amp = 0.25 + 0.65 * Math.abs(Math.sin(phase) * Math.cos(phase * 0.5));
        const bh = Math.max(8, amp * (h * 0.52));
        const bx = 40 + i * (barW + 4);
        const by = h - bh - 18;
        ctx.fillStyle = i % 2 === 0 ? "rgba(34, 211, 238, 0.55)" : "rgba(129, 140, 248, 0.5)";
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
      aria-label="Sponsored Video & Partner Units"
      className="w-full space-y-4"
      style={{ colorScheme: "dark" }}
    >
      {/* Mobile-first 300x250 + Outstream Video Ad Grid */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Outstream Sponsored Video Ad Banner */}
        <a
          href={monetagSmartlinkUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          aria-label="Sponsored Video: Ultra-Fast Cloud HD Video Stream & Media Saver"
          className="group relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[18px] border border-cyan-400/25 bg-[#07080d] p-5 text-white shadow-[0_20px_50px_-24px_rgba(34,211,238,0.4)] transition-colors duration-200 hover:border-cyan-300/60"
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
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={560}
              height={260}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-85"
            />
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/55 to-transparent"
          />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-[#07080d]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <Sparkles className="size-3" />
              Sponsored Video · HD
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#07080d]/80 px-2.5 py-1 text-[10px] font-medium text-white/75">
              <VolumeX className="size-3" />
              Auto-Play
            </span>
          </div>

          {/* Center Play Pulse */}
          <div className="relative z-10 my-3 flex items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-cyan-300/40 bg-cyan-400/20 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.45)] transition-transform duration-200 group-hover:scale-110">
              <Play className="size-5 translate-x-0.5" fill="currentColor" />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-bold leading-snug tracking-tight text-white sm:text-[18px]">
                High-Speed 4K &amp; 1080p Cloud Stream Accelerator
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">
                Unlock instant high-speed media downloads &amp; ad-supported cloud servers — tap to launch partner offer.
              </p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-[11px] text-slate-400">
              uplcm.com · Verified Sponsor
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-4 py-1.5 text-[12px] font-bold text-slate-950 transition-transform duration-200 group-hover:translate-x-0.5">
              Watch &amp; Continue
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </a>

        {/* Native 300x250 Rectangle (Prioritized on mobile <640px for fast fill & high RPM) */}
        <div className="flex items-center justify-center rounded-[18px] border border-white/[0.07] bg-[#07080d] p-2">
          <AdSlot
            format="rectangle"
            zoneId={adsterraRectangleKey}
            eager
            label="Sponsored 300x250"
          />
        </div>
      </div>

      {/* Paired 728x90 Leaderboard Unit */}
      <AdSlot
        format="leaderboard"
        zoneId={adsterraBannerKey}
        label="Sponsored 728x90"
      />
    </section>
  );
}
