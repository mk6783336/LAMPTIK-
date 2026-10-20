import { AppError } from "@/lib/errors";
import {
  cleanCaption,
  DEFAULT_TIMEOUT_MS,
  DESKTOP_UA,
  timedFetch,
  withTimeoutSignal,
} from "@/lib/http";
import { selectUniversalMp4 } from "@/lib/mp4";
import type { VideoCodec } from "@/lib/tiktok/types";

/**
 * Instagram extractor with a 3-tier waterfall fallback, modeled on proven
 * open-source architectures (btch-downloader / instagram-url-direct /
 * snapsave parser patterns):
 *
 *   Tier 1 — /p/{code}/embed/captioned/  (public embed HTML; most reliable
 *            from serverless IPs, works without login)
 *   Tier 2 — public post JSON (`/?__a=1&__d=dis`) with X-IG-App-ID headers
 *   Tier 3 — OpenGraph meta tags (og:video / og:image) on the post page
 *
 * Every tier is isolated: a throw in one falls through to the next, and all
 * network work is bounded by an abort timeout (12s metadata budget) that
 * also honors a client-disconnect signal.
 */

const HTML_HEADERS: Record<string, string> = {
  "User-Agent": DESKTOP_UA,
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

const JSON_HEADERS: Record<string, string> = {
  ...HTML_HEADERS,
  Accept: "application/json, text/plain, */*",
  // Instagram's public web/mobile client ids used by every proven extractor.
  "X-IG-App-ID": "936619743392459",
};

export interface InstagramSource {
  id: string;
  canonicalUrl: string;
  title: string;
  author: string;
  thumbnail: string | null;
  duration: number;
  /** Raw signed CDN MP4 (highest available variant). */
  videoUrl: string | null;
  /** Every progressive MP4 candidate, best first (DASH excluded). */
  videoCandidates?: string[];
  /** Size of the chosen stream, from the MP4 probe. */
  byteSize?: number | null;
  /** Verified codec of the chosen stream. */
  codec?: VideoCodec;
  /** True when the post is an image/carousel with no video stream. */
  isPhotoOnly: boolean;
  /** Strong evidence of a login-gated post (evaluated after all tiers). */
  privateSignal?: boolean;
}

interface ShortcodeTarget {
  shortcode: string;
  canonicalUrl: string;
}

/**
 * Accepts instagram.com/reel(s)/p/tv, mobile-app /share/reel|p/ links, and
 * legacy instagr.am permalinks; returns the shortcode + canonical URL.
 */
export function parseInstagramUrl(raw: string): ShortcodeTarget | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "");
  const match =
    path.match(/^\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,})/i) ??
    path.match(/^\/share\/(?:reels?|p)\/([A-Za-z0-9_-]{5,})/i);
  if (!match) return null;
  const shortcode = match[1];
  return {
    shortcode,
    canonicalUrl: `https://www.instagram.com/p/${shortcode}/`,
  };
}

/** Decode `\\u0026`-style unicode escapes and escaped slashes/quotes. */
function decodeEscapes(input: string): string {
  return input
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

function isHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/^["']|["']$/g, "");
  return /^https:\/\//.test(cleaned) ? cleaned : null;
}

/**
 * DASH manifests/segments are video-only in most Instagram payloads — they
 * download fine but play as a silent, frozen stream in mobile galleries.
 */
function isDashLikeUrl(url: string): boolean {
  return /\.m4s(?:[?#]|$)|dash_manifest|dash_info|bytestart=|byteend=|\/dash\/|manifest\.mpd/i.test(
    url,
  );
}

/**
 * Slice a JSON array out of loosely-embedded page text by bracket matching.
 * Lets us read `video_versions` (width + progressive MP4) even when the
 * surrounding HTML is not valid JSON.
 */
function extractArraySlice(source: string, key: string, maxLength = 24_000): string | null {
  const keyIndex = source.indexOf(`"${key}"`);
  if (keyIndex < 0) return null;
  const start = source.indexOf("[", keyIndex);
  if (start < 0 || start - keyIndex > 200) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < Math.min(source.length, start + maxLength); index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return null;
}

/**
 * Progressive `video_versions` entries, highest resolution first. These are
 * the same MP4s the Instagram app stores locally (H.264 + AAC).
 */
function videoVersionCandidates(decoded: string): string[] {
  const slice = extractArraySlice(decoded, "video_versions");
  if (!slice) return [];

  const entries: Array<{ url: string; width: number }> = [];
  const pattern = /"url"\s*:\s*"(https:[^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(slice)) !== null) {
    const url = isHttpUrl(match[1]);
    if (!url || isDashLikeUrl(url)) continue;

    const before = slice.slice(Math.max(0, match.index - 320), match.index);
    const widths = [...before.matchAll(/"width"\s*:\s*(\d{2,5})/g)];
    const width = Number(widths.at(-1)?.[1] ?? 0);
    entries.push({ url, width });
  }

  return entries.sort((a, b) => b.width - a.width).map((entry) => entry.url);
}

/** All URLs captured by a global regex, de-duplicated and DASH-free. */
function collectMediaUrls(source: string, pattern: RegExp): string[] {
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const url = isHttpUrl(match[1]);
    if (url && !isDashLikeUrl(url)) urls.push(url);
    if (urls.length > 40) break;
  }
  return urls;
}

