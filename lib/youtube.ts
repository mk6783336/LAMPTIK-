import ytdl from "@distube/ytdl-core";

import { AppError } from "@/lib/errors";
import { asRecord, asString, cleanCaption, DESKTOP_UA, toDuration } from "@/lib/http";
import { runWaterfall, WATERFALL_TIMEOUT_MS } from "@/lib/load-balancer";
import { ytdlpExtract } from "@/lib/youtube-ytdlp";
import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";

/**
 * Bulletproof multi-provider YouTube resolution engine.
 *
 * Chain (first stream wins; metadata-only Phase B never 500s):
 *   1. Loader.to / OceanSaver conversion API (`loader.to/ajax/download.php`) —
 *      runs on residential proxy pools, so it keeps working from datacenter
 *      IPs (Vercel) where YouTube bot-checks everything else. Start a 1080p
 *      MP4 + MP3 job, poll the returned `progress_url` until `success`
 *      yields a `download_url`. (The legacy `p.oceansaver.in` host is dead —
 *      NXDOMAIN — the same API now lives on `loader.to`.)
 *   2. Public Invidious / Piped API cluster (2026-active instances:
 *      inv.nadeko.net, invidious.nerdvpn.de, pipedapi.adminforge.de) —
 *      muxed MP4 + audio mirrors. The legacy kavin.rocks / tokhmi.xyz /
 *      reallyaweso.me / tux.pizza hosts are dead and were removed.
 *   3. `@distube/ytdl-core` (TV_EMBEDDED / IOS player clients) — clean
 *      signature-deciphered extraction of muxed progressive MP4 (720p itag
 *      22 / 360p itag 18) + highest-bitrate audio.
 *   4. Innertube `/youtubei/v1/player` (ANDROID / IOS / TV_EMBEDDED clients)
 *      via direct fetch — same streams, no dependency in the loop.
 *   5. noembed / oEmbed metadata — proves the video exists so failures answer
 *      with a friendly retry message, never a raw error dump.
 *      (NOTE: the legacy cobalt `co.wuk.sh/api/json` endpoint was shut down
 *      2024-11-11 and current cobalt instances require per-owner API keys /
 *      Turnstile, so cobalt is deliberately NOT in this chain.)
 *
 * Everything here resolves small-JSON metadata only — no media bytes are ever
 * buffered. Files stream through `/api/download` chunk-by-chunk (Range
 * pass-through, 206 Partial Content), so long videos hold < 15MB of RAM.
 */

export interface YouTubeStreams {
  /** Best progressive MP4 (1080p via mirrors, else 720p, else 360p). */
  video: string | null;
  /** Lower-bitrate MP4, when distinct from `video`. */
  videoSd: string | null;
  /** Highest-bitrate audio (M4A/MP3-ready), when exposed. */
  audio: string | null;
}

export interface ResolvedYouTube {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  streams: YouTubeStreams;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function hostIs(hostname: string, base: string): boolean {
  const host = hostname.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}

/** Accept watch / shorts / youtu.be / embed / live / music links. */
export function parseYouTubeUrl(raw: string): { id: string; canonicalUrl: string } | null {
  if (typeof raw !== "string") return null;
  const input = raw.trim();
  if (!input || input.length > 2_048) return null;

  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  let id: string | null = null;
  if (hostIs(host, "youtu.be")) {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    hostIs(host, "youtube.com") ||
    hostIs(host, "youtube-nocookie.com") ||
    hostIs(host, "music.youtube.com")
  ) {
    const path = url.pathname;
    const param = url.searchParams.get("v");
    if (param && YT_ID.test(param)) {
      id = param;
    } else {
      const segments = path.split("/").filter(Boolean);
      const head = segments[0]?.toLowerCase();
      if ((head === "shorts" || head === "embed" || head === "live" || head === "v") && segments[1]) {
        id = YT_ID.test(segments[1]) ? segments[1] : null;
      }
    }
  } else {
    return null;
  }

  if (!id || !YT_ID.test(id)) return null;
  return { id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
}

/* ------------------------------------------------------------------ Tier 1 */

/**
 * Loader.to / OceanSaver conversion API.
 *
 * `download.php` starts a conversion job and returns `id` + `progress_url`
 * (plus title/thumbnail metadata); polling that `progress_url` reports
 * `success` and the final `download_url` once the file is ready. The service
 * extracts streams through its own residential proxy pool, so it resolves
 * videos that bot-check datacenter IPs.
 */
const LOADER_DOWNLOAD_API = "https://loader.to/ajax/download.php";
const LOADER_FALLBACK_PROGRESS = "https://loader.to/ajax/progress.php";
const LOADER_V2_PROGRESS = "https://lto2.affadaffa.com/api/progress";
/** Every video rendition starts as its own conversion job; first done wins. */
const LOADER_VIDEO_FORMATS = ["1080", "720", "360"] as const;
const LOADER_POLL_MS = 1_200;
const LOADER_MAX_POLLS = 25;
/** Budget for the conversion path (job start + polling). Measured: real
 *  conversions land between ~2s (Shorts) and ~30s (long 1080p uploads).
 *  It runs in parallel with the direct providers, so a slow conversion never
 *  delays a fast mirror — and a bot-checked direct path never starves it. */
const LOADER_TIMEOUT_MS = 30_000;

interface TierHit {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  streams: YouTubeStreams | null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return /^https:\/\//.test(url) && !isKnownLoaderInterstitialUrl(url) ? url : null;
}

/** Primary: ytdl-core clean extraction (deciphered signatures included). */
async function ytdlCoreResolve(videoId: string, canonicalUrl: string): Promise<TierHit> {
  const info = await ytdl.getInfo(canonicalUrl);

  const details = info.videoDetails;
  if (!details) throw new AppError("PROVIDER_UNAVAILABLE", "YouTube returned an empty video page.");
  if (details.isPrivate === true) {
    throw new AppError(
      "VIDEO_PRIVATE",
      "This YouTube video is private or needs login.",
      "Public videos and Shorts download normally.",
    );
  }
  if (details.isLiveContent === true) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "Livestreams can't be downloaded — only published videos and Shorts.",
    );
  }

