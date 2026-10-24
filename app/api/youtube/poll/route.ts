import { NextResponse, type NextRequest } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import type { YouTubeJobRef, YouTubePollResponse } from "@/lib/tiktok/types";
import { pollLoaderJob } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_FORMATS = new Set(["1080", "720", "360", "mp3"]);

/**
 * GET /api/youtube/poll?id=…&format=… (repeated) — one poll beat for the
 * browser's background completion loop.
 *
 * Why this exists: long YouTube uploads take 30–120s for loader.to to
 * convert, which is longer than a serverless function may live. The POST
 * resolve therefore returns after 6s with the STARTED job ids, and the
 * BROWSER drives the remaining wait through this cheap endpoint while the
 * conversions keep running on loader.to's own infrastructure.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`yt-poll:${ip}`, 300, 60_000);
  if (!limit.ok) {
    return errorResponse({
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many resolution status checks — slowing down.",
      },
    });
  }

  // Ids come from OUR resolve response — still revalidated: an id is an
  // opaque slug and `pollLoaderJob` fetches only the canonical
  // loader.to/ajax/progress.php endpoint (no URL redirect ampersand games).
  const idEntries = request.nextUrl.searchParams.getAll("id");
  const formatEntries = request.nextUrl.searchParams.getAll("format");
  if (idEntries.length === 0 || idEntries.length > 8 || formatEntries.length !== idEntries.length) {
    return errorResponse({
      ok: false,
      error: { code: "BAD_REQUEST", message: "Pass matching id and format pairs." },
    });
  }

  const ready: Array<YouTubePollResponse["ready"][number]> = [];
  const processing: YouTubePollResponse["processing"][number][] = [];
  const failed: YouTubePollResponse["failed"][number][] = [];

  await Promise.all(
    idEntries.map(async (id, index) => {
      const format = formatEntries[index];
      if (!VALID_FORMATS.has(format) || !/^[A-Za-z0-9_-]{4,96}$/.test(id)) {
        failed.push({ format, id });
        return;
      }
      // One dead conversion must not 500 the whole beat: report it as failed
      // so the browser loop keeps polling its other jobs.
      try {
        const beat = await pollLoaderJob(id);
        if (beat.status === "ready") {
          ready.push({ id, format, downloadUrl: beat.downloadUrl });
        } else if (beat.status === "error") {
          failed.push({ id, format, ...(beat.reason ? { reason: beat.reason } : {}) });
        } else {
          processing.push({ id, format, progress: beat.progress });
        }
      } catch {
        failed.push({ id, format });
      }
    }),
  );

  // Deterministic output order: 1080 → 720 → 360 → mp3 so a claim prefers HD.
  type JobRef = YouTubeJobRef;
  const rank = (format: string): number => (format === "1080" ? 0 : format === "720" ? 1 : format === "360" ? 2 : 3);
  const byRank = (a: JobRef, b: JobRef): number => rank(a.format) - rank(b.format);
  ready.sort(byRank);
  processing.sort(byRank);
  failed.sort(byRank);

  const accessDenied = failed.some((job) => job.reason === "provider_access");
  const body: YouTubePollResponse = { ok: true, ready, processing, failed };
  return NextResponse.json(body, {
    status: accessDenied && ready.length === 0 && processing.length === 0 ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
      ...(accessDenied ? { "X-YouTube-Provider-Status": "access-denied" } : {}),
    },
  });
}

function errorResponse(body: { ok: false; error: { code: "INVALID_URL" | "RATE_LIMITED" | "BAD_REQUEST"; message: string } }): NextResponse {
  return NextResponse.json(
    body,
    { status: body.error.code === "RATE_LIMITED" ? 429 : 400, headers: { "Cache-Control": "no-store" } },
  );
}
