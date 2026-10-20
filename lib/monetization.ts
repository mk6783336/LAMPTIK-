/**
 * Monetization engine — Adsterra + Monetag, live-by-default.
 *
 * Design rules (non-negotiable):
 *   1. The media download is NEVER delayed by an ad. Every ad path here is
 *      fire-and-forget: no awaits, no promises, no callbacks in the critical
 *      path of `/api/download`.
 *   2. Live by default. Every network has a hardcoded production fallback
 *      below, so the site monetizes on any host even when no env var was
 *      ever configured (Vercel included). `NEXT_PUBLIC_*` still wins when
 *      present, so a second property or a rotated zone needs no code change.
 *   3. Capped. A visitor is monetized at most once per cap window, so
 *      repeat downloads stay fast and the tool stays likeable.
 *
 * Every read below is a static `process.env.NEXT_PUBLIC_*` member expression:
 * Next.js inlines those at build time, and aliasing `process.env` into a
 * variable would break the client bundle.
 */

/**
 * Live Adsterra banner tag for this account: `…/22/<key>`.
 *
 * `NEXT_PUBLIC_ADSTERRA_BANNER_TAG_SRC` may override it; include the literal
 * `{key}` token where the zone key belongs (e.g.
 * `https://host/<zone>/{key}/invoke.js`). Without a token the URL is used
 * verbatim, which is what the network's own dashboard tags do.
 */
export const adsterraBannerTagTemplate =
  process.env.NEXT_PUBLIC_ADSTERRA_BANNER_TAG_SRC?.trim() || "https://bellnewyork.org/22/{key}";

/** Resolve the banner frame URL for a zone key. */
export function adsterraBannerUrl(key: string): string {
  return adsterraBannerTagTemplate.includes("{key}")
    ? adsterraBannerTagTemplate.replace(/\{key\}/g, encodeURIComponent(key))
    : adsterraBannerTagTemplate;
}

/**
 * Adsterra 728×90 leaderboard zone key (live production default).
 * `NEXT_PUBLIC_ADSTERRA_BANNER_KEY` wins when present.
 */
export const DEFAULT_ADSTERRA_BANNER_KEY = "a907b6525c54481ebdaccb4ed1cac87e";

export const adsterraBannerKey =
  process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY?.trim() || DEFAULT_ADSTERRA_BANNER_KEY;

/**
 * Live Adsterra Social Bar tag for this account. It is a *public* client-side
 * identifier (it ships in the bundle either way), so the production URL is
 * the built-in default: ads work on a fresh clone and on a host where the
 * env var was never configured. `NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_SRC` still
 * wins when present, so a second property can point elsewhere.
 */
export const DEFAULT_ADSTERRA_SOCIAL_BAR_SRC =
  "https://bellnewyork.org/14/aa5970551494e27bff8ab691d97650ea";

export const adsterraAccountId =
  process.env.NEXT_PUBLIC_ADSTERRA_ACCOUNT_ID?.trim() || "6135903";

/** Adsterra Social Bar script URL (full URL, account-generated). */
export const adsterraSocialBarSrc =
  process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_SRC?.trim() || DEFAULT_ADSTERRA_SOCIAL_BAR_SRC;

/**
 * Rectangle (300×250) zone key.
 *
 * Deliberately NOT defaulted to the leaderboard key: Adsterra binds a key to
 * one creative size, and asking a 728×90 zone for a 300×250 frame either
 * returns nothing or serves a mismatched creative — the kind of invalid
 * impression that gets a publisher account flagged. Create the rectangle zone
 * in the dashboard, then set NEXT_PUBLIC_ADSTERRA_RECT_KEY here. Until then
 * the slot is mounted and reserves its space, and simply stays empty.
 */
export const adsterraRectangleKey =
  process.env.NEXT_PUBLIC_ADSTERRA_RECT_KEY?.trim() || null;

/**
 * Monetag Vignette zone id (live production default).
 * `NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE` wins when present.
 */
export const DEFAULT_MONETAG_VIGNETTE_ZONE = "12078929";

export const monetagVignetteZone =
  process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE?.trim() || DEFAULT_MONETAG_VIGNETTE_ZONE;

/** Monetag Vignette script host — account-specific, so it is configurable. */
export const monetagVignetteSrc = (
  process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_SRC?.trim() ||
  "https://n6wxm.com/vignette.min.js"
).trim();

/**
 * Monetag domain-verification token. When set, the root layout emits
 * `<meta name="monetag" content="…">` in <head> — the second half of their
 * verification (the first being `/sw.js` at the domain root).
 */
export const monetagVerification =
  process.env.NEXT_PUBLIC_MONETAG_META?.trim() || null;

/**
 * Monetag Direct SmartLink (live production default) — a plain https URL,
 * no script required. `NEXT_PUBLIC_MONETAG_SMARTLINK_URL` wins when present.
 */
export const DEFAULT_MONETAG_SMARTLINK_URL = "https://uplcm.com/4/12078941";

export const monetagSmartlinkUrl =
  process.env.NEXT_PUBLIC_MONETAG_SMARTLINK_URL?.trim() || DEFAULT_MONETAG_SMARTLINK_URL;

/** Session-storage key for the download-click frequency cap. */
export const AD_TRIGGER_KEY = "ad_triggered_ts";

/** 10 minutes between legacy download-click monetizations. */
export const DOWNLOAD_CAP_MS = 10 * 60 * 1_000;

/** Tier-1 / high-RPM geos: shorter caps are tolerated, others stay quiet. */
export const TIER1_GEO = new Set([
  "US", "GB", "CA", "AU", "DE", "FR", "AE", "SA", "KW", "QA",
]);

