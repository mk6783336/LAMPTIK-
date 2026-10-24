import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { AppError } from "@/lib/errors";
import { isPublicMediaUrl } from "@/lib/security";
import { binaryAvailable, ytdlpBridgeUrl } from "@/lib/youtube-ytdlp";

const execFileAsync = promisify(execFile);

/**
 * Universal yt-dlp extraction — one engine contract for ALL platforms.
 *
 *   yt-dlp --no-playlist --no-warnings
 *          --extractor-args "<platform flags>"
 *          -f "best[ext=mp4]/best" -j "<url>"
 *
 * Platforms and their fixed server-side flags (mirrored in the optional
 * worker contract — the two must stay in sync):
 *   youtube    → youtube:player_client=android   (delegates to the existing
 *                lib/youtube-ytdlp.ts engine, which is already battle-tested)
 *   tiktok     → tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com
 *                (the portable API host that datacenter IPs can still reach,
 *                 unlike the web-hostname tiers that are bot-walled)
 *   instagram  → plain Instagram extractor, no special args
 *   facebook   → plain Facebook extractor, no special args
 *
 * Same two engines as the YouTube tier, tried in order:
 *   1. An optional YTDLP_WORKER_URL / NEXT_PUBLIC_YTDLP_WORKER_URL /
 *      YTDLP_BRIDGE_URL endpoint, when one is configured. Sends the platform
 *      and the optional x-bridge-secret so the endpoint is ours alone.
 *   2. Local `yt-dlp` binary — dev machines / self-hosted Node runtimes.
 *
 * On Vercel neither exists, and that is the normal, supported state: the
 * bridge lookup answers null and the binary probe short-circuits, so this
 * module throws in microseconds and the per-platform JavaScript waterfalls
 * carry every resolve. Callers treat that as "engine out" — no delay, no
 * unhandled rejection, zero regression risk.
 */

export type UniversalPlatform = "youtube" | "tiktok" | "instagram" | "facebook";

/** One resolved hit — progressive MP4 (video+audio) plus optional extras. */
export interface UniversalHit {
  id: string;
  /** Progressive MP4 (video+audio) direct stream URL. */
  video: string;
  /** Distinct lower-bitrate progressive rendition, when yt-dlp exposed one. */
  videoSd: string | null;
  title: string;
  author: string;
  /** Real length in seconds (0 when the source reports none). */
  duration: number;
  thumbnail: string | null;
  /** Which engine produced this: "bridge" | "binary" | "youtube-engine". */
  engine: "bridge" | "binary" | "youtube-engine";
}

const BRIDGE_TIMEOUT_MS = 10_000;
const BINARY_TIMEOUT_MS = 12_000;

function httpsUrl(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\/.{4,4096}$/.test(value.trim())
    ? value.trim()
    : null;
}

/* ------------------------------------------------------------------ */
/* Per-platform fixed flags (mirror of the worker contract)             */
/* ------------------------------------------------------------------ */

function platformExtractorArgs(platform: UniversalPlatform): string[] {
  switch (platform) {
    case "youtube":
      return ["--extractor-args", "youtube:player_client=android"];
    case "tiktok":
      return ["--extractor-args", "tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com"];
    case "instagram":
    case "facebook":
      return [];
  }
}

const FORMAT_FLAG = "best[ext=mp4]/best";

/** yt-dlp `-j` record, narrowly typed — unknown fields are ignored. */
interface YtdlpJson {
  id?: unknown;
  url?: unknown;
  duration?: unknown;
  title?: unknown;
  uploader?: unknown;
  uploader_id?: unknown;
  channel?: unknown;
  thumbnail?: unknown;
  formats?: unknown;
}

interface RawFormat {
  url: string;
  /** Total bitrate (kbps) — the ranking signal yt-dlp itself sorts by. */
  bitrate: number;
  ext: string;
}

/**
 * Flatten `formats` into progressive (video+audio) https MP4 candidates,
 * best-first — the same selection `best[ext=mp4]/best` performs, exposed so
 * a distinct SD rendition can ride along as Server 02. Manifest protocols
 * (m3u8/dash) are excluded: they are not single-file attachments.
 */
function progressiveMp4Formats(data: YtdlpJson): RawFormat[] {
  if (!Array.isArray(data.formats)) return [];
  const candidates: RawFormat[] = [];
  for (const entry of data.formats) {
    if (!entry || typeof entry !== "object") continue;
    const format = entry as Record<string, unknown>;
    const url = httpsUrl(format.url);
    if (!url || !isPublicMediaUrl(url)) continue;
    if (typeof format.ext !== "string" || format.ext !== "mp4") continue;
    if (typeof format.vcodec !== "string" || format.vcodec === "none") continue;
    if (typeof format.acodec !== "string" || format.acodec === "none") continue;
    const protocol = typeof format.protocol === "string" ? format.protocol : "https";
    if (protocol !== "https" && protocol !== "http") continue;
    const bitrate =
      typeof format.tbr === "number"
        ? format.tbr
        : typeof format.bitrate === "number"
          ? format.bitrate
          : 0;
    candidates.push({ url, bitrate, ext: format.ext });
  }
  candidates.sort((a, b) => b.bitrate - a.bitrate);
  return candidates;
}

