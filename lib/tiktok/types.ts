export type VideoSource = "tikwm" | "tiktok-page" | "instagram" | "facebook" | "youtube";

export type VideoQuality = "hd" | "sd";

/**
 * Normalized video codec. `h264` is the only codec that plays everywhere
 * (Android/iOS galleries, WhatsApp status, editors); `hevc` is Apple/Android
 * HEVC (`hvc1`/`hev1`/`bytevc1`) and is deliberately avoided.
 */
export type VideoCodec = "h264" | "hevc" | "av1" | "vp9" | "vp8" | "unknown";

import type { MediaPayload } from "@/lib/media";

export interface VideoAuthor {
  username: string;
  nickname: string;
  avatar: string | null;
}

export interface VideoStats {
  plays: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface DownloadLinks {
  /** Direct public-CDN attachment URL (Server 01) — the provider's own fast
   *  stream (tikwm `play`/`hdplay`, loader.to `download_url`), served with
   *  `Content-Disposition: attachment` by that CDN itself. Null when the
   *  provider only exposes signed/expiring platform URLs. */
  videoDirect: string | null;
  /** Same-origin streaming proxy that forces an attachment download (Server 02). */
  video: string;
  /** Standard-definition (fast) MP4 proxy, when a distinct SD stream exists. */
  videoSd: string | null;
  /** Direct public audio CDN URL, when available (e.g. tikwm `music`). */
  audioDirect: string | null;
  /** MP3 audio proxy, when the source exposes a music stream. */
  audio: string | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  author: VideoAuthor;
  stats: VideoStats;
  quality: VideoQuality;
  noWatermark: boolean;
  source: VideoSource;
  createdAt: number | null;
  musicTitle: string | null;
  /** Best-known size of the selected (primary) video stream, in bytes. */
  byteSize?: number | null;
  /** Size of the secondary/fast stream, when it is a distinct rendition. */
  byteSizeSd?: number | null;
  /** Verified container codec — drives the compatibility badge. */
  codec?: VideoCodec;
  downloads: DownloadLinks;
}

/** Provider output before same-origin download links are attached. */
export type ExtractedVideo = Omit<VideoInfo, "downloads"> & {
  /** Raw CDN streams used to build the download links. */
  streams: {
    video: string;
    /** Direct public-CDN attachment URL (Server 01), when this provider serves one. */
    videoDirect?: string | null;
    /** Lower-bitrate clean MP4 (tikwm `play` next to `hdplay`), when available. */
    videoSd: string | null;
    audio: string | null;
    /** Direct public audio CDN URL, when this provider serves one. */
    audioDirect?: string | null;
  };
};

export interface ApiSuccess {
  ok: true;
  /** Unified cross-platform payload (id/platform/title/author/thumbnail/
   *  duration/videoHd/videoSd/audioMp3) — same-origin download URLs. */
  media: MediaPayload;
  /** Full TikTok-compatible record; synthesized for Instagram/Facebook. */
  video: VideoInfo;
  cached: boolean;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    hint?: string;
  };
}

export type ErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_URL"
  | "VIDEO_NOT_FOUND"
  | "VIDEO_PRIVATE"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "BAD_REQUEST";

export type ApiResponse = ApiSuccess | ApiFailure;

/* -------------------------------------------------------------------------- */
/*  Client-assisted YouTube completion (long uploads)                            */
/* -------------------------------------------------------------------------- */

/** One started loader.to conversion job. */
export interface YouTubeJobRef {
  /** "1080" | "720" | "360" | "mp3". */
  format: string;
  /** Opaque converter job id — queried by /api/youtube/poll. */
  id: string;
}

/** POST /api/youtube answer when a rendition needs more than 6s: the browser takes over polling. */
export interface YouTubePendingResponse {
  ok: true;
  pending: {
    videoId: string;
    title: string;
    author: string;
    duration: number;
    thumbnail: string | null;
    jobs: YouTubeJobRef[];
  };
}

/** POST /api/youtube fast path — full payload plus all still-running jobs. */
export interface YouTubeResolvedResponse extends ApiSuccess {
  jobs: YouTubeJobRef[];
}

export type YouTubeResolveResponse = YouTubePendingResponse | YouTubeResolvedResponse;

/** GET /api/youtube/poll — one waiter's beat against every started job. */
export interface YouTubePollResponse {
  ok: true;
  ready: Array<YouTubeJobRef & { downloadUrl: string }>;
  processing: Array<YouTubeJobRef & { progress: number | null }>;
  failed: YouTubeJobRef[];
}

/** POST /api/youtube/claim — a polled `download_url` → the standard payload. */
export type YouTubeClaimResponse = ApiResponse;
