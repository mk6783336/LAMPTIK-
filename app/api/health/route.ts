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
 *   - `bridgeConfigured: false` → set YTDLP_BRIDGE_URL (or ensure the local
 *     binary) for ytdlp-android to join the resolve.
 *   - `bridgeReachable: false` (network-level failure, not a 4xx) → the
 *     bridge is down; fix the container before blaming resolution code.
 *   - `binaryAvailable: null` → the probe hasn't run on this isolate yet;
 *     `false` after a resolve means the binary is genuinely absent.
 */
export async function GET() {
  const ytdlp = await ytdlpEngineHealth();

  return NextResponse.json(
    {
      status: "ok",
      service: "lamp-tik",
      version: "1.0.0",
      time: new Date().toISOString(),
      youtube: {
        ytdlp: {
          bridgeConfigured: ytdlp.bridge.configured,
          bridgeReachable: ytdlp.bridge.reachable,
          binaryAvailable: ytdlp.binaryAvailable,
        },
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
