import { universalYtdlpHit } from "@/lib/universal-ytdlp";
import type { ExtractedVideo } from "@/lib/tiktok/types";

/**
 * Universal tier (yt-dlp bridge / binary) — the FIRST member of the TikTok
 * waterfall. Returns the same ExtractedVideo contract the TikWM / page /
 * embed tiers produce, so `withDownloadLinks` attaches the same-origin proxy
 * attachments without knowing which tier answered.
 *
 * Streams deliberately expose NO `videoDirect`/`audioDirect`: yt-dlp-signed
 * TikTok CDN URLs are IP-locked to the machine that resolved them (the
 * bridge), so Server 01 must ride the same-origin /api/download proxy — the
 * Tier-1 transport that verifies and streams regardless of whose IP owns
 * the signature.
 */
export async function fetchFromYtdlp(url: string, fallbackVideoId: string | null): Promise<ExtractedVideo> {
  const hit = await universalYtdlpHit(url, "tiktok");

  return {
    id: hit.id || fallbackVideoId || "tiktok",
    title: hit.title || "TikTok video",
    duration: hit.duration,
    thumbnail: hit.thumbnail ?? "",
    author: {
      username: hit.author || "tiktok-user",
      nickname: hit.author || "TikTok creator",
      avatar: null,
    },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    quality: "hd",
    noWatermark: true,
    source: "ytdlp",
    createdAt: null,
    musicTitle: null,
    byteSize: null,
    byteSizeSd: null,
    codec: "h264",
    streams: {
      video: hit.video,
      videoDirect: null,
      videoSd: hit.videoSd && hit.videoSd !== hit.video ? hit.videoSd : null,
      audio: null,
      audioDirect: null,
    },
  };
}
