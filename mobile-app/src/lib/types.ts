/**
 * Local mirrors of the web API contract (`lib/media.ts` and
 * `lib/tiktok/types.ts` in the Next.js app). The mobile client deliberately
 * does not import from the web project: Metro bundling must stay independent
 * of the Next.js app, so these are structural copies kept in sync by hand.
 */

export type PlatformType = "tiktok" | "instagram" | "facebook" | "youtube";

export type VideoCodec = "h264" | "hevc" | "av1" | "vp9" | "vp8" | "unknown";

/** `/api/youtube` and `/api/fetch` both answer with this shape. */
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
  videoHdBytes: number | null;
  videoSdBytes: number | null;
  videoCodec: VideoCodec;
  canonicalUrl: string;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface ApiSuccess {
  ok: true;
  media: MediaPayload;
  cached?: boolean;
}

export type ApiResponse = ApiSuccess | ApiFailure;

/** Quality the user picked in the result card. */
export type Quality = "hd" | "sd" | "audio";

export interface ResolveResult {
  media: MediaPayload;
  cached: boolean;
}