  const title = cleanCaption(details.title || `YouTube video ${videoId}`, 200) || `YouTube video ${videoId}`;
  const author =
    (typeof details.author === "object" && details.author && "name" in details.author
      ? String((details.author as { name?: unknown }).name ?? "")
      : "") || "YouTube";
  const duration = Number(details.lengthSeconds) > 0 ? Math.round(Number(details.lengthSeconds)) : 0;
  const thumbs = Array.isArray(details.thumbnails) ? details.thumbnails : [];
  const thumbnail =
    httpsUrl(thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url : null) ??
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Muxed progressive MP4 only — never offer a silent adaptive file as the
  // primary download. Prefer 720p, then 360p, then the tallest available.
  const muxed = ytdl
    .filterFormats(info.formats, "videoandaudio")
    .filter((f) => httpsUrl(f.url) && (f.container === "mp4" || (f.mimeType ?? "").includes("video/mp4")));
  const byHeight = [...muxed].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  const hd = byHeight.find((f) => (f.height ?? 0) >= 700) ?? byHeight.find((f) => (f.height ?? 0) >= 300) ?? null;
  const sd = byHeight.find((f) => hd && f.url !== hd.url && (f.height ?? 0) < (hd.height ?? 0)) ?? null;

  const audioOnly = ytdl
    .filterFormats(info.formats, "audioonly")
    .filter((f) => httpsUrl(f.url))
    .sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));
  const audio = audioOnly[0]?.url ?? null;

  const primary = httpsUrl(hd?.url) ?? httpsUrl(byHeight[0]?.url) ?? null;
  if (!primary && !audio) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — no downloadable file yet.",
      "Mirrors are rotating automatically; retry in a moment.",
    );
  }
  return {
    id: videoId,
    title,
    author,
    duration,
    thumbnail,
    streams: {
      video: primary,
      videoSd: primary && sd?.url && sd.url !== primary ? sd.url : null,
      audio,
    },
  };
}

interface LoaderJob {
  /** Converter job id — the client-side poller needs it after the resolving
   *  function has returned, so long videos never die inside the function's
   *  own execution ceiling. */
  id: string | null;
  progressUrl: string;
  downloadUrl: string | null;
  title: string | null;
  thumbnail: string | null;
}

