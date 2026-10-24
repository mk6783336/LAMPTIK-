import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse, toAppError } from "@/lib/errors";
import { resolveMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/fetch — unified metadata resolver for TikTok, Instagram, and
 * Facebook. Input is SSRF-guarded and host-allowlisted before any network
 * work; results are cached 3 minutes per canonical URL so concurrent hits on
 * one viral link resolve upstream exactly once.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  // Sliding-window token bucket: max 35 resolve requests per minute per IP.
  const limit = rateLimit(`fetch:${ip}`, 35, 60_000);

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
  // `force` bypasses the 3-minute cache so an expired CDN URL can be
  // replaced with a freshly signed stream (the download retry path).
  const force = Boolean(
    body &&
      typeof body === "object" &&
      "force" in body &&
      (body as { force?: unknown }).force === true,
  );

  if (typeof url !== "string" || !url.trim()) {
    return errorResponse(
      new AppError(
        "INVALID_URL",
        "Paste a video link first.",
        "Supported: TikTok, Instagram (reel/p/tv/share), Facebook (videos/reels/watch/fb.watch/share), and YouTube (watch/shorts/youtu.be) links.",
      ),
    );
  }

  if (url.length > 2_048) {
    return errorResponse(
      new AppError("INVALID_URL", "That link is too long to be a valid video URL."),
    );
  }

  try {
    // assertInputUrl (inside resolveMedia) enforces HTTPS, private-IP
    // blocking, and the platform host allowlist before any fetch happens.
    // request.signal aborts upstream work if the client disconnects.
    const { media, video, cached } = await resolveMedia(url, request.signal, { fresh: force });
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
    // Upstream outages (503/502) answer 200 with `{ ok:false, error }` so a
    // provider hiccup is not counted as a crashed function; input, private
    // and not-found errors keep their real 4xx status.
    const status = toAppError(error).status;
    return errorResponse(error, undefined, status >= 500 ? 200 : undefined);
  }
}
