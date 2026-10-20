import { AppError } from "@/lib/errors";
import {
  asRecord,
  asString,
  cleanCaption,
  DESKTOP_UA,
  timedFetch,
  toAbsoluteUrl,
  toCount,
  toDuration,
} from "@/lib/http";
import type { ExtractedVideo, VideoCodec, VideoQuality } from "@/lib/tiktok/types";

const REHYDRATION_SCRIPT =
  /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i;

interface PageStream {
  url: string;
  codec: string;
  bitrate: number;
  byteSize: number | null;
  hd: boolean;
}

/** HEVC / bytevc1 renditions stutter or freeze in mobile galleries. */
function isHevcCodec(codec: string): boolean {
  return /bytevc1|hvc1|hev1|h265|hevc/.test(codec);
}

function isH264Codec(codec: string): boolean {
  return /h264|avc1|avc3/.test(codec);
}

/**
 * Read itemStruct.video.bitrateInfo (PascalCase SDK shape) / bitRate (web
 * shape) into a normalized list. Each entry carries the exact codec TikTok
 * will serve, which is the information the old parser threw away.
 */
function readPageStreams(videoObj: Record<string, unknown> | null): PageStream[] {
  const raw = videoObj?.bitrateInfo ?? videoObj?.bitRate;
  if (!Array.isArray(raw)) return [];

  const streams: PageStream[] = [];

  for (const entry of raw) {
    const record = asRecord(entry);
    if (!record) continue;
    const info = asRecord(record.BitrateInfo) ?? record;
    const playAddr = asRecord(info.PlayAddr);
    const list = Array.isArray(playAddr?.UrlList) ? playAddr.UrlList : [];
    const url =
      toAbsoluteUrl(list[0], "https://www.tiktok.com") ??
      toAbsoluteUrl(playAddr?.Url, "https://www.tiktok.com") ??
      toAbsoluteUrl(info.PlayAddr, "https://www.tiktok.com");
    if (!url) continue;

    const codec = (asString(info.CodecType) ?? "").toLowerCase();
    const gear = (asString(info.GearName) ?? "").toLowerCase();
    const qualityType = (asString(info.QualityType) ?? "").toLowerCase();
    const bitrate = toCount(info.Bitrate);

    streams.push({
      url,
      codec,
      bitrate,
      byteSize: toCount(info.DataSize) || null,
      hd: /hd|1080|720/.test(gear) || /hd|1080|720/.test(qualityType) || bitrate >= 1_500_000,
    });
  }

  return streams;
}

const byBitrateDesc = (a: PageStream, b: PageStream) => b.bitrate - a.bitrate;

/**
 * Fallback: fetch the public video page and read TikTok's embedded
 * `webapp.video-detail` state. TikTok frequently serves a challenge page to
 * datacenter IPs, so failures are reported as an unavailable provider rather
 * than a missing video.
 */
