import ytdl from "@distube/ytdl-core";

import { AppError } from "@/lib/errors";
import { asRecord, asString, cleanCaption, DESKTOP_UA, toDuration } from "@/lib/http";
import { runWaterfall, WATERFALL_TIMEOUT_MS } from "@/lib/load-balancer";

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
const LOADER_POLL_MS = 1_000;
const LOADER_MAX_POLLS = 22;
/** Budget for the conversion path (job start + polling). Measured: real
 *  conversions land between ~2s (Shorts) and ~30s (long 1080p uploads).
 *  It runs in parallel with the direct providers, so a slow conversion never
 *  delays a fast mirror — and a bot-checked direct path never starves it. */
const LOADER_TIMEOUT_MS = 25_000;

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
  return /^https:\/\//.test(url) ? url : null;
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
  const direct = httpsUrl(data.download_url);
  const id = asString(data.id) ?? asString(data.hid) ?? "";
  const progressUrl =
    httpsUrl(data.progress_url) ??
    (id ? `${LOADER_FALLBACK_PROGRESS}?id=${encodeURIComponent(id)}` : "");
  if (!direct && !progressUrl) {
    throw new AppError("PROVIDER_UNAVAILABLE", "The converter mirror didn't accept this video.");
  }
  const info = asRecord(data.info);
  return {
    progressUrl,
    downloadUrl: direct,
    title: asString(info?.title) ?? asString(data.title) ?? null,
    thumbnail: httpsUrl(data.thumbnail_url) ?? httpsUrl(info?.image) ?? null,
  };
}

/** Poll a conversion job until `success` yields a `download_url`. */
async function loaderAwaitJob(job: LoaderJob): Promise<string> {
  if (job.downloadUrl) return job.downloadUrl;
  for (let poll = 0; poll < LOADER_MAX_POLLS; poll += 1) {
    if (poll > 0) await new Promise((resolve) => setTimeout(resolve, LOADER_POLL_MS));
    // A transient network hiccup mid-poll must not kill the whole conversion
    // path — skip the beat and keep polling until the budget is spent.
    const data = await fetch(job.progressUrl, {
      headers: {
        Accept: "application/json",
        Referer: "https://loader.to/",
        "User-Agent": DESKTOP_UA,
      },
      cache: "no-store",
    })
      .then(async (response) => (response.ok ? asRecord(await response.json().catch(() => null)) : null))
      .catch(() => null);
    if (!data) continue;
    // `success == 1` marks completion; the `download_url` is what we need.
    const done =
      httpsUrl(data.download_url) ?? httpsUrl(data.downloadUrl) ?? httpsUrl(data.file_url);
    if (done) return done;
  }
  throw new AppError("PROVIDER_UNAVAILABLE", "The converter mirror is still processing this video.");
}

/** Primary: Loader.to/OceanSaver — works from datacenter IPs. */
async function loaderResolve(videoId: string, canonicalUrl: string): Promise<TierHit> {
  // The author name comes from YouTube's public oEmbed (the converter only
  // exposes title/thumbnail), fetched concurrently with the conversion jobs.
  const metaPromise = oembedMeta(videoId, canonicalUrl).catch(() => null);

  const [videoJob, audioJob] = await Promise.all([
    loaderStartJob("1080", canonicalUrl),
    loaderStartJob("mp3", canonicalUrl).catch(() => null),
  ]);

  const [videoUrl, audioUrl, meta] = await Promise.all([
    loaderAwaitJob(videoJob),
    audioJob ? loaderAwaitJob(audioJob).catch(() => null) : Promise.resolve(null),
    metaPromise,
  ]);

  return {
    id: videoId,
    title: videoJob.title ?? meta?.title ?? `YouTube video ${videoId}`,
    author: meta?.author ?? "YouTube",
    duration: meta?.duration ?? 0,
    thumbnail: videoJob.thumbnail ?? meta?.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: { video: videoUrl, videoSd: null, audio: audioUrl },
  };
}

/* ------------------------------------------------------------------ Tier 2 */

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`;

const INNERTUBE_CLIENTS = [
  { name: "youtube:innertube-android", context: { clientName: "ANDROID", clientVersion: "19.09.37", hl: "en", gl: "US" } },
  { name: "youtube:innertube-ios", context: { clientName: "IOS", clientVersion: "19.09.37", hl: "en", gl: "US" } },
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
  let audio: string | null = null;
  let bestBitrate = 0;
  for (const format of adaptive) {
    if (!(format.mimeType ?? "").includes("audio/")) continue;
    const url =
      (typeof format.url === "string" && format.url.includes("googlevideo.com") ? format.url : null) ??
      (format.signatureCipher ? parseCipherUrl(format.signatureCipher) : null);
    if (!url) continue;
    const bitrate = typeof format.bitrate === "number" ? format.bitrate : 0;
    if (bitrate >= bestBitrate) {
      bestBitrate = bitrate;
      audio = url;
    }
  }

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
const PIPED_APIS = ["https://pipedapi.adminforge.de"];

const INVIDIOUS_APIS = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de"];

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
function firstDefinitiveHit(direct: Promise<TierHit>, conversion: Promise<TierHit>): Promise<TierHit> {
  return new Promise<TierHit>((resolve, reject) => {
    let pending = 2;
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
    direct.then(resolve, fail);
    conversion.then(resolve, fail);
  });
}

/* --------------------------------------------------------------- resolution */

/**
 * Resolve a YouTube URL. Phase A returns the first provider with a real
 * downloadable stream; Phase B (metadata-only) answers with a clean,
 * friendly retry message — never a raw 500, never a debug dump.
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
    return {
      id: hit.id,
      title: hit.title,
      author: hit.author,
      duration: hit.duration,
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
