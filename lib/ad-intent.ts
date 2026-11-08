import { trackEvent } from "@/lib/analytics";

/**
 * Post-intent ad unlock — one signal per pageview.
 *
 * The push networks (Monetag In-Page Push, HilltopAds MultiTag) deliberately do
 * NOT load on page load any more: the creative they serve is a fake OS
 * notification, which is social engineering and the likely cause of the mobile
 * bounce rate. They load the first time a visitor does something only a real
 * user of a tool does — resolves a link, edits the calculator, loads a frame,
 * copies a caption, or reads a third of a guide.
 *
 * This unlocks two things that are easy to conflate:
 *
 *  - the ad tags, via the `lamptik:intent` document event that
 *    `components/ads/AdScripts.tsx` listens for once;
 *  - the GA4 (`ad_intent_armed`) measurement of WHEN that happened, so the
 *    gating's effect on impressions per session is a number, not a guess.
 *
 * Deliberately idempotent: the first trigger wins and later ones are no-ops, so
 * a scroll handler cannot flood either the tag injection or the event stream.
 * Every call site fires this from a user gesture or from state that only exists
 * after one, never from mount.
 */
let armed = false;

export function signalAdIntent(trigger: string): void {
  if (typeof window === "undefined" || armed) return;
  armed = true;

  try {
    document.dispatchEvent(new CustomEvent("lamptik:intent", { detail: { trigger } }));
  } catch {
    // Very old browser: the push networks simply stay unarmed.
  }

  trackEvent("ad_intent_armed", {
    trigger,
    page: window.location.pathname,
  });
}
