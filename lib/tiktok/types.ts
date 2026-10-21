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
  /** Same-origin streaming proxy that forces an attachment download. */
  video: string;
  /** Standard-definition (fast) MP4 proxy, when a distinct SD stream exists. */
  videoSd: string | null;
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
  /** Raw CDN streams used to build the download proxy links. */
  streams: {
    video: string;
    /** Lower-bitrate clean MP4 (tikwm `play` next to `hdplay`), when available. */
    videoSd: string | null;
    audio: string | null;
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
