import { AppError } from "@/lib/errors";
import {
  asRecord,
  asString,
  cleanCaption,
  timedFetch,
  toAbsoluteUrl,
  toCount,
  toDuration,
} from "@/lib/http";
import { probeMp4 } from "@/lib/mp4";
import type { ExtractedVideo, VideoCodec, VideoQuality } from "@/lib/tiktok/types";

const API_URL = "https://www.tikwm.com/api/";

interface TikwmPayload {
  code?: number;
  msg?: string;
  data?: Record<string, unknown>;
}

function mapProviderError(message: string): AppError {
  const normalized = message.toLowerCase();

  if (normalized.includes("private")) {
    return new AppError(
      "VIDEO_PRIVATE",
      "This TikTok video is private.",
      "Ask the creator to make it public, then try again.",
    );
  }

  if (
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("failed")
  ) {
    return new AppError(
      "VIDEO_NOT_FOUND",
      "We couldn't find that TikTok video.",
      "Check that the link opens in TikTok — it may have been deleted.",
    );
  }

  return new AppError(
    "PROVIDER_UNAVAILABLE",
    "The resolver couldn't fetch this video right now.",
    "Please try again in a few seconds.",
  );
}

/**
 * TikWM returns TikTok's own signed CDN URLs with watermarked and clean
 * variants. `hdplay` is the high-bitrate, watermark-free MP4; `play` is the
 * standard clean MP4; `music` is the extracted audio (audio/mpeg).
 */
export async function fetchFromTikwm(url: string): Promise<ExtractedVideo> {
  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("hd", "1");

  let response: Response;
  try {
    response = await timedFetch(
      endpoint,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      },
      15_000,
    );
  } catch {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The TikTok resolver is unreachable right now.",
      "Give it a few seconds and try again.",
    );
  }

  if (!response.ok) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The TikTok resolver returned an unexpected response.",
      "Please try again shortly.",
    );
  }

  let payload: TikwmPayload;
  try {
    payload = (await response.json()) as TikwmPayload;
  } catch {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The TikTok resolver returned an unreadable response.",
      "Please try again shortly.",
    );
  }

  if (payload.code !== 0 || !payload.data) {
    throw mapProviderError(payload.msg ?? "");
  }

  const data = payload.data;
  const id = String(data.id ?? Date.now());
  // `play` is TikTok's no-watermark progressive H.264 stream (720p-class) and
  // is universally playable; `hdplay` is the higher-bitrate rendition, which
  // *may* be HEVC on some uploads. `wmplay` is intentionally NOT a fallback:
  // serving it would silently break the "no watermark" promise.
  const standardStream = toAbsoluteUrl(data.play);
  const hdStream = toAbsoluteUrl(data.hdplay);

  if (!standardStream && !hdStream) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "TikTok didn't expose a downloadable stream for this video.",
      "Try the link again in a minute.",
    );
  }

  const standardSize = toCount(data.size) || null;
  const hdSize = toCount(data.hd_size) || null;

  // Verify the HD rendition before offering it. An HEVC/hvc1 or video-only
  // `hdplay` freezes in Android galleries and WhatsApp, so the universal
  // `play` stream becomes the primary instead.
  const hdVerdict =
    hdStream && hdStream !== standardStream
      ? await probeMp4(hdStream, {
          cacheKey: `tikwm:${id}:hd`,
          referer: hdStream.includes("tikwm.com")
            ? "https://www.tikwm.com/"
            : "https://www.tiktok.com/",
          timeoutMs: 6_000,
        })
      : null;

  const hdIsUniversal =
    Boolean(hdVerdict?.reachable) &&
    hdVerdict?.codec === "h264" &&
    hdVerdict?.hasAudio !== false;

  let videoStream: string;
  let videoSd: string | null;
  let quality: VideoQuality;
  let byteSize: number | null;
  let byteSizeSd: number | null;
  let codec: VideoCodec;

  if (hdStream && hdIsUniversal) {
    videoStream = hdStream;
    videoSd = standardStream && standardStream !== hdStream ? standardStream : null;
    quality = "hd";
    byteSize = hdVerdict?.byteSize ?? hdSize ?? standardSize;
    byteSizeSd = videoSd ? standardSize : null;
    codec = "h264";
  } else {
    // `play` is TikTok's own H.264 fallback. When only `hdplay` exists we have
    // no choice but to return it (never silently drop the video).
    videoStream = standardStream ?? hdStream!;
    videoSd = null;
    quality = standardStream ? "hd" : "sd";
    byteSize = standardStream ? standardSize ?? hdSize : hdVerdict?.byteSize ?? hdSize;
    byteSizeSd = null;
    codec = standardStream
      ? "h264"
      : hdVerdict?.codec === "hevc" || hdVerdict?.codec === "av1"
        ? hdVerdict.codec
        : "unknown";
  }

  const author = asRecord(data.author);
  const music = asRecord(data.music_info);
  const username =
    asString(author?.unique_id) ?? asString(author?.uniqueId) ?? "tiktok";
  const nickname = asString(author?.nickname) ?? username;
  const title = cleanCaption(data.title) || `TikTok video by @${username}`;
  const thumbnail =
    toAbsoluteUrl(data.cover) ??
    toAbsoluteUrl(data.origin_cover) ??
    toAbsoluteUrl(data.ai_dynamic_cover) ??
    "";

  const audioStream =
    toAbsoluteUrl(data.music) ??
    toAbsoluteUrl(music?.play) ??
    toAbsoluteUrl(music?.play_url);

  return {
    id,
    title,
    duration: toDuration(data.duration),
    thumbnail,
    quality,
    noWatermark: true,
    source: "tikwm",
    createdAt: toCount(data.create_time) || null,
    musicTitle: cleanCaption(music?.title) || null,
    author: {
      username,
      nickname,
      avatar:
        toAbsoluteUrl(author?.avatar) ??
        toAbsoluteUrl(author?.avatar_medium) ??
        toAbsoluteUrl(author?.avatar_thumb),
    },
    stats: {
      plays: toCount(data.play_count),
      likes: toCount(data.digg_count),
      comments: toCount(data.comment_count),
      shares: toCount(data.share_count),
    },
    byteSize,
    byteSizeSd,
    codec,
    streams: {
      video: videoStream,
      // `play` is the standard-bitrate clean MP4; exposed separately from a
      // verified HD stream so slow connections can pick the faster file.
      videoSd,
      audio: audioStream,
    },
  };
}