/** Start one conversion job (`1080` MP4 or `mp3`). */
async function loaderStartJob(format: string, canonicalUrl: string): Promise<LoaderJob> {
  const endpoint = `${LOADER_DOWNLOAD_API}?format=${format}&url=${encodeURIComponent(canonicalUrl)}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Referer: "https://loader.to/",
      Origin: "https://loader.to",
      "User-Agent": DESKTOP_UA,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_UNAVAILABLE", "The converter mirror didn't answer.");
  }
  const data = asRecord(await response.json().catch(() => null));
  if (!data) {
    throw new AppError("PROVIDER_UNAVAILABLE", "The converter mirror returned an empty response.");
  }
  if (converterAccessBlocked(data)) {
    throw new AppError(
      "PROVIDER_ACCESS_DENIED",
      "The YouTube converter no longer allows this site to use its API.",
      "The converter now requires authorized API access. Configure a working YTDLP_BRIDGE_URL or restore API access with the converter provider.",
    );
  }
  const direct = httpsUrl(data.download_url);
  const id = asString(data.id) ?? asString(data.hid) ?? "";
  const hasConverterAccess = data.api_access !== false && data.application_access !== false;
  const progressUrl =
    httpsUrl(data.progress_url) ??
    (id && hasConverterAccess ? `${LOADER_FALLBACK_PROGRESS}?id=${encodeURIComponent(id)}` : "");
  if (!direct && !progressUrl) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The converter mirror didn't accept this video.",
      "No valid conversion job or media URL was returned.",
    );
  }
  const info = asRecord(data.info);
  return {
    id,
    progressUrl,
    downloadUrl: direct,
    title: asString(info?.title) ?? asString(data.title) ?? null,
    thumbnail: httpsUrl(data.thumbnail_url) ?? httpsUrl(info?.image) ?? null,
  };
}

/** `loader.to` job ids are opaque slugs; the poll route revalidates them. */
const LOADER_JOB_ID = /^[A-Za-z0-9_-]{4,96}$/;

/** Canonical progress endpoint for a started job. */
export function loaderProgressUrl(jobId: string): string {
  const endpoint = jobId.startsWith("v2_stream_") ? LOADER_V2_PROGRESS : LOADER_FALLBACK_PROGRESS;
  return `${endpoint}?id=${encodeURIComponent(jobId)}`;
}

export type LoaderJobPoll =
  | { status: "ready"; downloadUrl: string }
  | { status: "processing"; /** Converter's own 0–100 % when reported. */
      progress: number | null }
  | { status: "error"; reason?: "provider_access" };

/** Loader currently returns a nonzero progress (often 50) while denying API
 *  use in `message`; that is terminal, not a conversion still in progress. */
function converterAccessBlocked(data: Record<string, unknown>): boolean {
  const message = asString(data.message) ?? "";
  return /application.{0,80}use our api.{0,120}contact us/i.test(message);
}

/**
 * ONE poll beat against a started conversion job. Shared by the server-side
 awaiter (loaderAwaitJob) and GET /api/youtube/poll (the client-assisted
 completion loop that survives serverless execution ceilings). A transient
 network hiccup answers "processing" — the caller simply retries.
 */
export async function pollLoaderJob(jobId: string): Promise<LoaderJobPoll> {
  if (!LOADER_JOB_ID.test(jobId)) return { status: "error" };
  const finish = (status: "processing", progress: number | null): LoaderJobPoll => ({ status, progress });
  const result = await fetch(loaderProgressUrl(jobId), {
    headers: {
      Accept: "application/json",
      Referer: "https://loader.to/",
      "User-Agent": DESKTOP_UA,
    },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
  })
    .then(async (response) => ({
      status: response.status,
      data: asRecord(await response.json().catch(() => null)),
    }))
    .catch(() => null);
  if (!result) return finish("processing", null);
  const { data, status } = result;
  if (!data) {
    return status === 404 || status === 410 || (status >= 400 && status < 500 && status !== 429)
      ? { status: "error" }
      : finish("processing", null);
  }
  const rawDone = data.download_url ?? data.downloadUrl ?? data.file_url;
  if (converterAccessBlocked(data)) {
    return { status: "error", reason: "provider_access" };
  }
  if (status === 404 || status === 410 || /progress not found/i.test(asString(data.message) ?? "")) {
    return { status: "error" };
  }
  // Loader's current v2 API can mark a job complete but return a Savenow
  // `/api/v2/download/<hash>` URL that redirects through `/ajax/ad/` to an
  // offer page, not a media file. Never surface that URL as a ready stream.
  if (typeof rawDone === "string" && isKnownLoaderInterstitialUrl(rawDone)) {
    return { status: "error" };
  }
  const done = httpsUrl(rawDone);
  if (done) return { status: "ready", downloadUrl: done };
  // loader.to answers `success: 0` while converting and `-1` when a job
  // died (cancelled upstream, dead cache pool, region-blocked worker).
  if (Number(data.success) === -1 || Number(data.progress) === -1) return { status: "error" };
  const reported = typeof data.progress === "number" && Number.isFinite(data.progress) ? data.progress : null;
  return finish("processing", reported !== null && reported >= 0 && reported < 100 ? reported : null);
}

/** Poll a conversion job until `success` yields a `download_url`. */
async function loaderAwaitJob(job: LoaderJob): Promise<string> {
  if (job.downloadUrl) return job.downloadUrl;
  if (!job.progressUrl) {
    throw new AppError("PROVIDER_UNAVAILABLE", "The converter mirror didn't accept this video.");
  }
  for (let poll = 0; poll < LOADER_MAX_POLLS; poll += 1) {
    if (poll > 0) await new Promise((resolve) => setTimeout(resolve, LOADER_POLL_MS));
    // A transient network hiccup mid-poll answers "processing" — keep
    // polling until the budget is spent.
    const beat = await pollLoaderJob(job.progressUrl ? jobIdFromProgressUrl(job.progressUrl) : "");
    if (beat.status === "ready") return beat.downloadUrl;
    if (beat.status === "error") {
      throw new AppError(
        beat.reason === "provider_access" ? "PROVIDER_ACCESS_DENIED" : "PROVIDER_UNAVAILABLE",
        beat.reason === "provider_access"
          ? "The YouTube converter requires authorized API access."
          : "The converter job failed upstream — retry shortly.",
        beat.reason === "provider_access"
          ? "Configure an authorized YouTube extraction bridge or provider API access."
          : undefined,
      );
    }
  }
  throw new AppError("PROVIDER_UNAVAILABLE", "The converter mirror is still processing this video.");
}

/** Recover the job id out of an original progress_url (fallback form). */
function jobIdFromProgressUrl(progressUrl: string): string {
  try {
    const id = new URL(progressUrl).searchParams.get("id");
    return id && LOADER_JOB_ID.test(id) ? id : "__invalid__";
  } catch {
    return "__invalid__";
  }
}

/**
 * POST /youtubei/v1/player purely for METADATA: the real duration in seconds.
 * The converted-file path gives us a stream but never a duration, and the
 * result card must never show "Duration 0:00" — that metered metadata probe
 * usually answers even when YouTube bot-checks every stream provider.
 */
async function innertubeDuration(videoId: string): Promise<number> {
  const response = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
      "User-Agent": DESKTOP_UA,
    },
    signal: AbortSignal.timeout(7_000),
    body: JSON.stringify({
      videoId,
      // The WEB client answers videoDetails (title + lengthSeconds) even when
      // it refuses to hand out streams — exactly what a metadata probe needs.
      // The ANDROID client returns an empty player response instead.
      context: { client: { clientName: "WEB", clientVersion: "2.20240304.00.00", hl: "en", gl: "US" } },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    cache: "no-store",
  });
  if (!response.ok) return 0;
  const root = asRecord(await response.json().catch(() => null));
  return toDuration(asRecord(root?.videoDetails)?.lengthSeconds);
}

/** Primary: Loader.to/OceanSaver — works from datacenter IPs. */
async function loaderResolve(videoId: string, canonicalUrl: string): Promise<TierHit> {
  // oEmbed gives title/author; Innertube gives the real duration. Both run
  // concurrently with the conversions instead of after them.
  const metaPromise = oembedMeta(videoId, canonicalUrl).catch(() => null);
  const durationPromise = innertubeDuration(videoId).catch(() => 0);

  // Conversion jobs for EVERY rendition start together; whichever conversion
  // finishes first wins the primary slot. Long videos fail on a single 1080p
  // job all the time (cache pressure, warm 360p pool) while a lower rendition
  // lands in seconds — never leave the user waiting on one queue.
  const races = LOADER_VIDEO_FORMATS.map(async (format) => {
    const job = await loaderStartJob(format, canonicalUrl);
    return loaderAwaitJob(job);
  });
  const audioRace = (async () => {
    try {
      const mp3 = await loaderStartJob("mp3", canonicalUrl);
      return await loaderAwaitJob(mp3);
    } catch {
      return null;
    }
  })();

  // Promise.any: first fulfilled conversion wins; only when every video
  // rendition rejects does the path fail (aggregate error carries the last
  // AppError back to the waterfall).
  const [winner, audioUrl, meta, duration] = await Promise.all([
    Promise.any(races),
    audioRace,
    metaPromise,
    durationPromise,
  ]);
  const videoUrl = winner;

  return {
    id: videoId,
    title: meta?.title ?? `YouTube video ${videoId}`,
    author: meta?.author ?? "YouTube",
    // Real seconds: Innertube metadata probe first — a card that says
    // "Duration 0:00" is a bug, not a degraded state.
    duration,
    thumbnail: meta?.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: { video: videoUrl, videoSd: null, audio: audioUrl },
  };
}

/* ------------------------------------------------------------------ Tier 2 */

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`;

const INNERTUBE_CLIENTS = [
  { name: "youtube:innertube-android", context: { clientName: "ANDROID", clientVersion: "19.09.37", hl: "en", gl: "US" } },
  { name: "youtube:innertube-ios", context: { clientName: "IOS", clientVersion: "19.09.37", hl: "en", gl: "US" } },
  // ANDROID_VR is the client YouTube has left least guarded: it still hands
  // back progressive/adaptive googlevideo URLs without a PoToken challenge,
  // which is exactly what a datacenter IP (Vercel) needs.
  {
    name: "youtube:innertube-android-vr",
    context: { clientName: "ANDROID_VR", clientVersion: "1.62.27", hl: "en", gl: "US" },
  },
  {
    name: "youtube:innertube-tv",
    context: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0", hl: "en", gl: "US" },
  },
] as const;

interface InnertubeFormat {
  itag?: number;
  url?: string;
  signatureCipher?: string;
  mimeType?: string;
  qualityLabel?: string;
  bitrate?: number;
}

function parseCipherUrl(cipher: string): string | null {
  try {
    const params = new URLSearchParams(cipher);
    const base = params.get("url");
    if (base && base.includes("googlevideo.com")) return base;
  } catch {
    // Not a parseable cipher — unusable here.
  }
  return null;
}

async function innertubePlayer(
  videoId: string,
  client: (typeof INNERTUBE_CLIENTS)[number],
): Promise<TierHit> {
  const response = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
      "User-Agent": DESKTOP_UA,
    },
    body: JSON.stringify({
      videoId,
      context: { client: { ...client.context, androidSdkVersion: 30 } },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_UNAVAILABLE", "YouTube didn't answer the metadata request.");
  }
  const root = asRecord(await response.json().catch(() => null));
  if (!root) throw new AppError("PROVIDER_UNAVAILABLE", "YouTube returned an empty player response.");

  const status = asString(asRecord(root.playabilityStatus)?.status)?.toUpperCase() ?? "";
  const reason = asString(asRecord(root.playabilityStatus)?.reason) ?? "";
  if (status === "LOGIN_REQUIRED" || status === "UNPLAYABLE") {
    throw new AppError(
      "VIDEO_PRIVATE",
      "This YouTube video needs login, is age-restricted, or is private.",
      "Public videos and Shorts download normally.",
    );
  }
  if (status !== "OK") {
    if (/unavailable|not found|deleted/i.test(reason)) {
      throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found — it may be deleted or private.");
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — YouTube refused this playback.",
      "Retry in a moment.",
    );
  }

  const details = asRecord(root.videoDetails) ?? {};
  const streaming = asRecord(root.streamingData);
  const muxed = Array.isArray(streaming?.formats) ? (streaming?.formats as InnertubeFormat[]) : [];
  const adaptive = Array.isArray(streaming?.adaptiveFormats) ? (streaming?.adaptiveFormats as InnertubeFormat[]) : [];

  const thumbArray = asRecord(details.thumbnail);
  const thumbs = Array.isArray(thumbArray?.thumbnails) ? thumbArray?.thumbnails : [];
  const thumbUrl =
    (thumbs as Array<{ url?: unknown }>).reduce<string | null>(
      (best, t) => (typeof t.url === "string" && t.url ? t.url : best),
      null,
    ) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  let hd: string | null = null;
  let sd: string | null = null;
  for (const format of muxed) {
    const url = typeof format.url === "string" && format.url.includes("googlevideo.com") ? format.url : null;
    if (!url || !(format.mimeType ?? "").includes("video/mp4")) continue;
    if (format.itag === 22 || format.qualityLabel === "720p") hd = hd ?? url;
    else if (format.itag === 18 || format.qualityLabel === "360p") sd = sd ?? url;
    else if (!hd) hd = url;
  }
  // Audio pick order: AAC/M4A first, then anything else. Opus/WebM (itag
  // 251) is routinely paced to a trickle by googlevideo on a plain sequential
  // GET while its ranged reads are fast, which made the MP3 hand-off stall at
  // 16 KB. M4A also saves with a matching extension instead of a WebM body
  // wearing an .mp3 name.
  let audioM4a: string | null = null;
  let audioM4aBitrate = 0;
  let audioAny: string | null = null;
  let audioAnyBitrate = 0;
  for (const format of adaptive) {
    const mime = format.mimeType ?? "";
    if (!mime.includes("audio/")) continue;
    const url =
      (typeof format.url === "string" && format.url.includes("googlevideo.com") ? format.url : null) ??
      (format.signatureCipher ? parseCipherUrl(format.signatureCipher) : null);
    if (!url) continue;
    const bitrate = typeof format.bitrate === "number" ? format.bitrate : 0;
    if (mime.includes("audio/mp4")) {
      if (bitrate >= audioM4aBitrate) {
        audioM4aBitrate = bitrate;
        audioM4a = url;
      }
    } else if (bitrate >= audioAnyBitrate) {
      audioAnyBitrate = bitrate;
      audioAny = url;
    }
  }
  const audio = audioM4a ?? audioAny;

  const primary = hd ?? sd;
  if (!primary && !audio) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — ciphered response, trying mirrors.",
      "Your download buttons appear as soon as a stream lands.",
    );
  }
  return {
    id: videoId,
    title: cleanCaption(asString(details.title) ?? `YouTube video ${videoId}`, 200) || `YouTube video ${videoId}`,
    author: asString(details.author) ?? "YouTube",
    duration: toDuration(details.lengthSeconds),
    thumbnail: thumbUrl,
    streams: {
      video: primary,
      videoSd: primary && sd && sd !== primary ? sd : null,
      audio,
    },
  };
}

