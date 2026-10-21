import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { resolveMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";
import { parseYouTubeUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/youtube — dedicated App-Exclusive YouTube resolver.
 *
 * YouTube-only front door to the same hardened pipeline as /api/fetch
 * (SSRF guard, platform allowlist, 3-minute cache, circuit-breaker). Only
 * watch / youtu.be / shorts links are accepted; everything else gets a clean
 * 400 with friendly copy — never a stack trace.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  // Token bucket: 35 resolve requests per minute per IP.
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

  // Payload size guard: reject bodies > 4096 bytes before parsing.
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

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return errorResponse(
      new AppError(
        "UNSUPPORTED_URL",
        "That doesn't look like a YouTube video link.",
        "Try a youtube.com/watch, youtu.be share link, or /shorts/ link.",
      ),
    );
  }

  try {
    // request.signal aborts upstream work if the client disconnects.
    const { media, video, cached } = await resolveMedia(parsed.canonicalUrl, request.signal);
    if (media.platform !== "youtube") {
      return errorResponse(
        new AppError("UNSUPPORTED_URL", "That link resolved to another platform, not YouTube."),
      );
    }
    return NextResponse.json(
      { ok: true, media, video, cached },
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
