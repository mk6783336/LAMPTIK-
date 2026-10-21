import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { resolveMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";
import { isYouTubeAppAuthorized, parseYouTubeUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/youtube — dedicated App-Exclusive YouTube resolver.
 *
 * Automatically unlocks when ANY of these are true:
 *   1. User-Agent contains `LampTikAndroidApp` or Android WebView (`; wv)`),
 *   2. URL/Referer has `?app=android_apk` or `?source=pwa` or `lamptik_app=1` cookie,
 *   3. Standalone PWA session (`lamptik_app=1`).
 */
export async function POST(request: NextRequest) {
  const authorized = isYouTubeAppAuthorized({
    userAgent: request.headers.get("user-agent"),
    cookie: request.headers.get("cookie"),
    referer: request.headers.get("referer"),
    searchParams: request.nextUrl.searchParams,
  });

  if (!authorized) {
    return errorResponse(
      new AppError(
        "BAD_REQUEST",
        "Download & install the LAMP TIK Android APK (or Instant Web App) to unlock YouTube 1080p & MP3 downloads.",
      ),
    );
  }

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
          "Set-Cookie": "lamptik_app=1; Path=/; Max-Age=31536000; SameSite=Lax",
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
