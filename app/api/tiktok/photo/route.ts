import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";
import { fetchPhotoPost } from "@/lib/tiktok/photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Same-origin attachment proxy for one slide (see /api/image). */
function imageDownload(url: string, id: string, index: number): string {
  return `/api/image?${new URLSearchParams({
    u: url,
    id,
    i: String(index),
  }).toString()}`;
}

/** Audio rides the existing media proxy, which already names the file. */
function audioDownload(url: string, id: string): string {
  return `/api/download?${new URLSearchParams({
    kind: "audio",
    u: url,
    id,
    platform: "tiktok",
    server: "2",
  }).toString()}`;
}

/**
 * POST /api/tiktok/photo — resolve a TikTok photo-mode (slideshow) post.
 *
 * Returns every slide as a same-origin attachment URL plus the post's sound,
 * so the browser downloads real image files instead of opening a CDN tab.
 * The video endpoints are untouched: a photo link answers here, a video link
 * keeps answering on /api/fetch.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`photo:${ip}`, 20, 60_000);

  if (!limit.ok) {
    return errorResponse(
      new AppError(
        "RATE_LIMITED",
        "Too many requests from this address.",
        `Please wait ${limit.retryAfter}s before trying again.`,
      ),
      {
        "Retry-After": String(limit.retryAfter),
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAX_FETCH_BODY_BYTES);
  } catch (error) {
    return errorResponse(error);
  }

  const url =
    body && typeof body === "object" && "url" in body
      ? (body as { url?: unknown }).url
      : undefined;

  if (typeof url !== "string" || !url.trim()) {
    return errorResponse(
      new AppError(
        "INVALID_URL",
        "Paste a TikTok photo link first.",
        "Photo posts use /@user/photo/… — videos belong on the video downloader.",
      ),
    );
  }

  if (url.length > 2_048) {
    return errorResponse(
      new AppError("INVALID_URL", "That link is too long to be a valid post URL."),
    );
  }

  try {
    const post = await fetchPhotoPost(url);

    return NextResponse.json(
      {
        ok: true,
        post: {
          ...post,
          images: post.images.map((image, index) => ({
            index: index + 1,
            url: image,
            download: imageDownload(image, post.id, index + 1),
          })),
          music: post.music
            ? { url: post.music, download: audioDownload(post.music, post.id) }
            : null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