/* ------------------------------------------------------------------ Tier 3 */

// 2026-active public instances. The legacy kavin.rocks / tokhmi.xyz /
// reallyaweso.me / tux.pizza domains are dead and were removed.
const PIPED_APIS = ["https://pipedapi.kavin.rocks", "https://pipedapi.adminforge.de"];

const INVIDIOUS_APIS = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de"];

/**
 * yt-dlp with the forced Android player client (`player_client=android`).
 * The strongest direct extractor available: the Android client signature
 * survives the web bot walls, and the `-j` payload carries a REAL duration
 * and title, so a ytdlp winner can never land as a `0:00` card. Runs where
 * the binary or a configured bridge exists; anywhere else it fails fast to
 * a clean AppError and the rest of the waterfall keeps racing.
 */
async function ytdlpAndroidResolve(videoId: string, canonicalUrl: string): Promise<TierHit> {
  const hit = await ytdlpExtract(canonicalUrl);
  return {
    id: videoId,
    title: hit.title || `YouTube video ${videoId}`,
    author: hit.author || "YouTube",
    duration: hit.duration,
    thumbnail: hit.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: { video: hit.video, videoSd: null, audio: null },
  };
}

interface PipedStream {
  url?: unknown;
  quality?: unknown;
  mimeType?: unknown;
  videoOnly?: unknown;
  bitrate?: unknown;
}

