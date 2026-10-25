import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse, toAppError } from "@/lib/errors";
import { assembleYouTubeMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";
import { startYouTubeResolution } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/youtube — dedicated YouTube resolver.
 *
 * One Innertube request (ANDROID player client) normally answers in ~300 ms
 * with a muxed MP4 + AAC audio + the real duration; the failover engines only
 * run when that client refuses. There is no converter job and therefore no
 * `pending` hand-off any more.
 *
 * Every upstream refusal (rate limit from YouTube, all engines down, a
 * timeout) answers HTTP 200 with `{ ok: false, error }` on purpose: those are
 * expected provider conditions the client retries, and Vercel counts each 5xx
 * as a function error. Genuine input/video errors keep their 4xx so real
 * breakage stays visible.
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
  const force = Boolean(
    body && typeof body === "object" && "force" in body &&
    (body as { force?: unknown }).force === true,
  );

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
    const resolution = await startYouTubeResolution(url, { fresh: force });
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
    // 5xx → 200 soft error: a provider outage is retried by the client and
    // must not be counted as a crashed function.
    const status = toAppError(error).status;
    return errorResponse(error, undefined, status >= 500 ? 200 : undefined);
  }
}
