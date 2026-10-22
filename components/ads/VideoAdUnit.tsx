"use client";

import { AdSlot } from "@/components/ads/AdSlot";

/**
 * One inline sponsor slot.
 *
 * This used to be a three-card pile: an outstream "video" canvas with its own
 * `Sponsored video` badge, a 300×250 rectangle and a 728×90 leaderboard, each
 * with its own dark fallback card. With an ad-blocker active (the production
 * screenshot) none of them filled, so three identical black boxes stacked
 * under the tool and pushed the footer into a blurred mess.
 *
 * A single AdSlot is the whole unit now: one creative when the exchange fills,
 * one ultra-compact sponsor line when it does not. No canvas, no second
 * disclosure badge, no stacked fallbacks.
 */
export function VideoAdUnit() {
  return <AdSlot format="leaderboard" label="Sponsored" />;
}
