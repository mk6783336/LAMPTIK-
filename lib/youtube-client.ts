/**
 * BROWSER-DIRECT YouTube engines.
 *
 * Why this file exists: when every server-side engine refuses a video, the
 * USER'S BROWSER still sits on a clean residential IP, and the public
 * Piped / Invidious APIs answer CORS `Access-Control-Allow-Origin: *`. This
 * module runs that extraction in the browser and hands the resulting stream
 * to /api/youtube/claim.
 *
 * There is deliberately no converter here any more: loader.to now demands
 * authorized API access and answers an HTML ad card instead of a job id.
 * Browser-direct Innertube is not an option either — YouTube's player API
 * does not send CORS headers — so the mirrors are the honest last resort.
 *
 * Consumer: `rescueYouTubeFromBrowser` in components/downloader.tsx, reached
 * only after `/api/youtube` answers a soft failure.
 */

import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

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

function safeHttps(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 4_096 &&
    /^https:\/\//.test(value) &&
    !isKnownLoaderInterstitialUrl(value)
  );
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
