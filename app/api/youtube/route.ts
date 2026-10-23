import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { assembleYouTubeMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";
import { startYouTubeResolution } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/youtube — dedicated YouTube resolver (pending-capable).
 *
 * Phase A gives the resolver 6 seconds: the direct mirrors and warm converter
 * pools usually answer inside that. When a rendition is still converting
 * (long uploads take loader.to 30–120s), the route returns `{ ok, pending }`
 * with the STARTED conversion job ids — the BROWSER then drives completion
 * through `/api/youtube/poll` + `/api/youtube/claim` so the wait never dies
 * inside a serverless function ceiling. Fast path answers still carry
 * `jobs` so the mp3/1080 merge can land after the card appears.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`youtube:${ip}`, 35, 60_000);
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
        "Paste a YouTube link first.",
        "Supported: youtube.com/watch, youtu.be share links, and /shorts/ clips.",
      ),
    );
  }

  try {
    const resolution = await startYouTubeResolution(url);

    if (resolution.state === "pending") {
      return NextResponse.json(
        {
          ok: true,
          pending: {
            videoId: resolution.videoId,
            title: resolution.title,
            author: resolution.author,
            duration: resolution.duration,
            thumbnail: resolution.thumbnail,
            jobs: resolution.jobs,
          },
        },
        { headers: { "Cache-Control": "no-store", "X-RateLimit-Limit": String(limit.limit) } },
      );
    }

    // Phase A fast path — a complete stream landed inside the 6s budget.
    const { media, video } = assembleYouTubeMedia(resolution.meta, resolution.streams);
    if (media.platform !== "youtube") {
      return errorResponse(
        new AppError("UNSUPPORTED_URL", "That link resolved to another platform, not YouTube."),
      );
    }
    return NextResponse.json(
      { ok: true, media, video, cached: false, jobs: resolution.jobs },
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
