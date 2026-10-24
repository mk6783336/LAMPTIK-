import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { assembleYouTubeMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { MAX_FETCH_BODY_BYTES, readBoundedJson } from "@/lib/security";
import { startYouTubeResolution } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/youtube — dedicated YouTube resolver (pending-capable).
 *
 * Phase A gives the resolver up to 35 seconds, within this route's Vercel
 * maxDuration. When a rendition is still converting
 * (long uploads take loader.to 30–120s), the route returns `{ ok, pending }`
 * with the STARTED conversion job ids — the BROWSER then drives completion
 * through `/api/youtube/poll` + `/api/youtube/claim` so the wait never dies
 * inside a serverless function ceiling. Fast path answers still carry
 * `jobs` so the mp3/1080 merge can land after the card appears.
 *
 * Expected upstream refusals (`PROVIDER_ACCESS_DENIED`, `PROVIDER_UNAVAILABLE`)
 * answer HTTP 200 with the same `{ ok: false }` body: they are the designed
 * START of the browser-side rescue, not a server fault, so a 5xx here would
 * count a working fallback as a crashed function in Vercel's error rate. The
 * client branches on `body.ok`, never on the status code.
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

    if (resolution.state === "pending") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PROVIDER_UNAVAILABLE",
            message: "A valid video stream is not ready yet. Keep this page open while the resolver checks the active jobs.",
          },
          pending: {
            videoId: resolution.videoId,
            title: resolution.title,
            author: resolution.author,
            duration: resolution.duration,
            thumbnail: resolution.thumbnail,
            jobs: resolution.jobs,
          },
        },
        {
          status: 202,
          headers: { "Cache-Control": "no-store", "X-RateLimit-Limit": String(limit.limit) },
        },
      );
    }

    // Phase A fast path — a complete stream landed inside the 35s budget.
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
    // A hand-off is not a failure: the browser rescue (visitor's residential
    // IP) takes over for both of these codes, so answer 200 and keep the
    // structured `{ ok:false, error }` body the client already understands.
    const softHandoff =
      error instanceof AppError &&
      (error.code === "PROVIDER_ACCESS_DENIED" || error.code === "PROVIDER_UNAVAILABLE");
    const response = errorResponse(error, undefined, softHandoff ? 200 : undefined);
    if (error instanceof AppError && error.code === "PROVIDER_ACCESS_DENIED") {
      response.headers.set("X-YouTube-Provider-Status", "access-denied");
    }
    return response;
  }
}
