import { cacheDelete, cacheGet, cacheSet, runOnce } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { withDownloadLinks } from "@/lib/tiktok/links";
import { parseTikTokUrl, type ParsedTikTokUrl } from "@/lib/tiktok/parse";
import { fetchFromTikTokPage } from "@/lib/tiktok/providers/page";
import { probeOEmbed } from "@/lib/tiktok/providers/oembed";
import { fetchFromTikwm } from "@/lib/tiktok/providers/tikwm";
import { resolveShortLink } from "@/lib/tiktok/resolve";
import type { ExtractedVideo, VideoInfo } from "@/lib/tiktok/types";

/** 3 minutes: signed CDN URLs stay fresh, repeats still resolve in <10ms. */
const CACHE_TTL_MS = 3 * 60 * 1_000;

export interface ResolveResult {
  video: VideoInfo;
  cached: boolean;
}

export interface ResolveVideoOptions {
  /** Bypass the resolver cache so the CDN URLs are freshly signed. */
  fresh?: boolean;
}

export async function resolveVideo(
  rawInput: string,
  options: ResolveVideoOptions = {},
): Promise<ResolveResult> {
  const parsed = parseTikTokUrl(rawInput);

  if (!parsed) {
    throw new AppError(
      "INVALID_URL",
      "That doesn't look like a TikTok video link.",
      "Paste a link like https://www.tiktok.com/@user/video/123… or a vt.tiktok.com short link.",
    );
  }

  if (parsed.isPhoto) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "Photo posts can't be downloaded as video.",
      "Only TikTok video posts are supported.",
    );
  }

  const resolved = await resolveShortLink(parsed);

  if (resolved.isPhoto) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "Photo posts can't be downloaded as video.",
      "Only TikTok video posts are supported.",
    );
  }

  const cacheKey = `video:${resolved.videoId ?? resolved.url}`;

  if (options.fresh) {
    cacheDelete(cacheKey);
  } else {
    const cached = cacheGet<VideoInfo>(cacheKey);
    if (cached) return { video: cached, cached: true };
  }

  const build = async (): Promise<VideoInfo> => {
    const video = await extractVideo(resolved);
    cacheSet(cacheKey, video, CACHE_TTL_MS);
    return video;
  };

  // Never join an in-flight stale resolve during a forced refresh.
  const video = options.fresh ? await build() : await runOnce(cacheKey, build);

  return { video, cached: false };
}

async function extractVideo(parsed: ParsedTikTokUrl): Promise<VideoInfo> {
  let lastError: unknown = null;

  for (const provider of [fetchFromTikwm, fetchFromTikTokPage]) {
    try {
      const extracted = await provider(parsed.url);
      return withDownloadLinks(extracted);
    } catch (error) {
      lastError = error;
      // A private video is definitive; don't retry another provider.
      if (error instanceof AppError && error.code === "VIDEO_PRIVATE") throw error;
    }
  }

  // Both extractors failed. Check TikTok's official oEmbed endpoint to tell
  // "video exists but media is blocked" apart from "video is gone".
  const oembed = await probeOEmbed(parsed.url);

  if (oembed) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "TikTok found this video, but its media CDN is blocking extraction right now.",
      "The link is valid — wait a minute and try again.",
    );
  }

  if (lastError instanceof AppError && lastError.code === "VIDEO_NOT_FOUND") {
    throw new AppError(
      lastError.code,
      lastError.message,
      lastError.hint ?? "Double-check that the video is public and still online.",
    );
  }

  throw new AppError(
    "VIDEO_NOT_FOUND",
    "We couldn't find that TikTok video.",
    "It may be private, deleted, or region-locked. Check the link and try again.",
  );
}

export type { ExtractedVideo, VideoInfo };
