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
 * POST /api/youtube — dedicated YouTube resolver.
 *
 * Open to every visitor: there is no install gate. The route exists (instead of
 * folding YouTube into `/api/fetch`) because YouTube has its own multi-provider
 * waterfall, its own 1080p selection rules and a heavier per-request budget.
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
    const { media, video, cached } = await resolveMedia(parsed.canonicalUrl, request.signal);
    if (media.platform !== "youtube") {
      return errorResponse(new AppError("UNSUPPORTED_URL", "That link resolved to another platform, not YouTube."));
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
