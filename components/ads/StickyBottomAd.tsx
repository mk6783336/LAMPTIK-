"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { AdSlot } from "@/components/ads/AdSlot";
import { adsterraBannerKey } from "@/lib/monetization";

const DISMISS_KEY = "sticky_ad_dismissed";
const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Sticky bottom ad bar (Slot E) — desktop only.
 *
 * A `position: fixed` bar at the bottom of a phone is a hit-testing trap: it
 * covers whatever sits underneath it, so the last control in the viewport
 * (often the tool CTA) stops responding exactly where a thumb lands, and every
 * scroll around it costs an extra layer. Under 768px the bar therefore never
 * mounts — mobile keeps the inline 90px slot under the tool and the pre-FAQ
 * leaderboard, both of which live in the document flow.
 *
 * The dismissal persists for the session so one close is respected everywhere,
 * and the whole component renders nothing when no banner zone is configured.
 */
export function StickyBottomAd() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setVisible(query.matches);
    sync();
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // Storage unavailable — the in-memory state still hides the bar.
    }
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
    } else {
      query.addListener(sync);
    }
    return () => {
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", sync);
      } else {
        query.removeListener(sync);
      }
    };
  }, []);

  if (!visible || dismissed || !adsterraBannerKey) return null;

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
