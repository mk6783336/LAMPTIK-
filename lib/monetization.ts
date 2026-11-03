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

/**
 * Optional high-CPM direct link shown as a sponsored card under the result
 * panel's download buttons (`NEXT_PUBLIC_SMARTLINK_URL`).
 *
 * Empty by default: without it the card renders nothing and reserves no
 * space, so the panel is unchanged until a link is set in Vercel. It is a
 * real anchor with `rel="sponsored nofollow noopener"` — never a download
 * button: a click opens the partner's offer in a new tab while the file the
 * visitor asked for is already streaming from the button above.
 */
export const smartlinkUrl = process.env.NEXT_PUBLIC_SMARTLINK_URL?.trim() || "";

/** Monetag domain-verification token, emitted as `<meta name="monetag">`. */
export const monetagVerification = process.env.NEXT_PUBLIC_MONETAG_META?.trim() || null;

/**
 * Monetag In-Page Push tag source (`NEXT_PUBLIC_MONETAG_INPAGE_SRC`).
 *
 * Monetag is the one network actually paying this account (≈$1.23 CPM, and
 * $4.52 on its best day, against $0.00 on 447 Adsterra impressions), so its
 * tag belongs on the page rather than leaving the account idle. The mount is
 * env-gated because only the dashboard owner has the tag URL: paste it into
 * Vercel and the script loads on every page; leave it unset and nothing is
 * rendered or reserved.
 *
 * In-Page Push is chosen over the Vignette deliberately. The Vignette paints
 * `position: fixed; inset: 0` and, when its creative hangs, swallows every tap
 * on a phone — the production freeze documented in AGENTS.md. In-Page Push is
 * a small floating card that occupies its own corner and never covers the
 * tool, so it is allowed by the same rule that bans the Vignette.
 */
const MONETAG_INPAGE_RAW = process.env.NEXT_PUBLIC_MONETAG_INPAGE_SRC?.trim() || "";

/**
 * Monetag In-Page Push, parsed into the `<Script src … data-zone …>` pair the
 * tag actually reads.
 *
 * The dashboard hands out an HTML snippet, not a URL:
 *
 *   <script>(function(s){s.dataset.zone='12181860',s.src='https:/nap5k.com/tag.min.js'})…</script>
 *
 * Pasting that into `NEXT_PUBLIC_MONETAG_INPAGE_SRC` is the obvious thing to do,
 * and it used to be catastrophic in a quiet way: the whole snippet became the
 * script's `src`, so every pageview requested
 * `/%3Cscript%3E(function(s)%7B…%3C/script%3E` **from our own origin** and got a
 * 404 — a wasted request on every visit and zero Monetag impressions. Both
 * forms are accepted here (bare URL or snippet) and the zone is extracted from
 * `data-zone` / `dataset.zone`, because the tag ignores everything else.
 */