function pipedVideo(streams: unknown): string | null {
  if (!Array.isArray(streams)) return null;
  const rank = (quality: unknown): number => {
    if (quality === "1080p") return 4;
    if (quality === "720p") return 3;
    if (quality === "480p") return 2;
    if (quality === "360p") return 1;
    return 0;
  };
  let best: string | null = null;
  let bestRank = -1;
  let fallback: string | null = null;
  for (const entry of streams as PipedStream[]) {
    if (typeof entry.url !== "string" || !/^https:\/\//.test(entry.url)) continue;
    if (entry.videoOnly === true) continue;
    if (typeof entry.mimeType === "string" && !entry.mimeType.includes("video/mp4")) continue;
    const r = rank(entry.quality);
    fallback = fallback ?? entry.url;
    if (r > bestRank) {
      bestRank = r;
      best = entry.url;
    }
  }
  return best ?? fallback;
}

function pipedAudio(streams: unknown): string | null {
  if (!Array.isArray(streams)) return null;
  let best: string | null = null;
  let bestBitrate = -1;
  for (const entry of streams as PipedStream[]) {
    if (typeof entry.url !== "string" || !/^https:\/\//.test(entry.url)) continue;
    const bitrate = typeof entry.bitrate === "number" ? entry.bitrate : 0;
    if (bitrate >= bestBitrate) {
      bestBitrate = bitrate;
      best = entry.url;
    }
  }
  return best;
}

async function pipedStreams(videoId: string, api: string): Promise<TierHit> {
  const response = await fetch(`${api}/streams/${videoId}`, {
    headers: { Accept: "application/json", "User-Agent": DESKTOP_UA },
  });
  if (!response.ok) throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  const data = asRecord(await response.json().catch(() => null));
  if (!data) throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  if (data.livestream === true) {
    throw new AppError("UNSUPPORTED_URL", "Livestreams can't be downloaded — only published videos and Shorts.");
  }
  const video = pipedVideo(data.videoStreams);
  const sdList = Array.isArray(data.videoStreams) ? (data.videoStreams as PipedStream[]) : [];
  const sd =
    sdList.find(
      (s) => s.videoOnly !== true && s.quality === "360p" && typeof s.url === "string" && /^https:\/\//.test(s.url),
    )?.url ?? null;
  const audio = pipedAudio(data.audioStreams);
  if (!video && !audio) {
    throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror exposed nothing yet.");
  }
  return {
    id: videoId,
    title: cleanCaption(asString(data.title) ?? `YouTube video ${videoId}`, 200),
    author: asString(data.uploaderName) ?? "YouTube",
    duration: toDuration(data.duration),
    thumbnail: asString(data.thumbnailUrl) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: {
      video,
      videoSd: video && typeof sd === "string" && sd !== video ? sd : null,
      audio,
    },
  };
}

async function invidiousStreams(videoId: string, api: string): Promise<TierHit> {
  const response = await fetch(
    `${api}/api/v1/videos/${videoId}?fields=title,author,lengthSeconds,videoThumbnails,formatStreams`,
    { headers: { Accept: "application/json", "User-Agent": DESKTOP_UA } },
  );
  if (!response.ok) throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  const data = asRecord(await response.json().catch(() => null));
  if (!data) throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  const formats = Array.isArray(data.formatStreams) ? data.formatStreams : [];
  let hd: string | null = null;
  let sd: string | null = null;
  for (const entry of formats) {
    const f = asRecord(entry);
    const url = asString(f?.url);
    if (!url || !/^https:\/\//.test(url)) continue;
    const quality = asString(f?.qualityLabel) ?? "";
    if (/720p/.test(quality)) hd = hd ?? url;
    else if (/360p|480p|240p|144p/.test(quality)) sd = sd ?? url;
    else if (!hd) hd = url;
  }
  const thumbs = Array.isArray(data.videoThumbnails) ? data.videoThumbnails : [];
  const thumb = (thumbs as unknown[]).reduce<string>(
    (best, t) => asString(asRecord(t)?.url) ?? best,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  );
  const primary = hd ?? sd;
  if (!primary) throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror exposed nothing yet.");
  return {
    id: videoId,
    title: cleanCaption(asString(data.title) ?? `YouTube video ${videoId}`, 200),
    author: asString(data.author) ?? "YouTube",
    duration: toDuration(data.lengthSeconds),
    thumbnail: thumb,
    streams: { video: primary, videoSd: primary && sd && sd !== primary ? sd : null, audio: null },
  };
}

/** Cobalt-era tunnel URLs expired within ~2 minutes and produced the
 *  `download.html` / dead-button reports — the tier was removed, not kept
 *  as a silent fallback. */

/* ------------------------------------------------------------------ Tier 4 */

async function noembedMeta(videoId: string, canonicalUrl: string): Promise<TierHit> {
  const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`, {
    headers: { Accept: "application/json", "User-Agent": DESKTOP_UA },
  });
  if (!response.ok) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found — it may be deleted or private.");
  const data = asRecord(await response.json().catch(() => null));
  const title = asString(data?.title);
  if (!title) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found — it may be deleted or private.");
  return {
    id: videoId,
    title: cleanCaption(title, 200),
    author: asString(data?.author_name) ?? "YouTube",
    duration: 0,
    thumbnail: asString(data?.thumbnail_url) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: null,
  };
}

async function oembedMeta(videoId: string, canonicalUrl: string): Promise<TierHit> {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
    { headers: { Accept: "application/json", "User-Agent": DESKTOP_UA } },
  );
  if (!response.ok) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found — it may be deleted or private.");
  const data = asRecord(await response.json().catch(() => null));
  const title = asString(data?.title);
  if (!title) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found — it may be deleted or private.");
  return {
    id: videoId,
    title: cleanCaption(title, 200),
    author: asString(data?.author_name) ?? "YouTube",
    duration: 0,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: null,
  };
}

/** Hard wall-clock bound around a provider that manages its own polling. */
function withDeadline<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new AppError("PROVIDER_UNAVAILABLE", `${name} timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    }),
  ]);
}

/** Errors that describe the VIDEO itself (not the provider path). */
function isDefinitiveVideoError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    (error.code === "VIDEO_PRIVATE" ||
      error.code === "VIDEO_NOT_FOUND" ||
      error.code === "UNSUPPORTED_URL")
  );
}

