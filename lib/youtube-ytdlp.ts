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
 * Two optional engines, tried in order:
 *  1. A yt-dlp HTTP endpoint (YTDLP_WORKER_URL / NEXT_PUBLIC_YTDLP_WORKER_URL
 *     / YTDLP_BRIDGE_URL). Vercel's serverless runtime carries no Python and
 *     cannot spawn yt-dlp; if you host such an endpoint elsewhere, its output
 *     URL is validated below and re-validated end-to-end by /api/download
 *     before any byte moves.
 *  2. Local `yt-dlp` binary — dev machines and self-hosted Node deployments
 *     where the executable is on PATH.
 *
 * NEITHER is required — the site is fully self-contained on Vercel. When
 * neither engine exists (the normal production case) the bridge lookup
 * answers null (so no fetch is attempted) and the binary probe short-circuits
 * without spawning, so this module fails in microseconds with a clean
 * AppError and the JavaScript waterfall (mirrors → ytdl-core Innertube
 * ANDROID/IOS → converter jobs) carries the resolve. Zero delay, zero risk.
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
  /**
   * Audio-only track when the engine can expose one without a second run.
   *
   * The bridge signs this URL eagerly but resolves the audio ladder lazily on
   * the first byte request — the Android client that produces the muxed video
   * advertises no audio-only format, so resolving both up front would double
   * every resolve. `null` when no track is advertised (binary engine, other
   * platforms), which simply keeps the MP3 button disabled.
   */
  audio: string | null;
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

/**
 * Bridge runs anywhere a container can; off unless configured.
 *
 * Three names, checked in order:
 *   1. YTDLP_WORKER_URL            — runtime server env (preferred: change it
 *                                    without a rebuild).
 *   2. NEXT_PUBLIC_YTDLP_WORKER_URL — the name the deployment dashboard
 *                                    documents; inlined at build time, so a
 *                                    change needs a redeploy.
 *   3. YTDLP_BRIDGE_URL            — the original name, still honoured so
 *                                    existing deployments keep working.
 */
export function ytdlpBridgeUrl(): string | null {
  return (
    httpsUrl(process.env.YTDLP_WORKER_URL ?? "") ??
    httpsUrl(process.env.NEXT_PUBLIC_YTDLP_WORKER_URL ?? "") ??
    httpsUrl(process.env.YTDLP_BRIDGE_URL ?? "")
  );
}

/**
 * Vercel's serverless runtime ships no Python and no yt-dlp executable. The
 * probe therefore short-circuits there instead of paying an ENOENT spawn on
 * every cold isolate (and leaving an error in the function log for an engine
 * that can never work on that host).
 */
function hostingBlocksBinary(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * POST { url } → JSON { url | video, duration, title, uploader, thumbnail }.
 * The exact wire format any `yt-dlp -j` HTTP wrapper (or a cobalt instance
 * in JSON mode) can emit; unknown fields are ignored, missing ones error.
 */
async function bridgeExtract(bridgeUrl: string, canonicalUrl: string): Promise<YtdlpHit> {
  const bridgeSecret = process.env.BRIDGE_SECRET;
  const response = await fetch(bridgeUrl.replace(/\/+$/, ""), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(bridgeSecret ? { "x-bridge-secret": bridgeSecret } : {}),
    },
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
  const audio = httpsUrl(data.audio);
  const duration = typeof data.duration === "number" && data.duration > 0 ? Math.round(data.duration) : 0;
  return {
    video,
    audio: audio && isPublicMediaUrl(audio) ? audio : null,
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

/**
 * Shared with lib/universal-ytdlp.ts so every platform tier probes the
 * local binary through the SAME 10-minute cache (one probe per isolate).
 */
export async function binaryAvailable(): Promise<boolean> {
  if (hostingBlocksBinary()) return false;
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
  // A missing binary / killed process must surface as a clean engine "out",
  // never as an unhandled rejection that a route turns into a 500.
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("yt-dlp", [...YTDLP_ARGS, canonicalUrl], {
      timeout: EXTRACTION_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    }));
  } catch (error) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The local yt-dlp engine is unavailable on this runtime.",
      error instanceof Error ? error.message.slice(0, 160) : undefined,
    );
  }
  // `yt-dlp -j` prints exactly one JSON object per entry; --no-playlist keeps
  // it at one, but warnings could precede it — start at the first `{`.
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp produced no extract payload.");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(stdout.slice(jsonStart)) as Record<string, unknown>;
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp returned an unparseable payload.");
  }

  const video = httpsUrl(data.url);
  if (!video || !isPublicMediaUrl(video)) {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp exposed no usable stream URL.");
  }
  const seconds = typeof data.duration === "number" ? data.duration : Number(data.duration);

  return {
    video,
    // The local binary runs a single muxed-format extraction; an audio track
    // would need another spawn, so it stays unavailable here.
    audio: null,
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

/* ------------------------------------------------------------------ */
/* Engine health (surfaced on /api/health)                             */
/* ------------------------------------------------------------------ */

export interface YtdlpEngineHealth {
  bridge: {
    /** YTDLP_BRIDGE_URL is configured for this deployment. */
    configured: boolean;
    /** Last ping answered (any status, even 4xx = something is listening).
     *  null = no configured bridge, ping skipped. */
    reachable: boolean | null;
  };
  /** Native `yt-dlp` on PATH. null = probe never ran on this isolate. */
  binaryAvailable: boolean | null;
}

/** Bridge ping cached 60s so monitoring polling /api/health stays cheap. */
let bridgePing: { reachable: boolean; expiresAt: number } | null = null;

const BRIDGE_PING_TTL_MS = 60_000;
const BRIDGE_PING_TIMEOUT_MS = 3_000;

/**
 * One health snapshot — no streaming, no extraction, bounded well under a
 * second in the common case (bridge ping ≤3s worst case, cached 60s).
 * Frontline for production debugging of YouTube resolution: answers in a
 * single GET whether the strongest extractor is wired up or gracefully out.
 */
export async function ytdlpEngineHealth(): Promise<YtdlpEngineHealth> {
  const bridgeUrl = ytdlpBridgeUrl();
  if (!bridgeUrl) {
    return { bridge: { configured: false, reachable: null }, binaryAvailable: null };
  }

  const now = Date.now();
  if (!bridgePing || bridgePing.expiresAt <= now) {
    // ANY authoritative HTTP answer counts as reachable — even a 4xx means
    // something is listening at that host (our probe just isn't valid JSON
    // for it). Only network-level failure (DNS, refused, TLS, timeout) says
    // the bridge is down.
    let reachable = false;
    try {
      await fetch(bridgeUrl.replace(/\/+$/, ""), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(BRIDGE_PING_TIMEOUT_MS),
      });
      reachable = true;
    } catch {
      reachable = false; // DNS / connect / timeout — bridge is down
    }
    bridgePing = { reachable, expiresAt: now + BRIDGE_PING_TTL_MS };
  }

  return {
    bridge: { configured: true, reachable: bridgePing.reachable },
    binaryAvailable: binaryProbe ? binaryProbe.available : null,
  };
}
