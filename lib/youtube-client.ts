/**
 * BROWSER-DIRECT YouTube engines.
 *
 * Why this file exists: Vercel's AWS datacenter IPs get blocked /
 * rate-limited by loader.to's AJAX endpoints, public Piped/Invidious nodes
 * and YouTube Innertube itself — so when every server-side provider fails,
 * `/api/youtube` used to answer metadata-only and a dead `0:00` card. The
 * USER'S BROWSER sits on a clean residential IP, and the converter + mirror
 * APIs send `Access-Control-Allow-Origin: *`, so the same engines run
 * flawlessly from here. Nothing in this file holds secrets or touches
 * non-CORS endpoints; everything is public-tier JSON the vendors
 * themselves open up to browsers.
 *
 * Consumers (components/downloader.tsx):
 *  - the resolve fallback when `/api/youtube` answers a hard failure
 *    (`PROVIDER_UNAVAILABLE`) — start converter jobs on the visitor's IP,
 *    then claim the finished `download_url` via /api/youtube/claim;
 *  - `clientLoaderProgress` as the direct-CORS poll when the server-side
 *    /api/youtube/poll relay stalls (Vercel IP blocked).
 */

import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

/** What one started loader.to job looks like to the browser loop. */
export interface ClientConverterJob {
  /** "1080" | "720" | "360" | "mp3". */
  format: string;
  /** Opaque converter job id (empty when the job never registered). */
  id: string;
  /** Optional completed URL delivered alongside an id. */
  readyUrl?: string;
}

/** One progress beat against a converter job. */
export interface ClientLoaderBeat {
  state: "ready" | "processing" | "error";
  downloadUrl: string | null;
  /** Converter's own 0–100 progress when reported. */
  progress: number | null;
  reason?: "provider_access";
}

/** What a CORS mirror (Piped / Invidious) handed back. */
export interface MirrorStreams {
  title: string;
  author: string;
  duration: number;
  thumbnail: string | null;
  /** Progressive MP4 (best quality available). */
  video: string | null;
  /** Lower-quality progressive MP4, when distinct. */
  videoSd: string | null;
  /** Audio (m4a) stream for the MP3 button. */
  audio: string | null;
}

/* ------------------------------------------------------------------ */
/* Loader.to / OceanSaver (CORS `Access-Control-Allow-Origin: *`)      */
/* ------------------------------------------------------------------ */

const CLIENT_LOADER_API = "https://loader.to/ajax/download.php";
const CLIENT_LOADER_PROGRESS = "https://loader.to/ajax/progress.php";
const CLIENT_V2_PROGRESS = "https://lto2.affadaffa.com/api/progress";
/** Same rendition ladder the server engine uses, plus the audio track. */
const CLIENT_LOADER_FORMATS = ["1080", "720", "360", "mp3"] as const;

function converterAccessBlocked(data: Record<string, unknown>): boolean {
  return typeof data.message === "string" && /application.{0,80}use our api.{0,120}contact us/i.test(data.message);
}

function safeHttps(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 4_096 &&
    /^https:\/\//.test(value) &&
    !isKnownLoaderInterstitialUrl(value)
  );
}

/** Start EVERY rendition on loader.to straight from the visitor's IP. */
export async function clientStartConverterJobs(canonicalUrl: string): Promise<ClientConverterJob[]> {
  const starts = await Promise.all(
    CLIENT_LOADER_FORMATS.map(async (format): Promise<ClientConverterJob> => {
      try {
        const response = await fetch(
          `${CLIENT_LOADER_API}?format=${encodeURIComponent(format)}&url=${encodeURIComponent(canonicalUrl)}`,
          { headers: { Accept: "application/json" }, mode: "cors", cache: "no-store" },
        );
        if (!response.ok) return { format, id: "" };
        const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!data || converterAccessBlocked(data)) return { format, id: "" };
        // Some answers already carry the finished link (warm pool).
        const direct = [data.download_url, data.downloadUrl, data.file_url].find(safeHttps);
        if (direct) return { format, id: "", readyUrl: direct };
        const id = typeof data.id === "string" ? data.id : typeof data.hid === "string" ? data.hid : "";
        return { format, id: id.length >= 4 && id.length <= 96 ? id : "" };
      } catch {
        // CORS refusal / offline beat — the loop simply skips this job.
        return { format, id: "" };
      }
    }),
  );
  return starts;
}