/**
 * Race two resolution paths: the FIRST stream wins. Rejection, however, waits
 * for BOTH sides to finish — a bot-checked Innertube answer must not
 * short-circuit a converter job that is seconds away from a real stream
 * (that mismatch is exactly what surfaced to users as "YouTube is
 * rate-limiting this network"). When both sides fail, a definitive video
 * error (private / deleted / livestream) is preferred over provider noise.
 */
function firstDefinitiveHit(...chains: Array<Promise<TierHit>>): Promise<TierHit> {
  return new Promise<TierHit>((resolve, reject) => {
    let pending = chains.length;
    let definitive: unknown = null;
    let lastError: unknown = null;
    const fail = (error: unknown) => {
      if (isDefinitiveVideoError(error)) definitive = definitive ?? error;
      lastError = error;
      pending -= 1;
      if (pending === 0) {
        reject(
          definitive ??
            lastError ??
            new AppError("PROVIDER_UNAVAILABLE", "No stream provider answered."),
        );
      }
    };
    for (const chain of chains) chain.then(resolve, fail);
  });
}

/* --------------------------------------------------------------- resolution */

/**
 * CLIENT-ASSISTED COMPLETION — the long-video engine.
 *
 * A `_minute-long_` YouTube upload can take 30–120s for loader.to to
 * convert. The old engine bounded conversion inside the resolving function,
 * so Vercel's function ceiling killed the job mid-convert and production
 * showed a dead `0:00` card with buttons that could never download. This
 * engine splits the work:
 *
 *   Phase A (0–35s, server): start a conversion job for EVERY rendition
 *     (1080/720/360 + mp3) and race the direct mirrors; the first real
 *     stream wins and resolves instantly. Jobs register their `{id}`
 *     before anything can time out.
 *   Phase B (pending): when nothing landed inside the budget, return the
 *     job ids + best-effort metadata. The BROWSER keeps polling
 *     `/api/youtube/poll?id=…` — and the conversions keep running on
 *     loader.to's own infrastructure, completely outside any serverless
 *     window. One job lands → `/api/youtube/claim` claims its JSON media
 *     payload → the download buttons render.
 */
export interface PendingLoaderJob {
  /** The converter format this job renders. */
  format: string;
  /** The converter job id — what the poll route queries. */
  id: string;
}

/** Resolution output that says "conversion is still running — keep polling". */
export interface PendingYouTube {
  state: "pending";
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  jobs: PendingLoaderJob[];
}

/** Resolution output that returned a complete stream inside Phase A. */
export interface ResolvedYouTubeStart {
  state: "resolved";
  meta: { id: string; title: string; author: string; duration: number; thumbnail: string };
  streams: YouTubeStreams;
  /** All still-running jobs (mp3 / slower renditions) for background merge. */
  jobs: PendingLoaderJob[];
}

export type YouTubeResolutionStart = ResolvedYouTubeStart | PendingYouTube;

/** Phase-A wall clock: direct mirrors usually answer inside 1–3s; the
 *  converter lands Shorts in ~2–5s. Anything slower is a long video —
 *  hand the completion to the browser. */
const PHASE_A_BUDGET_MS = 35_000;

/* --------------------------------------------------------------------------
 *  Resolved-link cache — a second resolve of the same video must never
 *  re-wait for a fresh conversion.
 *
 *  Converter CDN files (loader.to's pacific-cdn / savenow.to links) are
 *  shared artifacts that answer any IP, so they cache cleanly. googlevideo
 *  mirror URLs are IP-locked to whoever resolved them and are NEVER cached
 *  — serving one to a different visitor would dead-end their download.
 *  Per-isolate memory: a cold function simply re-resolves (never worse
 *  than before), and a warm one answers in single-digit milliseconds.
 * ------------------------------------------------------------------------ */

const YT_CACHE_TTL_MS = 30 * 60_000;
const YT_CACHE_MAX_ENTRIES = 250;

interface CachedYouTubeHit {
  expiresAt: number;
  meta: { id: string; title: string; author: string; duration: number; thumbnail: string | null };
  streams: { video: string | null; videoSd: string | null; audio: string | null };
}

const resolvedYouTubeCache = new Map<string, CachedYouTubeHit>();

function cacheableStreamUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("https://") || isKnownLoaderInterstitialUrl(url)) return null;
  try {
    return new URL(url).hostname.includes("googlevideo.com") ? null : url;
  } catch {
    return null; // malformed — never cache
  }
}

/** A fresh cached hit for `videoId`, or null (expired / never cached). */
export function getCachedYouTubeHit(videoId: string): CachedYouTubeHit | null {
  const hit = resolvedYouTubeCache.get(videoId);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    resolvedYouTubeCache.delete(videoId);
    return null;
  }
  return hit;
}

/**
 * Remember a successfully resolved video. Merge-friendly: the 1080 claim and
 * the mp3 claim arrive as two separate calls, so one entry grows as
 * transports finish. Entries without a real downloadable stream aren't kept.
 */
export function rememberYouTubeStreams(
  videoId: string,
  meta: { id: string; title: string; author: string; duration: number; thumbnail: string | null },
  streams: { video: string | null; videoSd?: string | null; audio: string | null },
): void {
  const video = cacheableStreamUrl(streams.video);
  const videoSd = cacheableStreamUrl(streams.videoSd);
  const audio = cacheableStreamUrl(streams.audio);
  if (!video && !audio) return; // googlevideo-only resolve — nothing shareable

  const previous = getCachedYouTubeHit(videoId);
  const cachedMeta = previous
    ? {
        id: videoId,
        title: meta.title || previous.meta.title,
        author: meta.author || previous.meta.author,
        duration: meta.duration > 0 ? meta.duration : previous.meta.duration,
        thumbnail: meta.thumbnail ?? previous.meta.thumbnail,
      }
    : { id: videoId, title: meta.title, author: meta.author, duration: meta.duration, thumbnail: meta.thumbnail };

  resolvedYouTubeCache.delete(videoId); // Map insertion order = LRU order
  resolvedYouTubeCache.set(videoId, {
    expiresAt: Date.now() + YT_CACHE_TTL_MS,
    meta: cachedMeta,
    streams: {
      video: video ?? previous?.streams.video ?? null,
      videoSd: videoSd ?? previous?.streams.videoSd ?? null,
      audio: audio ?? previous?.streams.audio ?? null,
    },
  });
  while (resolvedYouTubeCache.size > YT_CACHE_MAX_ENTRIES) {
    const oldest = resolvedYouTubeCache.keys().next().value;
    if (oldest === undefined) break;
    resolvedYouTubeCache.delete(oldest);
  }
}

