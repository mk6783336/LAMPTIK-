import { cacheDelete, cacheGet, cacheSet, runOnce } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { extractFacebook } from "@/lib/facebook";
import { extractInstagram } from "@/lib/instagram";
import { resolveVideo } from "@/lib/tiktok";
import { buildDownloadLinks } from "@/lib/tiktok/links";
import type { VideoCodec, VideoInfo } from "@/lib/tiktok/types";
import { assertInputUrl, detectPlatform, type PlatformType } from "@/lib/url-guard";

export type { PlatformType };

/**
 * Unified payload shape returned by /api/fetch for every platform.
 * `videoHd` / `videoSd` / `audioMp3` are same-origin attachment proxy URLs
 * (`/api/download?…`) — ready to use, expire-proof for the client, and
 * server-validated against the CDN allowlist before any bytes move.
 */
export interface MediaPayload {
  id: string;
  platform: PlatformType;
  title: string;
  author: string;
  authorUrl: string | null;
  thumbnail: string | null;
  duration: number;
  videoHd: string | null;
  videoSd: string | null;
  audioMp3: string | null;
  /** Real byte sizes from the CDN/probe, for honest button labels. */
  videoHdBytes: number | null;
  videoSdBytes: number | null;
  /** Verified codec of the primary stream. */
  videoCodec: VideoCodec;
  canonicalUrl: string;
}

export interface ResolvedMedia {
  /** Consistent cross-platform shape. */
  media: MediaPayload;
  /** Full TikTok-compatible record (synthesized for Instagram/Facebook) so
   *  the existing result UI keeps working unchanged during the transition. */
  video: VideoInfo;
  cached: boolean;
}

/**
 * Resolve-hit cache: 500 users pasting one viral link → one upstream fetch.
 * Three minutes keeps repeat resolves instant while staying inside the
 * lifetime of the platforms' signed CDN URLs.
 */
const MEDIA_TTL_MS = 3 * 60 * 1_000;

/** Map any VideoInfo (real TikTok or synthesized IG/FB) to the unified shape. */
function mediaFromVideo(video: VideoInfo, canonicalUrl: string): MediaPayload {
  const isHd = video.quality === "hd";
  const platform: PlatformType =
    video.source === "instagram" ? "instagram" : video.source === "facebook" ? "facebook" : "tiktok";

  const authorUrl =
    platform === "tiktok"
      ? `https://www.tiktok.com/@${encodeURIComponent(video.author.username)}`
      : platform === "instagram"
        ? `https://www.instagram.com/${encodeURIComponent(video.author.username)}/`
        : null;

  return {
    id: video.id,
    platform,
    title: video.title,
    author: video.author.username,
    authorUrl,
    thumbnail: video.thumbnail || null,
    duration: video.duration,
    videoHd: isHd ? video.downloads.video : null,
    videoSd: isHd ? video.downloads.videoSd : video.downloads.video,
    audioMp3: video.downloads.audio,
    videoHdBytes: isHd ? video.byteSize ?? null : null,
    videoSdBytes: isHd ? video.byteSizeSd ?? null : video.byteSize ?? null,
    videoCodec: video.codec ?? "unknown",
    canonicalUrl,
  };
}

/**
 * TikTok adapter — the EXISTING resolver, untouched. Its rich VideoInfo is
 * the source of truth; the unified media shape is derived from it.
 */
async function resolveTikTokPlatform(
  url: string,
  fresh = false,
): Promise<{ media: MediaPayload; video: VideoInfo }> {
  // The TikTok resolver keeps its own 3-minute cache; a forced refresh must
  // bypass it too, otherwise the "fresh" URL is the same expired stream.
  const { video } = await resolveVideo(url, { fresh });
  return { media: mediaFromVideo(video, url), video };
}

