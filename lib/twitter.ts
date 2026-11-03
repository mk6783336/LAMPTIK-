import { AppError } from "@/lib/errors";
import {
  cleanCaption,
  DESKTOP_UA,
  timedFetch,
  withTimeoutSignal,
} from "@/lib/http";
import { isPublicMediaUrl } from "@/lib/security";
import { hostMatches } from "@/lib/url-guard";

/**
 * X (Twitter) extractor.
 *
 * X publishes no anonymous API for post media and its HTML is a JavaScript
 * shell with no stream in it, so the resolvers are the three public JSON
 * mirrors the ecosystem standardised on — tried in this order and each one
 * verified against a live post:
 *
 *   1. fxtwitter (`api.fxtwitter.com/status/{id}`). Richest payload: per
 *      rendition `formats[]` with `bitrate`, `codec` and `container`, plus the
 *      poster, duration and author. This is what gives the page real
 *      "1080p / 720p / 480p" buttons instead of one blind link.
 *   2. vxtwitter (`api.vxtwitter.com/Twitter/status/{id}`). One best MP4 in
 *      `media_extended[].url`, with `duration_millis` and a size object.
 *   3. syndication (`cdn.syndication.twimg.com/tweet-result?id=…&token=x`).
 *      X's own embed payload — no bitrate, but `video.variants[]` carries the
 *      same `video.twimg.com` MP4s. Last resort because it is the least
 *      documented of the three.
 *
 * Every returned URL is checked against the public-https SSRF gate AND a
 * `twimg.com` host check: a mirror is convenient, not authoritative, and a
 * hostile or compromised one must never hand the visitor an arbitrary URL.
 */

export interface TwitterVariant {
  url: string;
  /** Human label: "1080p", "720p", or "MP4" when the resolution is unknown. */
  label: string;
  width: number | null;
  height: number | null;
  bitrate: number | null;
}

export interface TwitterMedia {
  id: string;
  canonicalUrl: string;
  title: string;
  /** Handle without the leading @. */
  author: string;
  /** Display name, when the mirror provides one. */
  nickname: string | null;
  thumbnail: string | null;
  /** Seconds. */
  duration: number;
  isGif: boolean;
  variants: TwitterVariant[];
  /** Which resolver answered — surfaced in server logs, never in the UI copy. */
  provider: "fxtwitter" | "vxtwitter" | "syndication";
}

/** Hosts a user-submitted link may live on (dot-boundary matched). */
const TWITTER_HOST_SUFFIXES = ["x.com", "twitter.com", "twttr.com"] as const;

/** `/user/status/123`, `/i/status/123`, legacy `/statuses/123`. */
const STATUS_PATH = /(?:^|\/)(?:i\/)?status(?:es)?\/(\d{5,25})/i;

/** 8s per mirror: three of them still fit inside the route's budget. */
const MIRROR_TIMEOUT_MS = 8_000;

/** A rendition below this is a preview, not a download. */
const MIN_VARIANT_HEIGHT = 200;