export async function startYouTubeResolution(
  rawUrl: string,
  options: { fresh?: boolean } = {},
): Promise<YouTubeResolutionStart> {
  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "That doesn't look like a YouTube video link.",
      "Try a youtube.com/watch, youtu.be share link, or /shorts/ link.",
    );
  }
  const { id, canonicalUrl } = parsed;

  // Cache hit: this video resolved moments ago — hand back the same
  // converter CDN streams instantly instead of re-waiting for conversion.
  const cached = options.fresh ? null : getCachedYouTubeHit(id);
  if (cached?.streams.video && httpsUrl(cached.streams.video) === cached.streams.video) {
    return {
      state: "resolved",
      meta: {
        id,
        title: cached.meta.title || `YouTube video ${id}`,
        author: cached.meta.author || "YouTube",
        duration: cached.meta.duration,
        thumbnail: cached.meta.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      },
      streams: { video: cached.streams.video, videoSd: cached.streams.videoSd, audio: cached.streams.audio },
      jobs: [],
    };
  }

  try {
    // Metadata runs CONCURRENTLY with the conversions — it answers even when
    // YouTube bot-checks every stream provider.
    const metaPromise: Promise<TierHit | null> = oembedMeta(id, canonicalUrl).catch(() => null);
    const durationPromise = innertubeDuration(id).catch(() => 0);

    // Every rendition starts as its own registered job, immediately.
    const registered: PendingLoaderJob[] = [];
    let providerAccessError: AppError | null = null;
    const startTrackedJob = async (format: string): Promise<LoaderJob> => {
      try {
        return await loaderStartJob(format, canonicalUrl);
      } catch (error) {
        if (error instanceof AppError && error.code === "PROVIDER_ACCESS_DENIED") {
          providerAccessError = error;
        }
        throw error;
      }
    };
    const record = (format: string, job: LoaderJob): void => {
      if (job.id && !registered.some((entry) => entry.id === job.id)) {
        registered.push({ format, id: job.id });
      }
    };
    const videoAwaits = LOADER_VIDEO_FORMATS.map((format) =>
      (async () => {
        const job = await startTrackedJob(format);
        record(format, job);
        try {
          return { format, url: await loaderAwaitJob(job) };
        } catch (error) {
          if (error instanceof AppError && error.code === "PROVIDER_ACCESS_DENIED") {
            providerAccessError = error;
          }
          throw error;
        }
      })(),
    );
    const audioRace = (async (): Promise<string | null> => {
      try {
        const job = await startTrackedJob("mp3");
        record("mp3", job);
        return await loaderAwaitJob(job);
      } catch (error) {
        if (error instanceof AppError && error.code === "PROVIDER_ACCESS_DENIED") {
          providerAccessError = error;
        }
        return null;
      }
    })();

    // NOTE: an unreachable converter (no registered jobs) is NOT a reason to
    // hard-fail: the direct-mirror waterfall below is still raced, and the
    // phase-A gate decides the outcome. Only if nothing answers at all does
    // the pending branch convert into a friendly retry error (there is no
    // job for the browser to poll, so faking a pending state would strand
    // the visitor on a conversion that no one can finish).

    const converterChain = (async (): Promise<TierHit> => {
      const winner = await Promise.any(videoAwaits);
      return {
        id,
        title: `YouTube video ${id}`,
        author: "YouTube",
        duration: 0,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        streams: { video: winner.url, videoSd: null, audio: null },
      };
    })();

    const directChain = runWaterfall<TierHit>([
      ...INVIDIOUS_APIS.map((api) => ({
        name: `youtube:invidious:${new URL(api).hostname}`,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => invidiousStreams(id, api),
      })),
      ...PIPED_APIS.map((api) => ({
        name: `youtube:piped:${new URL(api).hostname}`,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => pipedStreams(id, api),
      })),
      { name: "youtube:ytdl-core", timeoutMs: WATERFALL_TIMEOUT_MS, fn: () => ytdlCoreResolve(id, canonicalUrl) },
      {
        name: "youtube:ytdlp-android",
        timeoutMs: 8_000,
        fn: () => ytdlpAndroidResolve(id, canonicalUrl),
      },
      ...INNERTUBE_CLIENTS.map((client) => ({
        name: client.name,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => innertubePlayer(id, client),
      })),
    ]);

    // Tagged budget error: when nothing answered inside Phase A the tagged
    // error is what builds the pending hand-off — NOT a resolve failure.
    let phaseElapsed = false;
    const phaseBudget = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        phaseElapsed = true;
        reject(new AppError("PROVIDER_UNAVAILABLE", "youtube:phase-a-budget"));
      }, PHASE_A_BUDGET_MS);
    });

    try {
      const hit = await Promise.race([firstDefinitiveHit(directChain, converterChain), phaseBudget]);
      if (!hit.streams || (!hit.streams.video && !hit.streams.audio)) {
        throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — retry in a moment.");
      }

      // The mp3 job may have finished inside Phase A — attach it for free
      // (never await the full conversion here; a 0-timer race only wins when
      // audioRace already settled).
      const racedAudio = (await Promise.race([
        audioRace,
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 0)),
      ]).catch(() => null)) as string | null;

      // Winner metadata: oembed usually answered while the conversion ran.
      const meta = await metaPromise;
      const duration = (hit.duration > 0 ? hit.duration : await durationPromise) || 0;
      const resolvedMeta = {
        id: hit.id || id,
        // A converter winner carries the placeholder title; swap in the
        // real one and only the real one when it exists (never a 0:00 card).
        title: meta?.title ?? (hit.title !== `YouTube video ${id}` ? hit.title : `YouTube video ${id}`),
        author: hit.author !== "YouTube" ? hit.author : (meta?.author ?? "YouTube"),
        duration: duration > 0 ? duration : 0,
        thumbnail: hit.thumbnail.includes(`vi/${id}/hqdefault.jpg`)
          ? meta?.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
          : hit.thumbnail,
      };
      // Any(Path) googlevideo (mirror) URLs are IP-locked to Vercel and are
      // refused by the cache itself — only converter CDN links get stored.
      rememberYouTubeStreams(
        id,
        resolvedMeta,
        racedAudio ? { ...hit.streams, audio: racedAudio } : hit.streams,
      );
      return {
        state: "resolved",
        meta: resolvedMeta,
        streams: racedAudio ? { ...hit.streams, audio: racedAudio } : hit.streams,
        jobs: registered.slice(),
      };
    } catch (error) {
      // Vinyl: definitive VIDEO errors (private / deleted / livestream) are
      // real answers, never downgrade to pending.
      if (error instanceof AppError && error.code === "VIDEO_PRIVATE") throw error;
      if (error instanceof AppError && (error.code === "VIDEO_NOT_FOUND" || error.code === "UNSUPPORTED_URL")) {
        throw error;
      }
      if (providerAccessError) throw providerAccessError;
      if (!phaseElapsed) throw error; // a real provider failure, not the budget

      // Phase B (pending): video metadata for the card + the registered
      // job ids. The browser takes over polling from here.
      let meta = await metaPromise;
      meta ??= await runWaterfall<TierHit>([
        {
          name: "youtube:noembed",
          timeoutMs: WATERFALL_TIMEOUT_MS,
          fn: () => noembedMeta(id, canonicalUrl),
        },
        {
          name: "youtube:oembed",
          timeoutMs: WATERFALL_TIMEOUT_MS,
          fn: () => oembedMeta(id, canonicalUrl),
        },
      ]).catch(() => null);
      if (registered.length === 0) {
        // No active conversion job exists — browser-assisted polling can
        // never finish this. Preserve the concrete API-access denial rather
        // than disguising it as a YouTube network timeout.
        if (providerAccessError) throw providerAccessError;
        throw new AppError(
          "PROVIDER_UNAVAILABLE",
          "Resolving high-speed stream — retry in a moment.",
          "YouTube is rate-limiting this network; try again shortly.",
        );
      }
      const duration = Math.max(0, await durationPromise);
      return {
        state: "pending",
        videoId: id,
        title: meta?.title ?? `YouTube video ${id}`,
        author: meta?.author ?? "YouTube",
        duration,
        thumbnail: meta?.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        jobs: registered.slice(),
      };
    }
  } catch (outer) {
    // Definitive VIDEO errors (private / deleted / livestream) are real
    // answers and survive unchanged; anything unexpected normalizes to the
    // friendly retry error.
    if (outer instanceof AppError) throw outer;
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — retry in a moment.",
      "The converter and mirrors are answering slowly; try again shortly.",
    );
  }
}