export async function fetchFromTikTokPage(url: string): Promise<ExtractedVideo> {
  let response: Response;
  try {
    response = await timedFetch(
      url,
      {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": DESKTOP_UA,
          Referer: "https://www.tiktok.com/",
        },
        cache: "no-store",
        redirect: "follow",
      },
      15_000,
    );
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "TikTok's page did not respond in time.");
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new AppError(
        "VIDEO_NOT_FOUND",
        "That TikTok video doesn't exist anymore.",
        "It may have been deleted by the creator.",
      );
    }
    throw new AppError("PROVIDER_UNAVAILABLE", "TikTok blocked the page request.");
  }

  const html = await response.text();
  const jsonText = html.match(REHYDRATION_SCRIPT)?.[1];

  if (!jsonText) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "TikTok served a verification page instead of the video.",
    );
  }

  let root: Record<string, unknown>;
  try {
    root = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "TikTok's page data could not be parsed.");
  }

  const defaultScope = asRecord(root.__DEFAULT_SCOPE__);
  const detail = asRecord(defaultScope?.["webapp.video-detail"]);
  const statusCode = toCount(detail?.statusCode);
  const item = asRecord(asRecord(asRecord(detail?.itemInfo)?.itemStruct));

  if (!item) {
    if (statusCode === 10204 || statusCode === 10216) {
      throw new AppError(
        "VIDEO_PRIVATE",
        "This TikTok video is private.",
        "Only public videos can be downloaded.",
      );
    }
    throw new AppError(
      "VIDEO_NOT_FOUND",
      "We couldn't read this TikTok video.",
      "Double-check the link — the video may have been deleted.",
    );
  }

  const videoObj = asRecord(item.video);
  const authorObj = asRecord(item.author);
  const musicObj = asRecord(item.music);
  const statsObj = asRecord(item.stats);

  const playStream = toAbsoluteUrl(videoObj?.playAddr, "https://www.tiktok.com");
  const downloadStream = toAbsoluteUrl(videoObj?.downloadAddr, "https://www.tiktok.com");

  // Choose the highest-bitrate progressive stream whose CodecType is H.264.
  // `PlayAddrBytevc1` entries (HEVC) are excluded outright; `unknown` codecs
  // are only used when no explicit H.264 rendition exists.
  const pageStreams = readPageStreams(videoObj);
  const universal = pageStreams.filter((stream) => !isHevcCodec(stream.codec));
  const h264Streams = universal.filter((stream) => isH264Codec(stream.codec)).sort(byBitrateDesc);
  const otherStreams = universal.filter((stream) => !isH264Codec(stream.codec)).sort(byBitrateDesc);
  const bestStream = h264Streams[0] ?? otherStreams[0] ?? null;

  const videoStream = bestStream?.url ?? playStream ?? downloadStream;

  if (!videoStream) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "TikTok didn't expose a downloadable stream for this video.",
    );
  }

  const quality: VideoQuality = bestStream ? (bestStream.hd ? "hd" : "sd") : "hd";
  const codec: VideoCodec = bestStream
    ? isH264Codec(bestStream.codec)
      ? "h264"
      : "unknown"
    : "h264";
  const videoSd =
    bestStream && playStream && playStream !== bestStream.url ? playStream : null;
  const byteSize = bestStream?.byteSize ?? null;

  const username = asString(authorObj?.uniqueId) ?? "tiktok";
  const nickname = asString(authorObj?.nickname) ?? username;
  const audioStream = toAbsoluteUrl(musicObj?.playUrl, "https://www.tiktok.com");

  return {
    id: String(item.id ?? Date.now()),
    title: cleanCaption(item.desc) || `TikTok video by @${username}`,
    duration: toDuration(videoObj?.duration),
    thumbnail:
      toAbsoluteUrl(videoObj?.originCover, "https://www.tiktok.com") ??
      toAbsoluteUrl(videoObj?.cover, "https://www.tiktok.com") ??
      "",
    quality,
    noWatermark: true,
    source: "tiktok-page",
    createdAt: toCount(item.createTime) || null,
    musicTitle: cleanCaption(musicObj?.title) || null,
    byteSize,
    byteSizeSd: null,
    codec,
    author: {
      username,
      nickname,
      avatar:
        toAbsoluteUrl(authorObj?.avatarThumb, "https://www.tiktok.com") ??
        toAbsoluteUrl(authorObj?.avatarMedium, "https://www.tiktok.com") ??
        toAbsoluteUrl(authorObj?.avatarLarger, "https://www.tiktok.com"),
    },
    stats: {
      plays: toCount(statsObj?.playCount),
      likes: toCount(statsObj?.diggCount),
      comments: toCount(statsObj?.commentCount),
      shares: toCount(statsObj?.shareCount),
    },
    streams: {
      video: videoStream,
      // The standard playAddr is exposed as the fast option when a bitrate
      // variant was chosen, so users can pick the smaller file.
      videoSd,
      audio: audioStream,
    },
  };
}
