import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { readBoundedJson } from "@/lib/security";
import { contentDisposition, safeTitlePart } from "@/lib/tiktok/allowlist";
import {
  debugCaptionClients,
  formatCaptions,
  listCaptionTracks,
  parseVideoId,
  readCaptionCues,
  type CaptionFormat,
} from "@/lib/youtube-captions";

/**
 * `/api/subtitles` — list a video's caption tracks (POST) and hand back a
 * converted transcript file (GET).
 *
 * Two verbs on purpose: the list is a JSON call from the tool, while the file
 * is a plain navigation the browser saves, and browsers will not POST one. The
 * GET never accepts a caption URL from the client — it accepts a video URL and
 * re-resolves the signed youtube.com caption URL itself, so there is no
 * arbitrary-URL fetch and no SSRF surface here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FORMATS: readonly CaptionFormat[] = ["srt", "vtt", "txt"];

function tooManyRequests(ip: string): void {
  const { ok, retryAfter } = rateLimit(`subtitles:${ip}`, 20, 60_000);
  if (ok) return;

  throw new AppError(
    "RATE_LIMITED",
    "Too many caption requests from this connection.",
    `Try again in ${Math.max(1, Math.ceil(retryAfter / 1000))} seconds — one request per video is enough.`,
  );
}

export async function POST(request: NextRequest) {
  try {
    tooManyRequests(getClientIp(request.headers));

    const body = await readBoundedJson<{ url?: unknown; debug?: unknown }>(request);
    const url = typeof body.url === "string" ? body.url : "";
    if (!url.trim()) {
      throw new AppError(
        "INVALID_URL",
        "No video link was sent.",
        "Paste a YouTube link first.",
      );
    }

    // Diagnostics only: the per-client playability verdicts, so a refusal can
    // be read instead of guessed at. Not linked from the page.
    if (body.debug === true) {
      const videoId = parseVideoId(url);
      if (!videoId) throw new AppError("INVALID_URL", "That is not a YouTube video link.");
      return NextResponse.json(
        { ok: true, debug: await debugCaptionClients(videoId) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const listing = await listCaptionTracks(url);

    return NextResponse.json(
      { ok: true, video: listing, tracks: listing.tracks },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    tooManyRequests(getClientIp(request.headers));

    const params = request.nextUrl.searchParams;
    const url = params.get("url") ?? "";
    const lang = params.get("lang") ?? "";
    const requested = (params.get("format") ?? "srt").toLowerCase();
    const format = (FORMATS as readonly string[]).includes(requested)
      ? (requested as CaptionFormat)
      : "srt";

    const { title, track, cues } = await readCaptionCues(url, lang);
    const body = formatCaptions(cues, format);

    const base = safeTitlePart(title) || "youtube-captions";
    const filename = `${base}-${safeTitlePart(track.lang) || "captions"}.${format}`;
    const contentType =
      format === "vtt" ? "text/vtt; charset=utf-8" : format === "txt"
        ? "text/plain; charset=utf-8"
        : "application/x-subrip; charset=utf-8";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition(filename),
        "Content-Length": String(Buffer.byteLength(body, "utf8")),
        "Cache-Control": "no-store",
        "X-Caption-Language": track.lang,
        "X-Caption-Auto": track.auto ? "1" : "0",
      },
    });
  } catch (error) {
    // A download navigation that answers HTML or JSON gets saved as a file
    // named after the page. Failures stay bodyless so the browser reports a
    // failed download and nothing lands on disk.
    if (error instanceof AppError) {
      return new NextResponse(null, {
        status: error.status,
        headers: { "Cache-Control": "no-store", "X-Failure-Code": error.code },
      });
    }
    return errorResponse(error);
  }
}