/**
 * Resolve a YouTube URL (single-request legacy engine, used by /api/fetch).
 * Phase A returns the first provider with a real downloadable stream;
 * Phase B (metadata-only) answers with a clean, friendly retry message —
 * never a raw 500, never a debug dump.
 */
export async function extractYouTube(rawUrl: string): Promise<ResolvedYouTube> {
  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "That doesn't look like a YouTube video link.",
      "Try a youtube.com/watch, youtu.be share link, or /shorts/ link.",
    );
  }
  const { id, canonicalUrl } = parsed;

  try {
    // Tier 1 (Loader/OceanSaver conversion) runs CONCURRENTLY with the
    // direct-mirror waterfall (Tiers 2–4) and the first stream wins. The
    // converter needs 2–30s to transcode while the direct mirrors answer in
    // milliseconds when they work — so racing them gives the fast path when
    // YouTube isn't bot-checking this network, and still lands a stream from
    // datacenter IPs where every direct call is blocked. A definitive answer
    // (private / deleted / livestream) ends the race immediately.
    const conversionChain = withDeadline(
      loaderResolve(id, canonicalUrl),
      LOADER_TIMEOUT_MS,
      "youtube:loader",
    );
    const directChain = runWaterfall<TierHit>([
      // Tier 2: active Invidious / Piped mirrors.
      ...INVIDIOUS_APIS.map((api) => ({
        name: `youtube:invidious:${new URL(api).hostname}`,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => invidiousStreams(id, api),
      })),
      ...PIPED_APIS.map((api) => ({
        name: `youtube:piped:${new URL(api).hostname}`,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => pipedStreams(id, api),
      })),
      // Tier 3: direct extraction (ytdl-core + Innertube clients).
      {
        name: "youtube:ytdl-core",
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => ytdlCoreResolve(id, canonicalUrl),
      },
      {
        name: "youtube:ytdlp-android",
        timeoutMs: 8_000,
        fn: () => ytdlpAndroidResolve(id, canonicalUrl),
      },
      ...INNERTUBE_CLIENTS.map((client) => ({
        name: client.name,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => innertubePlayer(id, client),
      })),
    ]);

    const hit = await firstDefinitiveHit(directChain, conversionChain);
    if (!hit.streams || (!hit.streams.video && !hit.streams.audio)) {
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Resolving high-speed stream — retry in a moment.",
        "Mirrors are rotating; your download buttons appear as soon as a stream lands.",
      );
    }
    // Any provider that resolves a stream but not a length (Cobalt) gets one
    // metadata probe so the result card shows real duration — never 0:00.
    const duration = hit.duration > 0 ? hit.duration : await innertubeDuration(id).catch(() => 0);
    return {
      id: hit.id,
      title: hit.title,
      author: hit.author,
      duration,
      thumbnail: hit.thumbnail,
      streams: hit.streams,
    };
  } catch (streamError) {
    if (
      streamError instanceof AppError &&
      (streamError.code === "VIDEO_PRIVATE" ||
        streamError.code === "VIDEO_NOT_FOUND" ||
        streamError.code === "UNSUPPORTED_URL")
    ) {
      throw streamError;
    }
    // Phase B: metadata-only fallbacks — proves the video exists so the UI
    // answers with a friendly retry instead of erroring blindly.
    await runWaterfall<TierHit>([
      {
        name: "youtube:noembed",
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => noembedMeta(id, canonicalUrl),
      },
      {
        name: "youtube:oembed",
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => oembedMeta(id, canonicalUrl),
      },
    ]).catch(() => null);

    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — retry in a moment.",
      "YouTube is rate-limiting this network; install the app and try again shortly.",
    );
  }
}