/** One progress beat against loader.to, directly from the visitor's IP. */
export async function clientLoaderProgress(jobId: string): Promise<ClientLoaderBeat> {
  // Ready-at-start jobs carry their link in the id marker (no endpoint hit).
  if (jobId.includes("|")) {
    return { state: "ready", downloadUrl: jobId.slice(jobId.indexOf("|") + 1), progress: null };
  }
  try {
    const progressEndpoint = jobId.startsWith("v2_stream_")
      ? CLIENT_V2_PROGRESS
      : CLIENT_LOADER_PROGRESS;
    const response = await fetch(`${progressEndpoint}?id=${encodeURIComponent(jobId)}`, {
      headers: { Accept: "application/json" },
      mode: "cors",
      cache: "no-store",
    });
    if (!response.ok) return { state: "processing", downloadUrl: null, progress: null };
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data) return { state: "processing", downloadUrl: null, progress: null };
    if (converterAccessBlocked(data)) {
      return { state: "error", downloadUrl: null, progress: null, reason: "provider_access" };
    }
    // Savenow's documented API has a 0–1000 scale. A job that reaches 1000
    // without success or a real download URL has terminated, not stalled.
    if (Number(data.progress) >= 1000) {
      return { state: "error", downloadUrl: null, progress: 100 };
    }
    const rawDirect = data.download_url ?? data.downloadUrl ?? data.file_url;
    if (typeof rawDirect === "string" && isKnownLoaderInterstitialUrl(rawDirect)) {
      return { state: "error", downloadUrl: null, progress: null };
    }
    const direct = [data.download_url, data.downloadUrl, data.file_url].find(safeHttps);
    if (safeHttps(direct)) return { state: "ready", downloadUrl: direct, progress: null };
    // `success: -1` / `progress: -1` — the job died upstream.
    if (Number(data.success) === -1 || Number(data.progress) === -1) {
      return { state: "error", downloadUrl: null, progress: null };
    }
    const progress = typeof data.progress === "number" ? data.progress : null;
    return { state: "processing", downloadUrl: null, progress };
  } catch {
    return { state: "processing", downloadUrl: null, progress: null };
  }
}

/* ------------------------------------------------------------------ */
/* CORS metadata (title/author/thumbnail — never a 0:00 placeholder)   */
/* ------------------------------------------------------------------ */

export interface ClientVideoMeta {
  title: string | null;
  author: string | null;
  thumbnail: string | null;
  duration: number;
}

/** YouTube's own oEmbed endpoint answers CORS `*` — real title + author. */
export async function clientOembedMeta(videoId: string): Promise<ClientVideoMeta> {
  const fallback: ClientVideoMeta = {
    title: null,
    author: null,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: 0,
  };
  const endpoints = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        mode: "cors",
        cache: "no-store",
      });
      if (!response.ok) continue;
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!data || typeof data.title !== "string") continue;
      return {
        title: data.title.slice(0, 200),
        author: typeof data.author_name === "string" ? data.author_name.slice(0, 120) : null,
        thumbnail:
          typeof data.thumbnail_url === "string" && data.thumbnail_url.startsWith("https://")
            ? data.thumbnail_url
            : fallback.thumbnail,
        duration: 0,
      };
    } catch {
      continue; // CORS/network refusal — try the next endpoint
    }
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Piped / Invidious (CORS public nodes)                               */
/* ------------------------------------------------------------------ */

const CLIENT_PIPED_APIS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.syncpundit.io",
] as const;

const CLIENT_INVIDIOUS_APIS = [
  "https://inv.nadeko.net",
  "https://invidious.jing.rocks",
  "https://iv.ggtyler.dev",
] as const;

function jsonNumber(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function mirrorStreamUrl(value: unknown): string | null {
  if (!safeHttps(value)) return null;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "googlevideo.com" || host.endsWith(".googlevideo.com")) return value;
    // Piped's progressive MP4s are normally served by its CORS-enabled
    // pipedproxy tier, NOT googlevideo.com. The previous googlevideo-only
    // filter silently discarded every such stream before the browser rescue
    // could claim it.
    const proxyDomain = ["kavin.rocks", "adminforge.de", "syncpundit.io"].some(
      (domain) => host.endsWith(`.${domain}`),
    );
    return proxyDomain && host.split(".")[0]?.startsWith("pipedproxy") ? value : null;
  } catch {
    return null;
  }
}