/** Bounded recursive search for the first video URL in a JSON payload. */
function deepFind(node: unknown, depth = 0): string | null {
  if (depth > 8 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const entry of node.slice(0, 4)) {
      const found = deepFind(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = node as Record<string, unknown>;
  for (const key of ["video_url", "url", "src"]) {
    const value = record[key];
    if (
      typeof value === "string" &&
      /^https:\/\/.+\.mp4/i.test(value) &&
      !isDashLikeUrl(value)
    ) {
      return value;
    }
  }
  for (const [key, value] of Object.entries(record)) {
    // Never descend into DASH manifests/representations: their MP4s are
    // video-only and produce silent, stuttering downloads.
    if (/dash_(?:info|manifest)|video_dash/i.test(key)) continue;
    const found = deepFind(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function deepFindString(node: unknown, keys: string[], depth = 0): string | null {
  if (depth > 8 || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const entry of node.slice(0, 6)) {
      const found = deepFindString(entry, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = node as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  for (const value of Object.values(record)) {
    const found = deepFindString(value, keys, depth + 1);
    if (found) return found;
  }
  return null;
}

function metaContent(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Strong login-gate markers ONLY. Instagram's HTML embeds an internal route
 * table containing `/login.php` etc. on every page — matching those made
 * public posts look private, so we require explicit login-wall signals.
 */
function looksLikeLoginWall(html: string): boolean {
  return /"require_login"\s*:\s*true|Log in to (?:continue|view)|You must be logged in|This account is private|Login • Instagram|login_wall/i.test(
    html,
  );
}

/** Shared video/HTML extraction used by tiers 1 and 3. */
function extractFromHtml(html: string): {
  videoUrl: string | null;
  videoCandidates: string[];
  duration: number;
  thumbnail: string | null;
  title: string | null;
  author: string | null;
} {
  const decoded = decodeEscapes(html);

  // `video_versions` first (highest resolution), then the legacy single
  // `video_url`, the <video> tag, and finally OpenGraph.
  const candidates = [
    ...videoVersionCandidates(decoded),
    ...collectMediaUrls(decoded, /"video_url"\s*:\s*"(https:\/\/[^"]+)"/g),
    ...collectMediaUrls(decoded, /video_url=?(https?[^"'\s&]+)/g),
    ...collectMediaUrls(decoded, /<video[^>]+src="(https:\/\/[^"]+)"/g),
    ...collectMediaUrls(
      decoded,
      /property=["']og:video(?::secure_url)?["']\s+content=["'](https:\/\/[^"']+)["']/gi,
    ),
    ...collectMediaUrls(
      decoded,
      /content=["'](https:\/\/[^"']+)["']\s+property=["']og:video(?::secure_url)?["']/gi,
    ),
  ].filter((url): url is string => Boolean(url));

  const videoCandidates = [...new Set(candidates)].map((url) =>
    url.startsWith("http://") ? url.replace(/^http:/, "https:") : url,
  );
  const videoUrl = videoCandidates[0] ?? null;
  const durationMatch = decoded.match(/"video_duration"\s*:\s*([\d.]+)/);
  const duration = durationMatch ? Math.round(Number(durationMatch[1]) || 0) : 0;

  const thumbnail = isHttpUrl(
    metaContent(decoded, [
      /property=["']og:image(?::secure_url)?["']\s+content=["'](https:\/\/[^"]+)["']/i,
      /content=["'](https:\/\/[^"]+)["']\s+property=["']og:image["']/i,
      /"display_url"\s*:\s*"(https:\/\/[^"]+)"/,
      /"thumbnail_src"\s*:\s*"(https:\/\/[^"]+)"/,
      /<video[^>]+poster="(https:\/\/[^"]+)"/,
    ]),
  );

  const title = metaContent(decoded, [
    /property=["']og:description["']\s+content=["']([^"']{1,600})["']/i,
    /<title[^>]*>([^<]{1,300})<\/title>/i,
  ]);

  const author =
    metaContent(decoded, [
      /"username"\s*:\s*"([A-Za-z0-9._]{1,60})"/,
      /https:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,60})\/?"/,
      /<meta[^>]+name=["']author["']\s+content=["']([^"']{1,80})["']/i,
    ]) ?? null;

  return { videoUrl, videoCandidates, duration, thumbnail, title, author };
}

async function fetchHtml(target: string, signal: AbortSignal, timeoutMs: number): Promise<string> {
  const response = await timedFetch(
    target,
    { headers: HTML_HEADERS, cache: "no-store", redirect: "manual", signal },
    timeoutMs,
  );
  if (response.status === 404) {
    await response.body?.cancel();
    throw new AppError(
      "VIDEO_NOT_FOUND",
      "That Instagram post doesn't exist.",
      "The link may be mistyped or the post was removed.",
    );
  }
  // Never follow redirects: challenge/login landings would otherwise be
  // parsed, and their og:image would masquerade as the post's photo.
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    await response.body?.cancel();
    if (/challenge|checkpoint/i.test(location)) {
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Instagram is challenging requests from this network.",
        "Wait a minute and try again.",
      );
    }
    if (/accounts\/login/i.test(location)) {
      // Instagram 302s the *public embed* to /accounts/login when the calling
      // IP is rate-limited (`is_from_rle`) — the exact same redirect a private
      // post produces. Claiming “this post is private” there was a lie that
      // made public reels look broken, so report it as a temporary upstream
      // gate and let the waterfall (and the user's retry) continue.
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Instagram is asking for a login from this network.",
        "This happens on public posts when Instagram rate-limits a server — wait a minute and try again.",
      );
    }
    throw new AppError("PROVIDER_UNAVAILABLE", "Instagram redirected the request unexpectedly.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError("PROVIDER_UNAVAILABLE", "Instagram returned an unexpected response.");
  }
  return response.text();
}

/** Tier 1: public embed page — no login, no GraphQL tokens. */
async function tierEmbed(target: ShortcodeTarget, signal: AbortSignal): Promise<InstagramSource> {
  const html = await fetchHtml(
    `https://www.instagram.com/p/${target.shortcode}/embed/captioned/`,
    signal,
    12_000,
  );
  const { videoUrl, videoCandidates, duration, thumbnail, title, author } = extractFromHtml(html);
  if (!videoUrl && !thumbnail) {
    // Empty media shell: keep the waterfall alive for tiers 2 and 3 — this
    // is the common case for datacenter IPs, not proof of a private post.
    if (looksLikeLoginWall(html)) {
      throw new AppError("VIDEO_PRIVATE", "This Instagram post is private.");
    }
    throw new AppError("PROVIDER_UNAVAILABLE", "Embed payload had no media.");
  }
  return {
    id: target.shortcode,
    canonicalUrl: target.canonicalUrl,
    title: cleanCaption(title ?? "") || "Instagram video",
    author: author ?? "instagram",
    thumbnail,
    duration,
    videoUrl,
    videoCandidates,
    isPhotoOnly: !videoUrl && Boolean(thumbnail),
    privateSignal: !videoUrl && looksLikeLoginWall(html),
  };
}

/** Tier 2: public post JSON with X-IG-App-ID. */
async function tierJson(target: ShortcodeTarget, signal: AbortSignal): Promise<InstagramSource> {
  const response = await timedFetch(
    `https://www.instagram.com/p/${target.shortcode}/?__a=1&__d=dis`,
    { headers: JSON_HEADERS, cache: "no-store", redirect: "follow", signal },
    12_000,
  );

  if (response.status === 404) {
    await response.body?.cancel();
    // `?__a=1` 404s universally nowadays (endpoint deprecation) — never
    // treat this as evidence the post itself is gone. Continue the waterfall.
    throw new AppError("PROVIDER_UNAVAILABLE", "Instagram JSON endpoint unavailable.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError("PROVIDER_UNAVAILABLE", "Instagram JSON endpoint refused the request.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "Instagram JSON payload was unreadable.");
  }

  const videoUrl = isHttpUrl(deepFind(payload, 0));
  const thumbnail = isHttpUrl(
    deepFindString(payload, ["display_url", "thumbnail_src", "thumbnail_url"]),
  );
  const username = deepFindString(payload, ["username", "unique_id"]);
  const caption = deepFindString(payload, ["caption", "text", "title"]);
  const durationRaw = deepFindString(payload, ["video_duration"]);

  if (!videoUrl && !thumbnail) {
    throw new AppError("PROVIDER_UNAVAILABLE", "No media in the post JSON.");
  }

  return {
    id: target.shortcode,
    canonicalUrl: target.canonicalUrl,
    title: cleanCaption(caption ?? "") || "Instagram video",
    author: username ?? "instagram",
    thumbnail,
    duration: durationRaw ? Math.round(Number(durationRaw) || 0) : 0,
    videoUrl,
    videoCandidates: videoUrl ? [videoUrl] : [],
    isPhotoOnly: !videoUrl && Boolean(thumbnail),
  };
}

/** Tier 3: OpenGraph meta tags on the public post page. */
async function tierOpenGraph(target: ShortcodeTarget, signal: AbortSignal): Promise<InstagramSource> {
  const html = await fetchHtml(target.canonicalUrl, signal, 12_000);
  const { videoUrl, videoCandidates, duration, thumbnail, title, author } = extractFromHtml(html);

  if (!videoUrl && !thumbnail) {
    if (looksLikeLoginWall(html)) {
      throw new AppError("VIDEO_PRIVATE", "This Instagram post is private.");
    }
    throw new AppError("PROVIDER_UNAVAILABLE", "No OpenGraph media found for this post.");
  }

  return {
    id: target.shortcode,
    canonicalUrl: target.canonicalUrl,
    title: cleanCaption(title ?? "") || "Instagram video",
    author: author ?? "instagram",
    thumbnail,
    duration,
    videoUrl,
    videoCandidates,
    isPhotoOnly: !videoUrl && Boolean(thumbnail),
  };
}

/**
 * Resolve an Instagram reel/post/tv URL through all three tiers with a hard
 * 12-second metadata budget and client-disconnect propagation.
 */
export async function extractInstagram(
  rawUrl: string,
  externalSignal?: AbortSignal,
): Promise<InstagramSource> {
  const target = parseInstagramUrl(rawUrl);
  if (!target) {
    throw new AppError(
      "INVALID_URL",
      "That isn't an Instagram post link.",
      "Supported: instagram.com/reel/…, /reels/…, /p/…, /tv/…, /share/… and instagr.am links.",
    );
  }

  const signal = withTimeoutSignal(externalSignal, DEFAULT_TIMEOUT_MS);
  const tiers: Array<(t: ShortcodeTarget, s: AbortSignal) => Promise<InstagramSource>> = [
    tierEmbed,
    tierJson,
    tierOpenGraph,
  ];

  let photoFallback: InstagramSource | null = null;
  let sawPrivate = false;
  let lastError: unknown = null;

  for (let index = 0; index < tiers.length; index += 1) {
    if (signal.aborted) break;
    try {
      const result = await tiers[index](target, signal);
      // First tier that finds an actual video stream wins — but only after
      // the candidates are checked for H.264 + audio (DASH video-only MP4s
      // and HEVC renditions are skipped).
      if (result.videoUrl) {
        const candidates =
          result.videoCandidates && result.videoCandidates.length > 0
            ? result.videoCandidates
            : [result.videoUrl];
        const choice = await selectUniversalMp4(candidates, {
          cacheKeyPrefix: `ig:${target.shortcode}:t${index}`,
          referer: "https://www.instagram.com/",
          signal,
          maxProbes: 2,
        });
        return {
          ...result,
          videoUrl: choice?.url ?? result.videoUrl,
          videoCandidates: candidates,
          byteSize: choice?.byteSize ?? null,
          codec: choice?.codec ?? "unknown",
        };
      }
      if (result.privateSignal) sawPrivate = true;
      if (result.thumbnail && !photoFallback) photoFallback = result;
    } catch (error) {
      lastError = error;
      if (error instanceof AppError && error.code === "VIDEO_PRIVATE") {
        sawPrivate = true;
        continue;
      }
      // The embed endpoint is the canonical existence check: a 404 there
      // means the post is genuinely gone. Lower-tier failures just continue.
      if (
        error instanceof AppError &&
        error.code === "VIDEO_NOT_FOUND" &&
        index === 0
      ) {
        throw error;
      }
    }
  }

  // Evaluate signals AFTER every tier had a chance to find a stream.
  if (photoFallback) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "That Instagram post is a photo or carousel — there is no video stream to download.",
      "Video posts, Reels, and IGTV links download normally.",
    );
  }
  if (sawPrivate) {
    throw new AppError(
      "VIDEO_PRIVATE",
      "This Instagram post is private.",
      "Only public posts can be resolved — ask the creator to make it public.",
    );
  }

  if (lastError instanceof AppError) {
    throw lastError.code === "UPSTREAM_ERROR"
      ? new AppError(
          "PROVIDER_UNAVAILABLE",
          "Instagram is blocking requests right now.",
          "Wait a moment and try the link again.",
        )
      : lastError;
  }

  throw new AppError(
    "PROVIDER_UNAVAILABLE",
    "Couldn't extract this Instagram video.",
    "Instagram changes its markup often — retry in a minute.",
  );
}
