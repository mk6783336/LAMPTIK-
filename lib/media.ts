import { cacheDelete, cacheGet, cacheSet, runOnce } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { extractFacebook, type FacebookSource } from "@/lib/facebook";
import { extractInstagram, type InstagramSource } from "@/lib/instagram";
import { extractYouTube } from "@/lib/youtube";
import { universalYtdlpHit } from "@/lib/universal-ytdlp";
import { resolveVideo } from "@/lib/tiktok";
import { buildDownloadLinks } from "@/lib/tiktok/links";
import type { VideoCodec, VideoInfo } from "@/lib/tiktok/types";
import { assertInputUrl, detectPlatform, type PlatformType } from "@/lib/url-guard";

export type { PlatformType };

/**
 * Unified payload shape returned by /api/fetch for every platform.
 * `videoDirect` / `audioDirect` are the provider's own public-CDN attachment
 * URLs (SnapTik `Server 01`) that the browser opens straight from its own IP;
 * `videoHd` / `videoSd` / `audioMp3` are same-origin attachment proxy URLs
 * (`/api/download?…`, Server 02) — ready to use, expire-proof for the client,
 * and server-validated against the CDN allowlist before any bytes move.
 */
export interface MediaPayload {
  id: string;
  platform: PlatformType;
  title: string;
  author: string;
  authorUrl: string | null;
  thumbnail: string | null;
  duration: number;
  videoDirect: string | null;
  videoHd: string | null;
  videoSd: string | null;
  audioDirect: string | null;
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
    video.source === "instagram"
      ? "instagram"
      : video.source === "facebook"
        ? "facebook"
        : video.source === "youtube"
          ? "youtube"
          : "tiktok";

  const authorUrl =
    platform === "tiktok"
      ? `https://www.tiktok.com/@${encodeURIComponent(video.author.username)}`
      : platform === "instagram"
        ? `https://www.instagram.com/${encodeURIComponent(video.author.username)}/`
        : platform === "youtube"
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(video.author.username)}`
          : null;

  return {
    id: video.id,
    platform,
    title: video.title,
    author: video.author.username,
    authorUrl,
    thumbnail: video.thumbnail || null,
    duration: video.duration,
    videoDirect: video.downloads.videoDirect,
    videoHd: isHd ? video.downloads.video : null,
    videoSd: isHd ? video.downloads.videoSd : video.downloads.video,
    audioDirect: video.downloads.audioDirect,
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

/**
 * Universal yt-dlp tier (bridge → binary) for Instagram. Same InstagramSource
 * shape the scraper tiers produce, so the adapter below cannot tell which
 * engine answered. `videoDirect` stays null: yt-dlp-signed CDN URLs are
 * locked to the resolving machine's IP, so Server 01 rides the proxy that
 * verifies every hop instead of betting the visitor's browser on a copy.
 */
async function universalInstagramSource(url: string): Promise<InstagramSource> {
  const hit = await universalYtdlpHit(url, "instagram");
  if (!hit.video) {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp exposed no Instagram stream.");
  }
  return {
    id: hit.id || "instagram",
    canonicalUrl: url,
    title: hit.title || "Instagram video",
    author: hit.author || "instagram-user",
    thumbnail: hit.thumbnail,
    duration: hit.duration,
    videoUrl: hit.video,
    byteSize: null,
    codec: "h264",
    isPhotoOnly: false,
  };
}

/** Universal yt-dlp tier for Facebook — same contract shape as above. */
async function universalFacebookSource(url: string): Promise<FacebookSource> {
  const hit = await universalYtdlpHit(url, "facebook");
  if (!hit.video) {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp exposed no Facebook stream.");
  }
  return {
    id: hit.id || "facebook",
    canonicalUrl: url,
    title: hit.title || "Facebook video",
    author: hit.author || "Facebook",
    thumbnail: hit.thumbnail,
    duration: hit.duration,
    videoHd: hit.video,
    videoSd: hit.videoSd,
    videoHdBytes: null,
    videoSdBytes: null,
    codec: "h264",
  };
}

/** Instagram adapter: universal tier → scraper waterfall → synthetic VideoInfo. */
async function resolveInstagramPlatform(url: string): Promise<{ media: MediaPayload; video: VideoInfo }> {
  let source: InstagramSource;
  try {
    source = await universalInstagramSource(url);
  } catch {
    // Universal engine unavailable/down — the proven scraper waterfall is
    // still exactly as fast and complete as before. Zero regression.
    source = await extractInstagram(url);
  }

  if (source.isPhotoOnly || !source.videoUrl) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "That Instagram post is a photo or carousel — there is no video stream to download.",
      "Video posts, Reels, and IGTV links download normally.",
    );
  }

  const downloads = buildDownloadLinks(
    {
      video: source.videoUrl,
      // Instagram's own CDN serves the MP4 inline to the visitor's browser.
      videoDirect: source.videoUrl,
      videoSd: null,
      audio: null,
    },
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

/**
 * YouTube payload builder shared by the resolve route (extract → payload)
 * and the claim route (a client-polled `download_url` → the exact same
 * payload shape). Same-origin download links attach here.
 */
export function assembleYouTubeMedia(
  meta: { id: string; title: string; author: string; duration: number; thumbnail: string | null },
  streams: { video: string | null; videoSd?: string | null; audio: string | null },
): { media: MediaPayload; video: VideoInfo } {
  const primary = streams.video ?? streams.audio;

  if (!primary) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube exposed no downloadable stream for this video right now.",
      "Retry in a moment — mirrors rotate automatically.",
    );
  }

  const downloads = buildDownloadLinks(
    {
      video: streams.video ?? primary,
      // The converter/mirror URL already serves `Content-Disposition: attachment`
      // from its own CDN — open it directly (Server 01); the proxy stays Server 02.
      videoDirect: streams.video,
      videoSd:
        streams.videoSd && streams.videoSd !== (streams.video ?? primary) ? streams.videoSd : null,
      audio: streams.audio,
      audioDirect: streams.audio,
    },
    { id: meta.id, username: meta.author, platform: "youtube" },
  );

  const video: VideoInfo = {
    id: meta.id,
    title: meta.title,
    duration: meta.duration,
    thumbnail: meta.thumbnail ?? "",
    author: {
      username: meta.author,
      nickname: meta.author,
      avatar: null,
    },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    quality: streams.video ? "hd" : "sd",
    noWatermark: true,
    source: "youtube",
    createdAt: null,
    musicTitle: null,
    byteSize: null,
    byteSizeSd: null,
    codec: "h264",
    downloads,
  };

  return { media: mediaFromVideo(video, `https://www.youtube.com/watch?v=${meta.id}`), video };
}

/** YouTube adapter: multi-tier resolver → same-origin downloads. */
async function resolveYouTubePlatform(url: string): Promise<{ media: MediaPayload; video: VideoInfo }> {
  const source = await extractYouTube(url);
  return assembleYouTubeMedia(
    {
      id: source.id,
      title: source.title,
      author: source.author,
      duration: source.duration,
      thumbnail: source.thumbnail,
    },
    source.streams,
  );
}

/** Facebook adapter: universal tier → extractor → same-origin downloads → synthetic VideoInfo. */
async function resolveFacebookPlatform(url: string): Promise<{ media: MediaPayload; video: VideoInfo }> {
  let source: FacebookSource;
  try {
    source = await universalFacebookSource(url);
  } catch {
    source = await extractFacebook(url);
  }
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
      videoDirect: primary,
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
    case "youtube":
      built = await resolveYouTubePlatform(canonical);
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
