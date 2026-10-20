import type { DownloadLinks, ExtractedVideo } from "@/lib/tiktok/types";
import type { PlatformType } from "@/lib/url-guard";

interface LinkContext {
  id: string;
  username: string;
  /** Defaults to tiktok — the original behavior, unchanged. */
  platform?: PlatformType;
}

export function buildDownloadLinks(
  streams: ExtractedVideo["streams"],
  context: LinkContext,
): DownloadLinks {
  const build = (kind: "video" | "audio", upstream: string) => {
    const params = new URLSearchParams({
      kind,
      u: upstream,
      id: context.id,
      author: context.username,
      platform: context.platform ?? "tiktok",
    });
    return `/api/download?${params.toString()}`;
  };

  // The SD proxy is only meaningful when it points at a genuinely different
  // (lower-bitrate) stream than the primary video link.
  const videoSd =
    streams.videoSd && streams.videoSd !== streams.video
      ? build("video", streams.videoSd)
      : null;

  return {
    video: build("video", streams.video),
    videoSd,
    audio: streams.audio ? build("audio", streams.audio) : null,
  };
}

export function withDownloadLinks(video: ExtractedVideo): Omit<ExtractedVideo, "streams"> & {
  downloads: DownloadLinks;
} {
  const { streams, ...meta } = video;
  return {
    ...meta,
    downloads: buildDownloadLinks(streams, { id: meta.id, username: meta.author.username }),
  };
}