const MP4_ONLY = /\.mp4(?:[?#]|$)/i;

function isTwitterHost(hostname: string): boolean {
  return TWITTER_HOST_SUFFIXES.some((suffix) => hostMatches(hostname, suffix));
}

/** A public https `*.twimg.com` URL, or null. */
function mediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 4_096) return null;
  if (!isPublicMediaUrl(raw)) return null;
  try {
    return hostMatches(new URL(raw).hostname, "twimg.com") ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Resolution of a rendition. Mirrors omit it inconsistently, but the
 * `video.twimg.com` path always encodes it (`/vid/avc1/576x1024/…`), so the
 * URL is the reliable source and the payload is the fallback.
 */
function dimensionsOf(
  url: string,
  width?: unknown,
  height?: unknown,
): { width: number | null; height: number | null } {
  const fromUrl = url.match(/\/vid\/[^/]+\/(\d{2,5})x(\d{2,5})\//i);
  const w = Number(width) || (fromUrl ? Number(fromUrl[1]) : 0);
  const h = Number(height) || (fromUrl ? Number(fromUrl[2]) : 0);
  return {
    width: w > 0 ? w : null,
    height: h > 0 ? h : null,
  };
}

function labelFor(dimensions: { width: number | null; height: number | null }): string {
  const shortEdge = Math.min(dimensions.width ?? 0, dimensions.height ?? 0);
  if (!shortEdge) return "MP4";

  // Vertical video: the *short* edge is the quality tier (1080×1920 → 1080p).
  // Two standard tiers are rounded, everything else is labelled with its real
  // edge rather than snapped to a bucket — X routinely publishes 320×568,
  // 480×852 and 576×1024 for one clip, and bucketing all three to "480p"
  // collapsed them into a single button (the labels are also the de-dupe key).
  if (shortEdge >= 1_000) return "1080p";
  if (shortEdge >= 700) return "720p";
  return `${shortEdge}p`;
}

interface RawVariant {
  url: string;
  width?: unknown;
  height?: unknown;
  bitrate?: unknown;
}

/**
 * Build the download list: MP4 only (X's HLS playlists are not a file the
 * browser can save), de-duplicated, best-first, capped at four buttons.
 */
function buildVariants(raw: RawVariant[]): TwitterVariant[] {
  const seen = new Set<string>();
  const variants: TwitterVariant[] = [];

  for (const candidate of raw) {
    const url = mediaUrl(candidate.url);
    if (!url || !MP4_ONLY.test(url) || seen.has(url)) continue;
    seen.add(url);

    const dimensions = dimensionsOf(url, candidate.width, candidate.height);
    // A 128×128 preview is a thumbnail animation, not the video the visitor
    // asked for.
    const shortEdge = Math.min(dimensions.width ?? 0, dimensions.height ?? 0);
    if (shortEdge && shortEdge < MIN_VARIANT_HEIGHT) continue;

    const bitrate = Number(candidate.bitrate);
    variants.push({
      url,
      label: labelFor(dimensions),
      width: dimensions.width,
      height: dimensions.height,
      bitrate: Number.isFinite(bitrate) && bitrate > 0 ? bitrate : null,
    });
  }

  variants.sort((a, b) => {
    const byBitrate = (b.bitrate ?? 0) - (a.bitrate ?? 0);
    if (byBitrate !== 0) return byBitrate;
    return (b.height ?? 0) - (a.height ?? 0);
  });

  // Two renditions can share a label ("720p" at 30 and 60fps); the extra
  // buttons only add noise, so keep the first of each label.
  const labels = new Set<string>();
  return variants.filter((variant) => {
    if (labels.has(variant.label)) return false;
    labels.add(variant.label);
    return true;
  }).slice(0, 4);
}

/** Extract the post id from any supported X/Twitter URL shape. */
export function parseTwitterUrl(
  raw: string,
): { id: string; canonicalUrl: string } | null {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 2_048) return null;
  const input = raw.trim().startsWith("http://")
    ? raw.trim().replace(/^http:\/\//i, "https://")
    : raw.trim();

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!isTwitterHost(url.hostname)) return null;

  const id = url.pathname.match(STATUS_PATH)?.[1] ?? url.searchParams.get("status")?.match(/^\d{5,25}$/)?.[0] ?? null;
  if (!id) return null;

  return { id, canonicalUrl: `https://x.com/i/status/${id}` };
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await timedFetch(
    url,
    {
      headers: {
        Accept: "application/json",
        Referer: "https://x.com/",
        "User-Agent": DESKTOP_UA,
      },
      cache: "no-store",
      signal,
    },
    MIRROR_TIMEOUT_MS,
  );
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  return response.json().catch(() => null);
}

interface MirrorResult {
  title: string;
  author: string;
  nickname: string | null;
  thumbnail: string | null;
  duration: number;
  isGif: boolean;
  variants: TwitterVariant[];
}

function fromFxTwitter(payload: unknown): MirrorResult | null {
  const tweet = (payload as { tweet?: Record<string, unknown> } | null)?.tweet;
  if (!tweet) return null;

  const media = tweet.media as
    | { videos?: Array<Record<string, unknown>>; photos?: unknown[] }
    | undefined;
  const video = media?.videos?.[0];
  if (!video) return null;

  const formats = Array.isArray(video.formats)
    ? (video.formats as Array<Record<string, unknown>>)
    : [];
  const variants = Array.isArray(video.variants)
    ? (video.variants as Array<Record<string, unknown>>).map((entry) => ({
        url: String(entry.url ?? ""),
        bitrate: entry.bitrate,
      }))
    : [];

  const raw: RawVariant[] = [
    ...formats
      .filter((format) => String(format.container ?? "").includes("mp4"))
      .map((format) => ({
        url: String(format.url ?? ""),
        bitrate: format.bitrate,
      })),
    ...variants,
    { url: String(video.url ?? ""), width: video.width, height: video.height },
  ];

  const built = buildVariants(raw);
  if (built.length === 0) return null;

  const author = tweet.author as { screen_name?: string; name?: string } | undefined;
  return {
    title: cleanCaption(String((tweet.text as string) ?? "")),
    author: author?.screen_name ? String(author.screen_name) : "x",
    nickname: author?.name ? String(author.name) : null,
    thumbnail: mediaUrl(video.thumbnail_url),
    duration: Math.round(Number(video.duration) || 0),
    isGif: String(video.type ?? "") === "gif",
    variants: built,
  };
}

function fromVxTwitter(payload: unknown): MirrorResult | null {
  const data = payload as
    | {
        text?: string;
        user_screen_name?: string;
        user_name?: string;
        media_extended?: Array<Record<string, unknown>>;
      }
    | null;
  if (!data || !Array.isArray(data.media_extended)) return null;

  const entry = data.media_extended.find((item) => {
    const type = String(item.type ?? "");
    return type === "video" || type === "gif";
  });
  if (!entry) return null;

  const size = entry.size as { width?: number; height?: number } | undefined;
  const built = buildVariants([
    { url: String(entry.url ?? ""), width: size?.width, height: size?.height },
  ]);
  if (built.length === 0) return null;

  return {
    title: cleanCaption(String(data.text ?? "")),
    author: data.user_screen_name ? String(data.user_screen_name) : "x",
    nickname: data.user_name ? String(data.user_name) : null,
    thumbnail: mediaUrl(entry.thumbnail_url),
    duration: Math.round((Number(entry.duration_millis) || 0) / 1000),
    isGif: String(entry.type ?? "") === "gif",
    variants: built,
  };
}

function fromSyndication(payload: unknown): MirrorResult | null {
  const data = payload as
    | {
        text?: string;
        user?: { screen_name?: string; name?: string };
        video?: { variants?: Array<Record<string, unknown>>; durationMs?: number };
        mediaDetails?: Array<Record<string, unknown>>;
      }
    | null;
  if (!data || !data.video) return null;

  const variants = Array.isArray(data.video.variants) ? data.video.variants : [];
  const built = buildVariants(
    variants.map((entry) => ({
      url: String(entry.src ?? entry.url ?? ""),
      bitrate: entry.bitrate,
    })),
  );
  if (built.length === 0) return null;

  const poster = Array.isArray(data.mediaDetails) ? data.mediaDetails[0] : undefined;

  return {
    title: cleanCaption(String(data.text ?? "")),
    author: data.user?.screen_name ? String(data.user.screen_name) : "x",
    nickname: data.user?.name ? String(data.user.name) : null,
    thumbnail: mediaUrl(poster?.media_url_https),
    duration: Math.round((Number(data.video.durationMs) || 0) / 1000),
    isGif: false,
    variants: built,
  };
}

/**
 * Resolve an X/Twitter post into downloadable MP4 renditions.
 *
 * Metadata only — no media byte is fetched here. Bounded by a 12s budget that
 * also aborts when the client disconnects.
 */
export async function extractTwitter(
  rawUrl: string,
  externalSignal?: AbortSignal,
): Promise<TwitterMedia> {
  const parsed = parseTwitterUrl(rawUrl);
  if (!parsed) {
    throw new AppError(
      "INVALID_URL",
      "That isn't an X (Twitter) post link.",
      "Paste a link like https://x.com/user/status/1234567890 — the post itself, not a profile.",
    );
  }

  const signal = withTimeoutSignal(externalSignal);
  const id = parsed.id;

  const attempts: Array<{
    provider: TwitterMedia["provider"];
    load: () => Promise<unknown>;
    parse: (payload: unknown) => MirrorResult | null;
  }> = [
    {
      provider: "fxtwitter",
      load: () => fetchJson(`https://api.fxtwitter.com/status/${id}`, signal),
      parse: fromFxTwitter,
    },
    {
      provider: "vxtwitter",
      load: () => fetchJson(`https://api.vxtwitter.com/Twitter/status/${id}`, signal),
      parse: fromVxTwitter,
    },
    {
      provider: "syndication",
      load: () =>
        fetchJson(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=x`, signal),
      parse: fromSyndication,
    },
  ];

  for (const attempt of attempts) {
    if (signal.aborted) break;
    let payload: unknown = null;
    try {
      payload = await attempt.load();
    } catch {
      continue; // mirror down / timed out: next one
    }
    if (!payload) continue;
    const result = attempt.parse(payload);
    if (result) {
      return {
        id,
        canonicalUrl: parsed.canonicalUrl,
        title: result.title || "X video",
        author: result.author,
        nickname: result.nickname && result.nickname !== result.author ? result.nickname : null,
        thumbnail: result.thumbnail,
        duration: result.duration,
        isGif: result.isGif,
        variants: result.variants,
        provider: attempt.provider,
      };
    }
  }

  throw new AppError(
    "VIDEO_NOT_FOUND",
    "No downloadable video was found on that post.",
    "Posts with photos or text only have no video stream — and a protected account's video can't be resolved.",
  );
}
