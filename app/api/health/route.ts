import { NextResponse } from "next/server";

import { ytdlpEngineHealth } from "@/lib/youtube-ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — uptime probe + YouTube extraction engine snapshot.
 *
 * The `youtube.ytdlp` section answers the one production debugging question
 * about resolution failures in a single request: is the strongest extractor
 * (Android-player-client yt-dlp) wired up here, or is the waterfall running
 * on mirrors / ytdl-core / converter engines alone?
 *   - `bridgeConfigured: false` → the normal self-contained state: no
 *     optional yt-dlp endpoint is set, so the JavaScript engines carry every
 *     resolve and nothing external has to be deployed.
 *   - `bridgeReachable: false` (only when configured; network-level failure,
 *     not a 4xx) → that endpoint is down; resolution has already fallen back,
 *     so fix the endpoint only if you want that tier back.
 *   - `binaryAvailable: null` → the probe hasn't run on this isolate (Vercel
 *     short-circuits it); `false` after a resolve means it is absent.
 */
export async function GET() {
  // The probe pings a third-party bridge; a probe failure must never make
  // the uptime endpoint itself fail (Vercel would count that as an error).
  let ytdlp: Awaited<ReturnType<typeof ytdlpEngineHealth>> | null = null;
  try {
    ytdlp = await ytdlpEngineHealth();
  } catch {
    ytdlp = null;
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "lamp-tik",
      version: "1.0.0",
      time: new Date().toISOString(),
      youtube: {
        ytdlp: {
          bridgeConfigured: ytdlp?.bridge.configured ?? false,
          bridgeReachable: ytdlp?.bridge.reachable ?? null,
          binaryAvailable: ytdlp?.binaryAvailable ?? null,
        },
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
