import { AppError } from "@/lib/errors";
import {
  asRecord,
  asString,
  cleanCaption,
  timedFetch,
  toAbsoluteUrl,
} from "@/lib/http";
import { parseTikTokUrl } from "@/lib/tiktok/parse";
import { resolveShortLink } from "@/lib/tiktok/resolve";

const API_URL = "https://www.tikwm.com/api/";

/** TikTok caps photo-mode posts at 35 images; anything beyond is a bug upstream. */
const MAX_IMAGES = 35;

export interface PhotoPost {
  id: string;
  title: string;
  author: string;
  thumbnail: string | null;
  /** Clean (non-watermarked) photo URLs, in slideshow order. */
  images: string[];
  /** The post's sound track — TikWM exposes it as an MP3 stream. */
  music: string | null;
  musicTitle: string | null;
  canonicalUrl: string;
}

/**
 * Resolve a TikTok photo-mode post into its individual images.
 *
 * The video resolver deliberately rejects photo links, and the TikWM payload
 * for a slideshow has no playable stream (`duration` is 0) but does carry an
 * ordered `images` array — one signed CDN URL per slide. This module owns that
 * shape so the photo page never touches the video waterfall.
 */
export async function fetchPhotoPost(rawInput: string): Promise<PhotoPost> {
  const parsed = parseTikTokUrl(rawInput);

  if (!parsed) {
    throw new AppError(
      "INVALID_URL",
      "That doesn't look like a TikTok link.",
      "Paste a photo post like https://www.tiktok.com/@user/photo/123… or a vt.tiktok.com short link.",
    );
  }

  const resolved = await resolveShortLink(parsed);
  const endpoint = new URL(API_URL);
  // A short link that still has not resolved is handed to TikWM as-is: it
  // follows the redirect itself and knows the post id.
  endpoint.searchParams.set("url", resolved.url);
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

  const payload = (await response.json().catch(() => null)) as {
    code?: number;
    msg?: string;
    data?: Record<string, unknown>;
  } | null;

  if (!payload || payload.code !== 0 || !payload.data) {
    const message = (payload?.msg ?? "").toLowerCase();
    if (message.includes("private")) {
      throw new AppError(
        "VIDEO_PRIVATE",
        "This TikTok post is private.",
        "Ask the creator to make it public, then try again.",
      );
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "TikTok didn't return this post right now.",
      "Check that the link opens in TikTok, then try again.",
    );
  }

  const data = payload.data;
  const rawImages = Array.isArray(data.images) ? data.images : [];

  const images = rawImages
    .slice(0, MAX_IMAGES)
    .map((value) => toAbsoluteUrl(value))
    .filter((value): value is string => Boolean(value));

  if (images.length === 0) {
    // The link is valid, it simply is not a photo post — say so instead of
    // showing an empty grid.
    throw new AppError(
      "UNSUPPORTED_URL",
      "That TikTok link is a video, not a photo post.",
      "Use the TikTok video downloader for videos — this page saves slideshow photos.",
    );
  }

  const author = asRecord(data.author);
  const music = asRecord(data.music_info);
  const username =
    asString(author?.unique_id) ?? asString(author?.uniqueId) ?? "tiktok";
  const nickname = asString(author?.nickname) ?? username;
  const title =
    cleanCaption(data.title) || `TikTok photo post by @${username}`;

  return {
    id: String(data.id ?? resolved.videoId ?? Date.now()),
    title,
    author: username || nickname,
    thumbnail:
      toAbsoluteUrl(data.origin_cover) ??
      toAbsoluteUrl(data.cover) ??
      images[0] ??
      null,
    images,
    music:
      toAbsoluteUrl(data.music) ??
      toAbsoluteUrl(music?.play) ??
      toAbsoluteUrl(music?.play_url),
    musicTitle: cleanCaption(music?.title) || null,
    canonicalUrl: resolved.url,
  };
}
