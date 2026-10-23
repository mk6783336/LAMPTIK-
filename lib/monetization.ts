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

/** Monetag Direct Link (a plain https URL, no script). */
export const monetagSmartlinkUrl =
  process.env.NEXT_PUBLIC_MONETAG_SMARTLINK_URL?.trim() || "https://uplcm.com/4/12078941";

export const adsConfigured = Boolean(adsterraBannerKey || monetagSmartlinkUrl);

export type AdFormat = "leaderboard" | "rectangle";

/**
 * Reserved pixel heights per format: they reserve space up-front so a
 * late-loading creative can never push the page down (CLS stays 0).
 */
export const AD_RESERVED: Record<AdFormat, { width: number; height: number; minPx: number }> = {
  leaderboard: { width: 728, height: 90, minPx: 90 },
  rectangle: { width: 300, height: 250, minPx: 250 },
};

/** Session-storage key for the Direct Link cap. */
const DIRECT_LINK_KEY = "lamptik_dl_direct_ts";
/** One Direct Link tab per 30 seconds (repeat downloads stay monetizable). */
const DIRECT_LINK_CAP_MS = 30 * 1_000;

export interface DirectLinkResult {
  triggered: boolean;
  capped?: boolean;
  blocked?: boolean;
}

/**
 * Direct Link fired from a download-button click.
 *
 * MUST be called synchronously inside the click handler — before any `await` —
 * because `window.open` only works while the user activation is still live.
 * The download itself happens on the same click via the anchor's default
 * navigation: the file starts moving while the sponsor tab opens.
 */
export function triggerDownloadDirectLink(): DirectLinkResult {
  if (typeof window === "undefined") return { triggered: false };

  const target = monetagSmartlinkUrl;
  if (!/^https:\/\//i.test(target)) return { triggered: false };

  try {
    const now = Date.now();
    const previous = Number(window.sessionStorage.getItem(DIRECT_LINK_KEY) ?? 0);
    if (Number.isFinite(previous) && previous > 0 && now - previous < DIRECT_LINK_CAP_MS) {
      return { triggered: false, capped: true };
    }
    // Stamp first: a blocked popup must still respect the cap, otherwise
    // every click repeats a blocked attempt.
    window.sessionStorage.setItem(DIRECT_LINK_KEY, String(now));

    const tab = window.open(target, "_blank", "noopener");
    if (tab) return { triggered: true };

    // Popup blocked (or an in-app browser that refuses `window.open`): fall
    // back to a synthetic sponsored anchor click, which some WebViews allow.
    const anchor = document.createElement("a");
    anchor.href = target;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer sponsored";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { triggered: false, blocked: true };
  } catch {
    return { triggered: false, blocked: true };
  }
}
