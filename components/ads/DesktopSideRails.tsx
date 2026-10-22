"use client";

import { Zap } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { adsterraBannerKey, monetagSmartlinkUrl } from "@/lib/monetization";

/**
 * Desktop side rails — fills the empty left/right margins on wide screens.
 *
 * The content shell caps at 72rem (1152px), so below ~1500px viewports there
 * is no wasted space to fill: the rail collapses to a 40px sticky tab that
 * fits inside the real margin and can never cover content. From 2xl up it
 * grows to a full 160px rail with the scaled leaderboard banner on top and a
 * SmartLink card beneath — zero wasted space on wide monitors.
 *
 * Fixed at `left-4` / `right-4`, `top-28`, below the sticky header. Hidden
 * under `xl` where there are no margins at all.
 */
function Rail({ side }: { side: "left" | "right" }) {
  return (
    <aside
      aria-label={`Sponsored rail (${side})`}
      className={`fixed top-28 z-30 hidden w-10 flex-col items-stretch gap-3 2xl:w-40 xl:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      {/* Full banner: only where the rail is wide enough for a readable
          creative. AdSlot CSS-scales the 728x90 frame to the rail width. */}
      <div className="hidden min-[1500px]:block">
        <AdSlot format="leaderboard" label={`Sponsored rail ${side}`} />
      </div>

      {/* SmartLink card: fills the rail at any width. */}
      <a
        href={monetagSmartlinkUrl}
        target="_blank"
        rel="sponsored nofollow noopener"
        title="Sponsored: bonus high-speed offer"
        className="group flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] px-1.5 py-3 text-center backdrop-blur-sm transition-colors duration-200 hover:border-[var(--glass-border-hover)] 2xl:px-2.5"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform duration-200 group-hover:scale-110">
          <Zap className="size-3.5" fill="currentColor" strokeWidth={0} />
        </span>
        <span className="hidden text-xs font-semibold leading-tight tracking-tight 2xl:block">
          High-speed mirror
        </span>
        <span className="hidden text-xs leading-snug text-[var(--text-3)] 2xl:block">
          Bonus offer from our download partner
        </span>
      </a>
    </aside>
  );
}

export function DesktopSideRails() {
  // Unconfigured banner key: AdSlot would render nothing, so skip the rails
  // entirely rather than shipping empty fixed chrome.
  if (!adsterraBannerKey && !monetagSmartlinkUrl) return null;
  return (
    <>
      <Rail side="left" />
      <Rail side="right" />
    </>
  );
}