export const monetagInPage = (() => {
  const raw = MONETAG_INPAGE_RAW;
  if (!raw) return null;
  const zone = raw.match(/(?:data-zone|dataset\.zone)\s*[=:]\s*['"]?(\d{3,})/i)?.[1] ?? "";
  // A snippet may spell the scheme as `https:/` (single slash); the URL parser
  // normalises it, but Next would stringify the raw value into our own path.
  const match = raw.match(/https?:\/{1,2}[^\s'"<>)]+\.js/i) ?? (/^\/\//.test(raw) ? [raw] : null);
  const src = match ? match[0].replace(/^https?:\/*/i, "https://").replace(/^\/\//, "https://") : "";
  if (!src) return null;
  return { src, zone };
})();

/**
 * HilltopAds MultiTag / In-Page Push (`NEXT_PUBLIC_HILLTOP_MULTITAG_SRC`).
 *
 * The account was issued a MultiTag instead of a 300×250 zone, so this is the
 * whole Hilltop banner surface: one loader, mounted once per document, that the
 * network uses to place its own in-page push cards. It is a corner card like
 * Monetag In-Page Push — not the `inset: 0` layer the Vignette painted — which
 * is what keeps it inside the rule that bans viewport-covering scripts.
 *
 * The URL is account-specific and lives in the dashboard, so it is overridable
 * from Vercel without a code change; the issued tag is the default so the
 * placement ships live. Only one push network should normally be configured at
 * a time (see the note in `components/ads/AdScripts.tsx`): two cards in the
 * same corner is a layout and a policy problem, not extra revenue.
 */
export const hilltopMultitagSrc =
  process.env.NEXT_PUBLIC_HILLTOP_MULTITAG_SRC?.trim() ||
  "https://quarrelsomebitter.com/boX.VVsedOGFli0-Y/WGcP/jesmt9KuLZnUglvkNPqTwcJ1/OvTNEXygMtDUU/tLNozZUu5OMqTdINwfOsQB";

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

/**
 * Every placement that can own its own Adsterra zone.
 *
 * One zone is one auction. Five 300×250 slots that all resolve to the same
 * key are five bids on a single impression: the network fills one, blanks the
 * rest, and reads the repeats as duplicate traffic — which is exactly the
 * "pending" state the fill observer kept timing out on. A placement with its
 * own zone auctions in parallel instead of queueing behind the others.
 *
 * Keys are optional. An unset placement falls back to the shared per-format
 * key (the pre-slot behaviour), and AdSlot's per-key stagger still keeps the
 * shared ones out of the same tick, so the site works with one zone or with
 * eleven.
 */
export type AdSlotId =
  | "loader" // resolve console — in flow while the CDN link is prepared
  | "tool-bar" // between the URL field and the result zone
  | "hero" // platform hero column, 300×250 beside the tool
  | "hero-bar" // platform hero column, 728×90 beneath the rectangle
  | "under-tool" // single unit under the downloader card
  | "result-top" // sandwich top: preview header → primary download
  | "theater" // download hand-off theater
  | "result-bottom" // sandwich bottom: under the audio buttons
  | "modal" // post-download dialog
  | "rail-left" // desktop left rail
  | "rail-right" // desktop right rail
  | "article"; // in-page banner on content and guide pages

interface AdSlotZone {
  /**
   * Native size of the placement. An Adsterra key is bound to one size, so
   * this is also the guard that stops a 728×90 zone being requested at
   * 300×250 on the mobile leaderboard→rectangle swap.
   */
  format: AdFormat;
  /** The placement's own zone key, when one is configured. */
  zone?: string;
  /**
   * The 300×250 zone to use when the mobile swap turns this `leaderboard`
   * into a rectangle.
   *
   * Without it the slot falls back to the shared rectangle key — so on a phone
   * every leaderboard placement, the real rectangles and the modal all bid
   * against one zone for one impression. With it, each phone-visible
   * placement has its own auction.
   *
   * Only placements that actually lay out below 640px need one: the desktop
   * rails (`xl`), the platform hero column (`lg`) and its banner are
   * display:none there, and AdSlot does not request a creative for a slot with
   * no layout box.
   */
  mobileZone?: string;
}

/**
 * Placement → zone key. Every read is a static `NEXT_PUBLIC_*` member
 * expression so Next.js inlines them at build time; the values live in Vercel
 * (and `.env.example`), never in this file.
 */
const AD_SLOT_ZONES: Record<AdSlotId, AdSlotZone> = {
  loader: {
    format: "rectangle",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_LOADER?.trim() || undefined,
  },
  "tool-bar": {
    format: "leaderboard",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_TOOL_BAR?.trim() || undefined,
    mobileZone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_TOOL_BAR_MOBILE?.trim() || undefined,
  },
  hero: {
    format: "rectangle",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_HERO?.trim() || undefined,
  },
  "hero-bar": {
    format: "leaderboard",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_HERO_BAR?.trim() || undefined,
  },
  "under-tool": {
    format: "leaderboard",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_UNDER_TOOL?.trim() || undefined,
    mobileZone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_UNDER_TOOL_MOBILE?.trim() || undefined,
  },
  "result-top": {
    format: "rectangle",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_RESULT_TOP?.trim() || undefined,
  },
  theater: {
    format: "rectangle",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_THEATER?.trim() || undefined,
  },
  "result-bottom": {
    format: "rectangle",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_RESULT_BOTTOM?.trim() || undefined,
  },
  modal: {
    format: "rectangle",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_MODAL?.trim() || undefined,
  },
  "rail-left": {
    format: "leaderboard",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_RAIL_LEFT?.trim() || undefined,
  },
  "rail-right": {
    format: "leaderboard",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_RAIL_RIGHT?.trim() || undefined,
  },
  article: {
    format: "leaderboard",
    zone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_ARTICLE?.trim() || undefined,
    mobileZone: process.env.NEXT_PUBLIC_ADSTERRA_ZONE_ARTICLE_MOBILE?.trim() || undefined,
  },
};

/** Native size of a placement — used when `<AdSlot>` is given only a slot. */
export function adSlotFormat(slot: AdSlotId): AdFormat {
  return AD_SLOT_ZONES[slot].format;
}

/**
 * Resolve the zone key for a placement at the size it is actually rendering.
 *
 * A placement's own key is honoured at its native size. The one way it renders
 * at another size is the mobile leaderboard→rectangle swap, and a 728×90 zone
 * asked for 300×250 cannot fill — so that size uses the placement's own
 * `mobileZone` when configured, and the shared rectangle key only as a last
 * resort.
 */
export function adZoneKey(slot: AdSlotId | undefined, format: AdFormat): string {
  if (slot) {
    const entry = AD_SLOT_ZONES[slot];
    if (entry.format === format) {
      if (entry.zone) return entry.zone;
    } else if (format === "rectangle" && entry.mobileZone) {
      return entry.mobileZone;
    }
  }
  return format === "rectangle" ? adsterraRectangleKey : adsterraBannerKey;
}
