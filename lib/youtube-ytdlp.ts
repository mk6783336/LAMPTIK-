/**
 * yt-dlp stream extractor — the Android player client straight from the
 * source, for the environments that can actually run it.
 *
 *   yt-dlp --no-playlist --extractor-args "youtube:player_client=android"
 *          -f "best[ext=mp4]/best" -j <url>
 *
 * The Android client signature survives the web-client bot walls, and `-j`
 * answers title / author / duration / thumbnail with the picked format — a
 * real duration in one shot, so the result card can never show `0:00`.
 *
 * Two engines, tried in order:
 *  1. YTDLP_BRIDGE_URL  — a self-hosted yt-dlp HTTP endpoint (docker container
 *     / cobalt-style bridge). The production engine: Vercel's serverless
 *     runtime carries no Python and cannot spawn yt-dlp, but a small bridge
 *     container absolutely can, and its output URL is validated below and
 *     re-validated end-to-end by /api/download before any byte moves.
 *  2. Local `yt-dlp` binary — dev machines and self-hosted Node deployments
 *     where the executable is on PATH.
 *
 * Availability is probed ONCE per 10 minutes and cached: when neither engine
 * exists on this runtime (a plain Vercel deploy), the extractor throws a
 * clean AppError and the existing waterfall (mirrors → ytdl-core Innertube
 * ANDROID/IOS → converter jobs) continues untouched. Zero regression risk.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { AppError } from "@/lib/errors";
import { isPublicMediaUrl } from "@/lib/security";

const execFileAsync = promisify(execFile);

/** One resolved yt-dlp hit — progressive MP4 with audio, real duration. */
export interface YtdlpHit {
  /** Progressive MP4 (video+audio) direct stream URL. */
  video: string;
  /** Real length in seconds (> 0 when the source reports it). */
  duration: number;
  title: string;
  author: string;
  thumbnail: string | null;
  /** Which engine produced this: "bridge" | "binary". */
  engine: "bridge" | "binary";
}

/* ------------------------------------------------------------------ */
/* Engine 1: self-hosted HTTP bridge (YTDLP_BRIDGE_URL)                */
/* ------------------------------------------------------------------ */

const BRIDGE_TIMEOUT_MS = 12_000;

function httpsUrl(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\/.{4,4096}$/.test(value.trim()) ? value.trim() : null;
}

/** Bridge runs anywhere a container can; off unless configured. */
export function ytdlpBridgeUrl(): string | null {
  return httpsUrl(process.env.YTDLP_BRIDGE_URL ?? "");
}

/**
 * POST { url } → JSON { url | video, duration, title, uploader, thumbnail }.
 * The exact wire format any `yt-dlp -j` HTTP wrapper (or a cobalt instance
 * in JSON mode) can emit; unknown fields are ignored, missing ones error.
 */
async function bridgeExtract(bridgeUrl: string, canonicalUrl: string): Promise<YtdlpHit> {
  const response = await fetch(bridgeUrl.replace(/\/+$/, ""), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
    body: JSON.stringify({ url: canonicalUrl, client: "android" }),
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_UNAVAILABLE", `yt-dlp bridge answered ${response.status}.`);
  }
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp bridge returned a non-JSON body.");

  const video = [data.url, data.video, data.download_url].map(httpsUrl).find(Boolean);
  // Only a public https media URL ever leaves this function; /api/download
  // re-validates every hop chain end-to-end regardless.
  if (!video || !isPublicMediaUrl(video)) {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp bridge exposed no usable stream URL.");
  }
  const duration = typeof data.duration === "number" && data.duration > 0 ? Math.round(data.duration) : 0;
  return {
    video,
    duration,
    title: typeof data.title === "string" ? data.title.slice(0, 200) : "",
    author:
      typeof data.uploader === "string"
        ? data.uploader.slice(0, 120)
        : typeof data.author === "string"
          ? data.author.slice(0, 120)
          : "",
    thumbnail: httpsUrl(data.thumbnail),
    engine: "bridge",
  };
}

/* ------------------------------------------------------------------ */
/* Engine 2: local `yt-dlp` binary                                     */
/* ------------------------------------------------------------------ */

const YTDLP_ARGS = [
  "--no-playlist",
  "--no-warnings",
  "--extractor-args",
  "youtube:player_client=android",
  "-f",
  "best[ext=mp4]/best",
  "-j",
] as const;

const PROBE_TIMEOUT_MS = 4_000;
const EXTRACTION_TIMEOUT_MS = 12_000;
/** Probe result cached 10 minutes — resolve paths never pay for it twice. */
const AVAILABILITY_TTL_MS = 10 * 60_000;

let binaryProbe: { available: boolean; expiresAt: number } | null = null;

async function binaryAvailable(): Promise<boolean> {
  const now = Date.now();
  if (binaryProbe && binaryProbe.expiresAt > now) return binaryProbe.available;
  let available = false;
  try {
    await execFileAsync("yt-dlp", ["--version"], { timeout: PROBE_TIMEOUT_MS, windowsHide: true });
    available = true;
  } catch {
    available = false; // not on PATH / blocked runtime — waterfall continues
  }
  binaryProbe = { available, expiresAt: now + AVAILABILITY_TTL_MS };
  return available;
}

async function binaryExtract(canonicalUrl: string): Promise<YtdlpHit> {
  const { stdout } = await execFileAsync("yt-dlp", [...YTDLP_ARGS, canonicalUrl], {
    timeout: EXTRACTION_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  // `yt-dlp -j` prints exactly one JSON object per entry; --no-playlist keeps
  // it at one, but warnings could precede it — start at the first `{`.
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp produced no extract payload.");
  const data = JSON.parse(stdout.slice(jsonStart)) as Record<string, unknown>;

  const video = httpsUrl(data.url);
  if (!video || !isPublicMediaUrl(video)) {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp exposed no usable stream URL.");
  }
  const seconds = typeof data.duration === "number" ? data.duration : Number(data.duration);

  return {
    video,
    duration: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0,
    title: typeof data.title === "string" ? data.title.slice(0, 200) : "",
    author: typeof data.uploader === "string" ? data.uploader.slice(0, 120) : "",
    thumbnail: httpsUrl(data.thumbnail),
    engine: "binary",
  };
}

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

/**
 * Bridge (if configured) → local binary (if on PATH) → clean failure that
 * the callers' waterfall treats as "engine not available here", keeping the
 * mirrors / ytdl-core / converter engines in play.
 */
export async function ytdlpExtract(canonicalUrl: string): Promise<YtdlpHit> {
  const bridge = ytdlpBridgeUrl();
  if (bridge) {
    try {
      return await bridgeExtract(bridge, canonicalUrl);
    } catch {
      // Bridge down / rate-limited — fall through to the binary while the
      // waterfall's other engines race in parallel anyway.
    }
  }
  if (await binaryAvailable()) {
    return binaryExtract(canonicalUrl);
  }
  throw new AppError(
    "PROVIDER_UNAVAILABLE",
    "yt-dlp is not available on this runtime.",
    "Set YTDLP_BRIDGE_URL or install the yt-dlp binary for the Android-client extractor to join the waterfall.",
  );
}
