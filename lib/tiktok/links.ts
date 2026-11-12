import type { DownloadLinks, ExtractedVideo } from "@/lib/tiktok/types";
import type { PlatformType } from "@/lib/url-guard";

export interface LinkContext {
  id: string;
  username: string;
  /** Defaults to tiktok — the original behavior, unchanged. */
  platform?: PlatformType;
  /**
   * The video's own title, carried into `/api/download` so the saved file is
   * named after the clip instead of after this site. Optional: photo posts,
   * the X panel and older API clients simply fall back to the id.
   */
  title?: string;
}

/**
 * A "direct" URL is the one the visitor's browser opens straight from its own
 * residential IP (SnapTik's `Server 01` contract). It must be a plain https
 * attachment served by the provider's public CDN; anything else (signed loads,
 * non-https, session-bound) is dropped to `null` so the proxy button covers it.
 */
function directUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^https:\/\//i.test(value) ? value : null;
}

/**
 * One same-origin attachment URL. Exported because the YouTube payload also
 * needs it for renditions that are not part of `DownloadLinks` (the bridge's
 * true-MP3 encode), and hand-building the query there would invite drift.
 */
export function proxyDownloadLink(
  kind: "video" | "audio",
  upstream: string,
  context: LinkContext,
  server: number | null = null,
): string {
  const params = new URLSearchParams({
    kind,
    u: upstream,
    id: context.id,
    author: context.username,
    platform: context.platform ?? "tiktok",
  });
  // SnapTik numbers its alternate CDN hops; the proxy labels the response
  // path (`lamptik-…-s02.mp4`) so the visitor's Downloads tray never shows
  // two confusingly identical filenames for different servers.
  if (server !== null) params.set("server", String(server));
  // Capped here as well as server-side: the title travels in a URL, and a
  // 3,000-character caption would make the href itself unwieldy.
  const title = context.title?.trim();
  if (title) params.set("title", title.slice(0, 120));
  return `/api/download?${params.toString()}`;
}

export function buildDownloadLinks(
  streams: ExtractedVideo["streams"],
  context: LinkContext,
): DownloadLinks {
  const build = (kind: "video" | "audio", upstream: string, server: number | null = null) =>
    proxyDownloadLink(kind, upstream, context, server);

  // The SD proxy is only meaningful when it points at a genuinely different
  // (lower-bitrate) stream than the primary video link.
  const videoSd =
    streams.videoSd && streams.videoSd !== streams.video
      ? build("video", streams.videoSd, 2)
      : null;

  return {
    videoDirect: directUrl(streams.videoDirect),
    video: build("video", streams.video, 2),
    videoSd,
    audioDirect: directUrl(streams.audioDirect),
    audio: streams.audio ? build("audio", streams.audio, 2) : null,
  };
}

export function withDownloadLinks(video: ExtractedVideo): Omit<ExtractedVideo, "streams"> & {
  downloads: DownloadLinks;
} {
  const { streams, ...meta } = video;
  return {
    ...meta,
    downloads: buildDownloadLinks(streams, {
      id: meta.id,
      username: meta.author.username,
      title: meta.title,
    }),
  };
}
