import { NextResponse, type NextRequest } from "next/server";

import { cacheGet, cacheSet } from "@/lib/cache";
import { AppError, errorResponse } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { fetchPlaylist, type PlaylistSummary } from "@/lib/youtube/playlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CACHE_TTL_MS = 10 * 60 * 1_000;

/**
 * GET /api/youtube/playlist?url=<playlist link>
 *
 * Listing only. Every item's download still goes through `/api/youtube`
 * and the standard single-video flow, so a playlist page can never become a
 * second extraction path with its own failure modes.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`playlist:${ip}`, 20, 60_000);

  if (!limit.ok) {
    return errorResponse(
      new AppError(
        "RATE_LIMITED",
        "Too many requests from this address.",
        `Please wait ${limit.retryAfter}s before trying again.`,
      ),
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const input =
    request.nextUrl.searchParams.get("url") ??
    request.nextUrl.searchParams.get("list") ??
    "";

  if (!input.trim() || input.length > 2_048) {
    return errorResponse(
      new AppError(
        "INVALID_URL",
        "Paste a YouTube playlist link first.",
        "The link must contain `list=` — for example a /playlist?list=PL… URL.",
      ),
    );
  }

  const cacheKey = `playlist:${input.trim()}`;
  const cached = cacheGet<PlaylistSummary>(cacheKey);

  if (cached) {
    return NextResponse.json(
      { ok: true, playlist: cached, cached: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const playlist = await fetchPlaylist(input);
    cacheSet(cacheKey, playlist, CACHE_TTL_MS);

    return NextResponse.json(
      { ok: true, playlist, cached: false },
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
