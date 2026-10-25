/**
 * Monetization engine — Adsterra banners + Monetag Direct Link, live-by-default.
 *
 * Design rules (non-negotiable):
 *   1. The download is NEVER delayed by an ad. Every ad path here is
 *      fire-and-forget and runs *alongside* the click, never before it.
 *   2. Nothing paints over the page. No vignette, no social bar, no overlay:
 *      the only surfaces are in-flow banner slots and the Direct Link tab
 *      opened by a real click. The Monetag `vignette.min.js` and the Adsterra
 *      Social Bar are banned — both previously froze mobile touch input.
 *   3. Capped. One Direct Link tab per 30 seconds, so repeat downloads don't
 *      stack sponsor tabs while a fast user re-downloading a new format
 *      every half-minute still converts — SnapTik's cadence.
 *
 * Every env read below is a static `process.env.NEXT_PUBLIC_*` member
 * expression — Next.js inlines those at build time.
 */

/**
 * Live Adsterra banner tag for this account: `…/22/<key>`.
 * `NEXT_PUBLIC_ADSTERRA_BANNER_TAG_SRC` may override it; include the literal
 * `{key}` token where the zone key belongs.
 */
const ADSTERRA_BANNER_TAG_TEMPLATE =
  process.env.NEXT_PUBLIC_ADSTERRA_BANNER_TAG_SRC?.trim() || "https://bellnewyork.org/22/{key}";

/** Resolve the banner frame URL for a zone key. */
export function adsterraBannerUrl(key: string): string {
  return ADSTERRA_BANNER_TAG_TEMPLATE.includes("{key}")
    ? ADSTERRA_BANNER_TAG_TEMPLATE.replace(/\{key\}/g, encodeURIComponent(key))
    : ADSTERRA_BANNER_TAG_TEMPLATE;
}

/** Adsterra 728×90 leaderboard zone key. `NEXT_PUBLIC_ADSTERRA_BANNER_KEY` wins. */
export const adsterraBannerKey =
  process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY?.trim() || "a907b6525c54481ebdaccb4ed1cac87e";

/**
 * Rectangle (300×250) zone key. Never reuse the leaderboard key: Adsterra
 * binds a key to one size.
 */
export const adsterraRectangleKey =
  process.env.NEXT_PUBLIC_ADSTERRA_RECT_KEY?.trim() || "f0075be743457b9b238d0d701fbd9d8b";

/** Monetag domain-verification token, emitted as `<meta name="monetag">`. */
export const monetagVerification = process.env.NEXT_PUBLIC_MONETAG_META?.trim() || null;

/**
 * HilltopAds Direct Link — used ONLY as the href of an in-page sponsored card
 * (the side rail and the banner fallback), i.e. somewhere the visitor can see
 * what they are clicking. It is deliberately never opened programmatically
 * from the download button: a download click must produce the file and
 * nothing else, or the site reads as adware to users and to trust scanners.
 *
 * `NEXT_PUBLIC_DIRECT_LINK_URL` is the override; the old
 * `NEXT_PUBLIC_MONETAG_SMARTLINK_URL` is ignored so a stale dashboard value
 * can never replace this one.
 */
export const directLinkUrl =
  process.env.NEXT_PUBLIC_DIRECT_LINK_URL?.trim() || "https://idealistic-revenue.com/FtK1df";

/**
 * HilltopAds VAST 3.0 video tag (Zone 7549085).
 *
 * The endpoint only fills when the request carries the site's Referer — a
 * bare curl answers 404, `Referer: https://lamptik.online/` answers the XML.
 * The browser supplies it automatically; when an ad-blocker strips it the
 * gate falls back to its house sponsor card and still counts down.
 */
export const hilltopVastUrl =
  process.env.NEXT_PUBLIC_HILLTOP_VAST_URL?.trim() ||
  "https://faithfuloccasion.com/d/m.FQzwdHGNN_vWZPGnUf/SeVmw9VueZsUSlckLP/TWcu1UNxDgkYwcOnDMUntcNnzmU/0/ObTKAE4xOdQF";

/** sessionStorage counter behind the gate's 10s → 30s step. */
export const VIDEO_GATE_COUNT_KEY = "lamptik_video_count";

/** The first N resolves of a session wait 10s; every one after waits 30s. */
export const VIDEO_GATE_FIRST_RUNS = 3;
export const VIDEO_GATE_SECONDS_FIRST = 10;
export const VIDEO_GATE_SECONDS_REPEAT = 30;

/** Countdown length for the current session video count. */
export function videoGateSeconds(count: number): number {
  return count < VIDEO_GATE_FIRST_RUNS ? VIDEO_GATE_SECONDS_FIRST : VIDEO_GATE_SECONDS_REPEAT;
}

/** Resolved-video count in this tab session (0 when storage is unavailable). */
export function readVideoGateCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = Number(window.sessionStorage.getItem(VIDEO_GATE_COUNT_KEY) ?? 0);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    return 0;
  }
}

/** Count one completed gate. Returns the new count. */
export function bumpVideoGateCount(): number {
  const next = readVideoGateCount() + 1;
  if (typeof window === "undefined") return next;
  try {
    window.sessionStorage.setItem(VIDEO_GATE_COUNT_KEY, String(next));
  } catch {
    // Private mode / quota: the countdown still works for this resolve.
  }
  return next;
}

export const adsConfigured = Boolean(adsterraBannerKey || directLinkUrl);

export type AdFormat = "leaderboard" | "rectangle";

/**
 * Reserved pixel heights per format: they reserve space up-front so a
 * late-loading creative can never push the page down (CLS stays 0).
 */
export const AD_RESERVED: Record<AdFormat, { width: number; height: number; minPx: number }> = {
  leaderboard: { width: 728, height: 90, minPx: 90 },
  rectangle: { width: 300, height: 250, minPx: 250 },
};