/** One CORS beat against every configured Piped node, first truthy wins. */
async function pipedMirror(videoId: string): Promise<MirrorStreams | null> {
  const attempts = await Promise.allSettled(
    CLIENT_PIPED_APIS.map(async (api): Promise<MirrorStreams | null> => {
      try {
        const response = await fetch(`${api}/streams/${encodeURIComponent(videoId)}`, {
          headers: { Accept: "application/json" },
          mode: "cors",
          cache: "no-store",
        });
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!data) return null;
        const videoStreams = Array.isArray(data.videoStreams) ? data.videoStreams : [];
        const audioStreams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
        // Progressive (videoOnly === false) streams save in one URL;
        // quality looks like "720p" / "360p".
        let bestHd: string | null = null;
        let bestSd: string | null = null;
        for (const raw of videoStreams) {
          const stream = raw as { url?: unknown; quality?: unknown; videoOnly?: unknown };
          if (stream.videoOnly === true) continue; // DASH segments need muxing
          const url = mirrorStreamUrl(stream.url);
          if (!url) continue;
          const quality = typeof stream.quality === "string" ? stream.quality : "";
          if (/720|1080/.test(quality)) bestHd ??= url;
          else if (/360|480/.test(quality)) bestSd ??= url;
        }
        let audio: string | null = null;
        for (const raw of audioStreams) {
          const stream = raw as { url?: unknown; mimeType?: unknown };
          const url = mirrorStreamUrl(stream.url);
          if (url && typeof stream.mimeType === "string" && stream.mimeType.startsWith("audio/mp4")) {
            audio ??= url;
          }
        }
        if (!bestHd && !bestSd && !audio) return null;
        return {
          title: typeof data.title === "string" ? data.title : `YouTube video ${videoId}`,
          author: typeof data.uploader === "string" ? data.uploader : "YouTube",
          duration: jsonNumber(data.duration),
          thumbnail:
            typeof data.thumbnailUrl === "string" && data.thumbnailUrl.startsWith("https://")
              ? data.thumbnailUrl
              : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          video: bestHd,
          videoSd: bestSd,
          audio,
        };
      } catch {
        return null; // CORS refusal / dead node
      }
    }),
  );
  for (const attempt of attempts) {
    if (attempt.status === "fulfilled" && attempt.value) return attempt.value;
  }
  return null;
}

/** Mirrors Invidious `api/v1/videos/:id` (`adaptedFormats` carry URLs). */
async function invidiousMirror(videoId: string): Promise<MirrorStreams | null> {
  const attempts = await Promise.allSettled(
    CLIENT_INVIDIOUS_APIS.map(async (api): Promise<MirrorStreams | null> => {
      try {
        const response = await fetch(`${api}/api/v1/videos/${encodeURIComponent(videoId)}`, {
          headers: { Accept: "application/json" },
          mode: "cors",
          cache: "no-store",
        });
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!data) return null;
        const formats = Array.isArray(data.adaptedFormats) ? data.adaptedFormats : [];
        let bestHd: string | null = null;
        let bestSd: string | null = null;
        let audio: string | null = null;
        for (const raw of formats) {
          const format = raw as { url?: unknown; qualityLabel?: unknown; type?: unknown };
          const url = mirrorStreamUrl(format.url);
          if (!url) continue;
          const type = typeof format.type === "string" ? format.type : "";
          const label = typeof format.qualityLabel === "string" ? format.qualityLabel : "";
          if (type.startsWith("video/")) {
            if (!bestHd && !bestSd) {
              if (/1080|720/.test(label)) bestHd = url;
              else if (/360|480|240/.test(label)) bestSd = url;
            }
          } else if (type.startsWith("audio/")) {
            audio ??= url;
          }
        }
        if (!bestHd && !bestSd && !audio) return null;
        return {
          title: typeof data.title === "string" ? data.title : `YouTube video ${videoId}`,
          author: typeof data.author === "string" ? data.author : "YouTube",
          duration: jsonNumber(data.lengthSeconds),
          thumbnail:
            typeof data.thumbnailUrl === "string" && data.thumbnailUrl.startsWith("https://")
              ? data.thumbnailUrl
              : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          video: bestHd,
          videoSd: bestSd,
          audio,
        };
      } catch {
        return null;
      }
    }),
  );
  for (const attempt of attempts) {
    if (attempt.status === "fulfilled" && attempt.value) return attempt.value;
  }
  return null;
}

/** First live mirror (Piped preferred for progressive MP4 + real duration). */
export async function clientMirrorStreams(videoId: string): Promise<MirrorStreams | null> {
  return (await pipedMirror(videoId)) ?? (await invidiousMirror(videoId));
}
