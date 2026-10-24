import { NextResponse, type NextRequest } from "next/server";

import { assembleYouTubeMedia } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { isPublicMediaUrl } from "@/lib/security";
import { rememberYouTubeStreams } from "@/lib/youtube";
import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ClaimApiSuccess {
  ok: true;
  media: ReturnType<typeof assembleYouTubeMedia>["media"];
  video: ReturnType<typeof assembleYouTubeMedia>["video"];
  cached: boolean;
}

interface ClaimApiFailure {
  ok: false;
  error: {
    code: "RATE_LIMITED" | "INVALID_URL" | "BAD_REQUEST" | "PROVIDER_UNAVAILABLE";
    message: string;
  };
}

function claimFailure(body: ClaimApiFailure): NextResponse {
  // A rejected candidate is expected while the browser walks the mirror list,
  // not a server fault: 200 + `{ ok:false }` keeps it out of Vercel's error
  // rate (the client branches on the body, never on the status). Only abuse
  // keeps a 4xx.
  const status = body.error.code === "RATE_LIMITED" ? 429 : 200;
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function claimSuccess(body: ClaimApiSuccess): NextResponse {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/youtube/claim — turn a stream URL found by the BROWSER (the CORS
 * mirror rescue, running on the visitor's own IP) into the standard
 * `{ media, video }` payload the result panel consumes. The claim never sees
 * media bytes: the URL is validated here and `/api/download` re-validates the
 * hop chain end to end when the visitor downloads.
 */
export async function POST(request: NextRequest) {
  try {
    return await handleClaim(request);
  } catch {
    // A claim that cannot be assembled is a soft answer, never a 500: the
    // client retries the next mirror. 200 keeps a rejected candidate out of
    // Vercel's function-error rate.
    return claimFailure({
      ok: false,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "That stream could not be claimed — trying the next mirror.",
      },
    });
  }
}

async function handleClaim(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`yt-claim:${ip}`, 35, 60_000);
  if (!limit.ok) {
    return claimFailure({
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many claims from this address." },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (typeof body !== "object" || body === null) {
    return claimFailure({
      ok: false,
      error: { code: "BAD_REQUEST", message: "A JSON claim body is required." },
    });
  }
  const claim = body as {
    downloadUrl?: unknown;
    format?: unknown;
    videoId?: unknown;
    title?: unknown;
    author?: unknown;
    duration?: unknown;
    thumbnail?: unknown;
  };

  if (
    typeof claim.downloadUrl !== "string" ||
    !isPublicMediaUrl(claim.downloadUrl) ||
    isKnownLoaderInterstitialUrl(claim.downloadUrl)
  ) {
    return claimFailure({
      ok: false,
      error: { code: "INVALID_URL", message: "Claim rejected — that download URL isn't usable." },
    });
  }
  const format =
    claim.format === "mp3" || claim.format === "1080" || claim.format === "720" || claim.format === "360"
      ? claim.format
      : null;
  if (!format) {
    return claimFailure({
      ok: false,
      error: { code: "BAD_REQUEST", message: "Unknown conversion format." },
    });
  }
  if (typeof claim.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(claim.videoId)) {
    return claimFailure({
      ok: false,
      error: { code: "INVALID_URL", message: "Claim rejected — unknown video." },
    });
  }

  const title = typeof claim.title === "string" ? claim.title.trim().slice(0, 200) : "";
  const author = typeof claim.author === "string" ? claim.author.trim().slice(0, 120) : "";
  const duration =
    typeof claim.duration === "number" && Number.isFinite(claim.duration) && claim.duration > 0
      ? Math.min(86_400, Math.round(claim.duration))
      : 0;
  const thumbnail =
    typeof claim.thumbnail === "string" && /^https:\/\//.test(claim.thumbnail) ? claim.thumbnail : null;

  // mp3 claims carry ONLY audio; every other claim is a video rendition.
  const streams =
    format === "mp3"
      ? { video: null, videoSd: null, audio: claim.downloadUrl }
      : { video: claim.downloadUrl, videoSd: null, audio: null };

  // A rejected assembly is a claim-level answer, not a function crash: the
  // browser loop treats `ok:false` as "that stream is unusable, try the next".
  let assembled: ReturnType<typeof assembleYouTubeMedia>;
  try {
    assembled = assembleYouTubeMedia(
      {
        id: claim.videoId,
        title: title || `YouTube video ${claim.videoId}`,
        author: author || "YouTube",
        duration,
        thumbnail,
      },
      streams,
    );
  } catch {
    return claimFailure({
      ok: false,
      error: { code: "PROVIDER_UNAVAILABLE", message: "That download URL isn't a playable stream." },
    });
  }
  const { media, video } = assembled;

  // Remember the claimed stream so a second resolve of the same video can
  // reuse it. Only mirror/CDN links answer any visitor IP; googlevideo URLs
  // (IP-locked to the claimant) are refused by the cache itself.
  rememberYouTubeStreams(
    claim.videoId,
    {
      id: claim.videoId,
      title: title || `YouTube video ${claim.videoId}`,
      author: author || "YouTube",
      duration,
      thumbnail,
    },
    streams,
  );

  return claimSuccess({ ok: true, media, video, cached: false });
}
