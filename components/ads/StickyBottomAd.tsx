"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import { adsterraBannerKey } from "@/lib/monetization";

const DISMISS_KEY = "sticky_ad_dismissed";

/**
 * Sticky bottom ad bar (Slot E) — anchored at `bottom-0`, above content
 * (`z-40`, below the toast stack), dismissible with a single tap. The
 * dismissal persists for the session so one close is respected everywhere.
 *
 * The leaderboard creative CSS-scales to the viewport, so a 390px phone gets
 * a fitted strip with no horizontal overflow. Renders nothing at all when no
 * banner zone is configured.
 */
export function StickyBottomAd() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      // Lazy initializer runs on the server too — guard the window access.
      if (typeof window === "undefined") return false;
      return window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed || !adsterraBannerKey) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable — the in-memory state still hides the bar.
    }
    setDismissed(true);
  };

  return (
    <div
      role="complementary"
      aria-label="Sponsored"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[var(--bg)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="relative mx-auto w-full max-w-[728px] px-10 py-1.5">
        <AdSlot format="leaderboard" label="Sponsored" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss advertisement"
          className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--field)] text-[var(--text-3)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