/** Instagram adapter: extractor → same-origin downloads → synthetic VideoInfo. */
async function resolveInstagramPlatform(url: string): Promise<{ media: MediaPayload; video: VideoInfo }> {
  const source = await extractInstagram(url);

  if (source.isPhotoOnly || !source.videoUrl) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "That Instagram post is a photo or carousel — there is no video stream to download.",
      "Video posts, Reels, and IGTV links download normally.",
    );
  }

  const downloads = buildDownloadLinks(
    { video: source.videoUrl, videoSd: null, audio: null },
    { id: source.id, username: source.author, platform: "instagram" },
  );

  const video: VideoInfo = {
    id: source.id,
    title: source.title,
    duration: source.duration,
    thumbnail: source.thumbnail ?? "",
    author: {
      username: source.author,
      nickname: source.author,
      avatar: null,
    },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    quality: "hd",
    noWatermark: true,
    source: "instagram",
    createdAt: null,
    musicTitle: null,
    byteSize: source.byteSize ?? null,
    byteSizeSd: null,
    codec: source.codec ?? "unknown",
    downloads,
  };

  return { media: mediaFromVideo(video, source.canonicalUrl), video };
}

/** Facebook adapter: extractor → same-origin downloads → synthetic VideoInfo. */
async function resolveFacebookPlatform(url: string): Promise<{ media: MediaPayload; video: VideoInfo }> {
  const source = await extractFacebook(url);
  const primary = source.videoHd ?? source.videoSd;

  if (!primary) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Facebook didn't expose a downloadable stream for this video.",
      "Long videos sometimes need a second try — retry in a moment.",
    );
  }

  const downloads = buildDownloadLinks(
    {
      video: primary,
      videoSd: source.videoSd && source.videoSd !== primary ? source.videoSd : null,
      audio: null,
    },
    { id: source.id, username: source.author, platform: "facebook" },
  );

  const video: VideoInfo = {
    id: source.id,
    title: source.title,
    duration: source.duration,
    thumbnail: source.thumbnail ?? "",
    author: {
      username: source.author,
      nickname: source.author,
      avatar: null,
    },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    quality: source.videoHd ? "hd" : "sd",
    noWatermark: true,
    source: "facebook",
    createdAt: null,
    musicTitle: null,
    byteSize: source.videoHdBytes ?? source.videoSdBytes ?? null,
    byteSizeSd: source.videoHd ? source.videoSdBytes ?? null : null,
    codec: source.codec ?? "unknown",
    downloads,
  };

  return { media: mediaFromVideo(video, source.canonicalUrl), video };
}

/**
 * Unified entry point. Validates the input (SSRF guard + platform
 * allowlist), serves from a 3-minute TTL cache keyed by canonical URL, and
 * de-duplicates concurrent resolves of the same link (runOnce) so a viral
 * link hitting 500 times resolves upstream exactly once.
 */
export interface ResolveOptions {
  /**
   * Bypass the cache and re-resolve upstream. Used by the client when a
   * download probe reports an expired/403 CDN URL: the fresh signed URLs are
   * swapped into the result panel and the download retried automatically.
   */
  fresh?: boolean;
}

export async function resolveMedia(
  rawUrl: string,
  signal?: AbortSignal,
  options: ResolveOptions = {},
): Promise<ResolvedMedia> {
  const { url, platform } = assertInputUrl(rawUrl);
  const canonical = url.toString().replace(/\/$/, "");
  const cacheKey = `media:${platform}:${canonical}`;

  if (!options.fresh) {
    const cachedHit = cacheGet<ResolvedMedia>(cacheKey);
    if (cachedHit) return { ...cachedHit, cached: true };
  } else {
    // Drop the stale entry (and any signed URL inside it) before resolving.
    cacheDelete(cacheKey);
  }

  const build = async (): Promise<ResolvedMedia> => {
    let built: { media: MediaPayload; video: VideoInfo };
    switch (platform) {
      case "tiktok":
        built = await resolveTikTokPlatform(canonical, options.fresh);
        break;
      case "instagram":
        built = await resolveInstagramPlatform(canonical);
        break;
      case "facebook":
        built = await resolveFacebookPlatform(canonical);
        break;
    }
    const result: ResolvedMedia = { ...built, cached: false };
    cacheSet(cacheKey, result, MEDIA_TTL_MS);
    return result;
  };

  // A forced refresh must never join an in-flight *stale* resolve.
  const resolved = options.fresh ? await build() : await runOnce(cacheKey, build);

  return { ...resolved, cached: false };
}

export { detectPlatform };