/** Best-effort client geo: timezone region -> rough Tier-1 heuristic. */
function isTier1Client(): boolean {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const prefix = zone.split("/")[0] ?? "";
    // America/* + Europe/* + Australia/* + Gulf hubs cover the Tier-1 list
    // closely enough for a frequency-cap hint (never for pricing). Zones
    // like Asia/Dubai, Asia/Riyadh, Asia/Qatar, Asia/Kuwait hit via the
    // explicit city check below.
    if (/^(America|Europe|Australia)$/.test(prefix)) return true;
    if (/Dubai|Riyadh|Qatar|Kuwait|London|Toronto|Sydney|Berlin|Paris|New_York|Los_Angeles|Chicago/i.test(zone)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Effective Direct-Link cap: Tier-1 keeps 3 min, elsewhere 10 min. */
export function directLinkCapMs(): number {
  return isTier1Client() ? DIRECT_LINK_CAP_MS : DOWNLOAD_CAP_MS;
}

/** Session-storage key for the in-download Direct Link cap. */
export const AD_DIRECT_LINK_KEY = "ad_direct_link_ts";

/**
 * 3 minutes between in-download Direct Link opens. The progress-panel unit
 * fires while the byte stream is already moving, so the cap is shorter than
 * the legacy post-download one — one tab per download burst, never a stack.
 */
export const DIRECT_LINK_CAP_MS = 3 * 60 * 1_000;

export const adsConfigured = Boolean(
  adsterraBannerKey || adsterraSocialBarSrc || monetagVignetteZone || monetagSmartlinkUrl,
);

export type AdFormat = "leaderboard" | "rectangle";

/**
 * Reserved pixel heights per format. These are the *only* reason the ad
 * containers exist before an ad is served: they reserve space up-front so a
 * late-loading creative can never push the page down (CLS must stay 0).
 */
export const AD_RESERVED: Record<AdFormat, { width: number; height: number; minPx: number }> = {
  leaderboard: { width: 728, height: 90, minPx: 90 },
  rectangle: { width: 300, height: 250, minPx: 250 },
};

/**
 * Screen width under which a 728×90 creative must be scaled down instead of
 * overflowing the viewport. The zone itself only serves 728×90, so requesting
 * a 320×50 unit would return nothing — we scale the real one instead.
 */
export const AD_BREAKPOINT_PX = 740;

export interface MonetizationResult {
  /** True only when a tab was actually opened (or a vignette armed). */
  triggered: boolean;
  /** True when the 10-minute cap swallowed this click. */
  capped?: boolean;
  reason?: "unconfigured" | "blocked" | "capped";
}

/**
 * The download-click revenue trigger.
 *
 * Called synchronously at the very top of the download click handler — before
 * any `await` — so the browser still treats it as user activation (popup
 * blockers reject `window.open` after an async gap). It returns immediately
 * and the caller ignores the result: the MP4 stream starts regardless.
 */
export function triggerDownloadMonetization(): MonetizationResult {
  if (typeof window === "undefined") return { triggered: false, reason: "unconfigured" };

  const target = monetagSmartlinkUrl;
  if (!target || !/^https:\/\//i.test(target)) {
    // No SmartLink configured: nothing to open. A Vignette (when enabled)
    // is armed by AdScripts on its own schedule and needs no call here.
    return { triggered: false, reason: "unconfigured" };
  }

  try {
    const previous = Number(window.sessionStorage.getItem(AD_TRIGGER_KEY) ?? 0);
    const now = Date.now();
    if (Number.isFinite(previous) && previous > 0 && now - previous < DOWNLOAD_CAP_MS) {
      return { triggered: false, capped: true, reason: "capped" };
    }

    // Stamp before opening: if the tab is blocked we still respect the cap
    // for this session instead of hammering the network on every click.
    window.sessionStorage.setItem(AD_TRIGGER_KEY, String(now));

    // An anchor with target=_blank is the documented SmartLink integration
    // and the safest primitive here: if the browser blocks it, nothing
    // happens to the current page. `window.open` is deliberately avoided —
    // some in-app browsers coerce a blocked popup into navigating the very
    // tab the user is downloading from.
    const anchor = document.createElement("a");
    anchor.href = target;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer sponsored";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { triggered: true };
  } catch {
    // Private mode / storage disabled / popup blocked — the download is
    // unaffected, which is the whole point.
    return { triggered: false, reason: "blocked" };
  }
}

/**
 * In-download Direct Link trigger (Monetag SmartLink, 3-minute cap).
 *
 * Call this the moment the MP4 byte stream starts moving — NOT before the
 * download is initiated and NOT after an `await` gap (popup blockers only
 * honor calls inside the user-activation window). The result panel calls it
 * on the first progress tick, when save-to-disk is already underway, so a
 * blocked popup can never cancel the user's file. Returns immediately; the
 * caller ignores the result.
 */
export function triggerDirectLinkMonetization(): MonetizationResult {
  if (typeof window === "undefined") return { triggered: false, reason: "unconfigured" };

  const target = monetagSmartlinkUrl;
  if (!target || !/^https:\/\//i.test(target)) {
    return { triggered: false, reason: "unconfigured" };
  }

  try {
    const previous = Number(window.sessionStorage.getItem(AD_DIRECT_LINK_KEY) ?? 0);
    const now = Date.now();
    const cap = directLinkCapMs();
    if (Number.isFinite(previous) && previous > 0 && now - previous < cap) {
      return { triggered: false, capped: true, reason: "capped" };
    }

    window.sessionStorage.setItem(AD_DIRECT_LINK_KEY, String(now));

    const anchor = document.createElement("a");
    anchor.href = target;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer sponsored";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { triggered: true };
  } catch {
    return { triggered: false, reason: "blocked" };
  }
}