function sharedHitFields(data: YtdlpJson, fallbackId: string): Pick<UniversalHit, "id" | "title" | "author" | "duration" | "thumbnail"> {
  const seconds = typeof data.duration === "number" ? data.duration : Number(data.duration);
  const author =
    (typeof data.uploader === "string" && data.uploader.trim().slice(0, 120)) ||
    (typeof data.uploader_id === "string" && data.uploader_id.trim().slice(0, 120)) ||
    (typeof data.channel === "string" && data.channel.trim().slice(0, 120)) ||
    "";
  return {
    id: (typeof data.id === "string" && data.id.trim().slice(0, 120)) || fallbackId,
    title: typeof data.title === "string" ? data.title.slice(0, 200) : "",
    author,
    duration: Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0,
    thumbnail: httpsUrl(data.thumbnail),
  };
}

/* ------------------------------------------------------------------ */
/* Engine 1: self-hosted HTTP bridge (YTDLP_BRIDGE_URL)                  */
/* ------------------------------------------------------------------ */

async function bridgeExtract(
  bridgeUrl: string,
  canonicalUrl: string,
  platform: UniversalPlatform,
): Promise<UniversalHit> {
  const secret = process.env.BRIDGE_SECRET;
  const response = await fetch(bridgeUrl.replace(/\/+$/, ""), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(secret ? { "x-bridge-secret": secret } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
    body: JSON.stringify({ url: canonicalUrl, platform }),
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
  return {
    ...sharedHitFields(data as YtdlpJson, ""),
    video,
    videoSd: null, // the bridge answers one URL per call; Server 02 falls back
    engine: "bridge",
  };
}

/* ------------------------------------------------------------------ */
/* Engine 2: local `yt-dlp` binary                                     */
/* ------------------------------------------------------------------ */

async function binaryExtract(
  canonicalUrl: string,
  platform: UniversalPlatform,
): Promise<UniversalHit> {
  // Spawn, timeout and parse failures all normalize to AppError: a caller's
  // waterfall sees "engine out", never an unhandled rejection.
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "yt-dlp",
      ["--no-playlist", "--no-warnings", ...platformExtractorArgs(platform), "-f", FORMAT_FLAG, "-j", canonicalUrl],
      {
        timeout: BINARY_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      },
    ));
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
  let data: YtdlpJson;
  try {
    data = JSON.parse(stdout.slice(jsonStart)) as YtdlpJson;
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp returned an unparseable payload.");
  }

  // Prefer the format yt-dlp itself selected; otherwise synthesize the same
  // pick from the format list. Both must clear the public-https SSRF gate.
  const selected = httpsUrl(data.url);
  const fused = selected && isPublicMediaUrl(selected) ? selected : null;
  const candidates = progressiveMp4Formats(data);
  const best = fused ?? candidates[0]?.url ?? null;
  if (!best) throw new AppError("PROVIDER_UNAVAILABLE", "yt-dlp exposed no usable stream URL.");
  // Server 02: the next DISTINCT rendition — one rung below the winner on
  // the same sorted ladder (a duplicate of the winner yields no Server 02,
  // so the Downloads tray never shows two identical files).
  const top = candidates[0];
  const videoSd =
    top && top.url !== best ? top.url : (top && candidates[1] ? candidates[1].url : null);

  return {
    ...sharedHitFields(data, ""),
    video: best,
    videoSd,
    engine: "binary",
  };
}

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

/**
 * Bridge (if configured) → local binary (if on PATH) → clean failure that
 * callers treat as "engine not available here". For youtube this delegates
 * to the dedicated Android-client engine in lib/youtube-ytdlp.ts.
 */
export async function universalYtdlpHit(
  canonicalUrl: string,
  platform: UniversalPlatform,
): Promise<UniversalHit> {
  if (platform === "youtube") {
    // Delegate: same bridge contract, same binary engine, cached probe.
    const { ytdlpExtract } = await import("@/lib/youtube-ytdlp");
    const hit = await ytdlpExtract(canonicalUrl);
    return {
      id: "",
      title: hit.title,
      author: hit.author,
      duration: hit.duration,
      thumbnail: hit.thumbnail,
      video: hit.video,
      videoSd: null,
      engine: "youtube-engine",
    };
  }

  const bridge = ytdlpBridgeUrl();
  if (bridge) {
    try {
      return await bridgeExtract(bridge, canonicalUrl, platform);
    } catch {
      // Bridge down / rate-limited — fall through to the binary while the
      // caller's own waterfall tiers race in parallel anyway.
    }
  }
  if (await binaryAvailable()) {
    return binaryExtract(canonicalUrl, platform);
  }
  throw new AppError(
    "PROVIDER_UNAVAILABLE",
    "yt-dlp is not available on this runtime.",
    "Set YTDLP_BRIDGE_URL or install the yt-dlp binary for the universal extractor to join the waterfall.",
  );
}
