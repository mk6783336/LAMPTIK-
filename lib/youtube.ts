import { AppError } from "@/lib/errors";
import { asRecord, asString, cleanCaption, DESKTOP_UA, toDuration } from "@/lib/http";
import { runWaterfall, WATERFALL_TIMEOUT_MS } from "@/lib/load-balancer";

/**
 * App-Exclusive YouTube resolver: watch / Shorts / youtu.be / embed links in
 * 1080p, 720p, 360p MP4 + M4A/MP3 audio without crashing serverless memory.
 *
 * Everything here is small-JSON metadata resolution — no media bytes are ever
 * buffered. The actual file streams through `/api/download` chunk-by-chunk
 * (Range pass-through, 206 Partial Content), so a 1-hour / 500MB+ video
 * holds < 15MB of RAM.
 *
 * Tier 1 — Innertube `/youtubei/v1/player` with ANDROID / IOS /
 * TV_EMBEDDED client contexts: direct muxed progressive MP4 streams
 * (itag 22 = 720p, itag 18 = 360p) + highest-bitrate audio (itag 140).
 * Tier 2 — public Piped / Invidious API cluster for 1080p + IP-gated videos
 * (Vercel IPs sometimes hit YouTube bot checks that these nodes bypass).
 * Tier 3 — noembed / oEmbed metadata so a resolve NEVER returns a raw 500.
 */

export interface YouTubeStreams {
  /** Best progressive MP4 (1080p when a muxed variant exists, else 720p). */
  video: string | null;
  /** Lower-bitrate MP4 (360p/480p), when distinct from `video`. */
  videoSd: string | null;
  /** Highest-bitrate audio (M4A/MP3-ready), when exposed. */
  audio: string | null;
}

export interface YouTubeExtract {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  streams: YouTubeStreams;
  /** Which rendition tier the primary stream came from. */
  qualityLabel: "1080p" | "720p" | "360p" | "audio-only" | "metadata";
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

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`;

interface InnertubeClient {
  name: string;
  context: Record<string, unknown>;
}

const INNERTUBE_CLIENTS: InnertubeClient[] = [
  {
    name: "youtube:innertube-android",
    context: {
      clientName: "ANDROID",
      clientVersion: "19.09.37",
      androidSdkVersion: 30,
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-ios",
    context: {
      clientName: "IOS",
      clientVersion: "19.09.37",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-tv",
    context: {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      hl: "en",
      gl: "US",
    },
  },
];

interface InnertubeFormat {
  itag?: number;
  url?: string;
  signatureCipher?: string;
  mimeType?: string;
  qualityLabel?: string;
  contentLength?: string;
  bitrate?: number;
}

function directUrl(format: InnertubeFormat): string | null {
  // Ciphered URLs need player-JS deciphering (too heavy for Edge) — only
  // direct googlevideo URLs are usable here. Cipher-only responses fall
  // through to Tier 2, which serves pre-signed proxied URLs.
  if (typeof format.url === "string" && format.url.includes("googlevideo.com")) {
    return format.url;
  }
  return null;
}

function parseCipherUrl(cipher: string): string | null {
  try {
    const params = new URLSearchParams(cipher);
    const base = params.get("url");
    if (base && base.includes("googlevideo.com")) return base;
  } catch {
    // Not a parseable cipher — treated as unusable.
  }
  return null;
}

async function innertubePlayer(videoId: string, client: InnertubeClient, requireStreams: boolean) {
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
      context: { client: client.context },
      playbackContext: { contentPlaybackContext: { html5Preference: "HTML5_PREF_WANTS" } },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_UNAVAILABLE", "YouTube didn't answer the metadata request.");
  }
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const root = asRecord(data);
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
    throw new AppError("PROVIDER_UNAVAILABLE", "YouTube refused to play this video.", reason || undefined);
  }

  const details = asRecord(root.videoDetails) ?? {};
  const streaming = asRecord(root.streamingData);
  const muxed = Array.isArray(streaming?.formats) ? (streaming?.formats as InnertubeFormat[]) : [];
  const adaptive = Array.isArray(streaming?.adaptiveFormats)
    ? (streaming?.adaptiveFormats as InnertubeFormat[])
    : [];

  const thumbnails = asRecord(details.thumbnail);
  const thumbArray = Array.isArray(thumbnails?.thumbnails) ? thumbnails?.thumbnails : [];
  const thumbUrl =
    (thumbArray as Array<{ url?: unknown }>).reduce<string | null>(
      (best, t) => (typeof t.url === "string" && t.url ? t.url : best),
      null,
    ) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const meta = {
    id: videoId,
    title: cleanCaption(asString(details.title) ?? `YouTube video ${videoId}`, 200) || `YouTube video ${videoId}`,
    author: asString(details.author) ?? "YouTube",
    duration: toDuration(details.lengthSeconds),
    thumbnail: thumbUrl,
  };

  if (!requireStreams) return { ...meta, streams: null as YouTubeStreams | null };

  let hd: string | null = null;
  let sd: string | null = null;
  for (const format of muxed) {
    const url = directUrl(format);
    if (!url || !(format.mimeType ?? "").includes("video/mp4")) continue;
    if (format.itag === 22 || format.qualityLabel === "720p") hd = hd ?? url;
    else if (format.itag === 18 || format.qualityLabel === "360p") sd = sd ?? url;
    else if (!hd) hd = url;
  }
  // 1080p+ is adaptive-only on YouTube (no muxed audio) — never offer a
  // silent file as the primary download; Tier 2 covers real 1080p.
  let audio: string | null = null;
  let bestBitrate = 0;
  for (const format of adaptive) {
    const mime = format.mimeType ?? "";
    if (!mime.includes("audio/")) continue;
    const url = directUrl(format) ?? (format.signatureCipher ? parseCipherUrl(format.signatureCipher) : null);
    if (!url) continue;
    const bitrate = typeof format.bitrate === "number" ? format.bitrate : 0;
    if (bitrate >= bestBitrate) {
      bestBitrate = bitrate;
      audio = url;
    }
  }

  const primary = hd ?? sd;
  if (!primary && !audio) {
    // Ciphered/bot-checked response: metadata is real but no usable stream —
    // signal the waterfall to try Tier 2 instead of settling here.
    throw new AppError("PROVIDER_UNAVAILABLE", "YouTube served ciphered streams; trying mirror nodes.");
  }
  return {
    ...meta,
    streams: {
      video: primary,
      videoSd: primary && sd && sd !== primary ? sd : null,
      audio,
    } satisfies YouTubeStreams,
  };
}

/* ------------------------------------------------------------------ Tier 2 */

const PIPED_APIS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
];

const INVIDIOUS_APIS = ["https://inv.tux.pizza", "https://invidious.adminforge.de"];

interface PipedStream {
  url?: unknown;
  quality?: unknown;
  mimeType?: unknown;
  videoOnly?: unknown;
  itag?: unknown;
  bitrate?: unknown;
}

function pipedPick(streams: unknown, wantAudio: false): string | null;
function pipedPick(streams: unknown, wantAudio: true): string | null;
function pipedPick(streams: unknown, wantAudio: boolean): string | null {
  if (!Array.isArray(streams)) return null;
  const list = streams as PipedStream[];
  if (wantAudio) {
    let best: string | null = null;
    let bestBitrate = -1;
    for (const s of list) {
      if (typeof s.url !== "string" || !/^https:\/\//.test(s.url)) continue;
      const bitrate = typeof s.bitrate === "number" ? s.bitrate : 0;
      if (bitrate >= bestBitrate) {
        bestBitrate = bitrate;
        best = s.url;
      }
    }
    return best;
  }
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
  for (const s of list) {
    if (typeof s.url !== "string" || !/^https:\/\//.test(s.url)) continue;
    if (s.videoOnly === true) continue;
    if (typeof s.mimeType === "string" && !s.mimeType.includes("video/mp4")) continue;
    const r = rank(s.quality);
    fallback = fallback ?? s.url;
    if (r > bestRank) {
      bestRank = r;
      best = s.url;
    }
  }
  return best ?? fallback;
}

async function pipedStreams(videoId: string, api: string) {
  const response = await fetch(`${api}/streams/${videoId}`, {
    headers: { Accept: "application/json", "User-Agent": DESKTOP_UA },
  });
  if (!response.ok) throw new AppError("PROVIDER_UNAVAILABLE", `Mirror ${api} didn't answer.`);
  const data = asRecord(await response.json().catch(() => null));
  if (!data || asString(data.title) === null) {
    throw new AppError("PROVIDER_UNAVAILABLE", `Mirror ${api} returned an empty response.`);
  }
  if (data.livestream === true) {
    throw new AppError("UNSUPPORTED_URL", "Livestreams can't be downloaded — only published videos and Shorts.");
  }
  const video = pipedPick(data.videoStreams, false);
  const sd = (() => {
    const list = Array.isArray(data.videoStreams) ? (data.videoStreams as PipedStream[]) : [];
    for (const s of list) {
      if (s.videoOnly === true) continue;
      if (s.quality === "360p" && typeof s.url === "string" && /^https:\/\//.test(s.url)) return s.url;
    }
    return null;
  })();
  const audio = pipedPick(data.audioStreams, true);
  if (!video && !audio) {
    throw new AppError("PROVIDER_UNAVAILABLE", `Mirror ${api} exposed no downloadable streams.`);
  }
  return {
    id: videoId,
    title: cleanCaption(asString(data.title) ?? `YouTube video ${videoId}`, 200),
    author: asString(data.uploaderName) ?? "YouTube",
    duration: toDuration(data.duration),
    thumbnail:
      asString(data.thumbnailUrl) ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: {
      video,
      videoSd: video && sd && sd !== video ? sd : null,
      audio,
    } satisfies YouTubeStreams,
  };
}

async function invidiousStreams(videoId: string, api: string) {
  const response = await fetch(
    `${api}/api/v1/videos/${videoId}?fields=title,author,lengthSeconds,videoThumbnails,formatStreams`,
    { headers: { Accept: "application/json", "User-Agent": DESKTOP_UA } },
  );
  if (!response.ok) throw new AppError("PROVIDER_UNAVAILABLE", `Mirror ${api} didn't answer.`);
  const data = asRecord(await response.json().catch(() => null));
  if (!data) throw new AppError("PROVIDER_UNAVAILABLE", `Mirror ${api} returned an empty response.`);
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
  const thumb: string = (thumbs as unknown[]).reduce<string>(
    (best, t) => asString(asRecord(t)?.url) ?? best,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  );
  const primary = hd ?? sd;
  if (!primary) throw new AppError("PROVIDER_UNAVAILABLE", `Mirror ${api} exposed no muxed streams.`);
  return {
    id: videoId,
    title: cleanCaption(asString(data.title) ?? `YouTube video ${videoId}`, 200),
    author: asString(data.author) ?? "YouTube",
    duration: toDuration(data.lengthSeconds),
    thumbnail: thumb,
    streams: {
      video: primary,
      videoSd: primary && sd && sd !== primary ? sd : null,
      audio: null,
    } satisfies YouTubeStreams,
  };
}

/* ------------------------------------------------------------------ Tier 3 */

async function noembedMeta(videoId: string, canonicalUrl: string) {
  const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`, {
    headers: { Accept: "application/json", "User-Agent": DESKTOP_UA },
  });
  if (!response.ok) throw new AppError("PROVIDER_UNAVAILABLE", "Metadata fallback didn't answer.");
  const data = asRecord(await response.json().catch(() => null));
  const title = asString(data?.title);
  if (!title) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found.");
  return {
    id: videoId,
    title: cleanCaption(title, 200),
    author: asString(data?.author_name) ?? "YouTube",
    duration: 0,
    thumbnail:
      asString(data?.thumbnail_url) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: null as YouTubeStreams | null,
  };
}

async function oembedMeta(videoId: string, canonicalUrl: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
    { headers: { Accept: "application/json", "User-Agent": DESKTOP_UA } },
  );
  if (!response.ok) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found.");
  const data = asRecord(await response.json().catch(() => null));
  const title = asString(data?.title);
  if (!title) throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found.");
  return {
    id: videoId,
    title: cleanCaption(title, 200),
    author: asString(data?.author_name) ?? "YouTube",
    duration: 0,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: null as YouTubeStreams | null,
  };
}

/* --------------------------------------------------------------- resolution */

export interface ResolvedYouTube {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  streams: YouTubeStreams;
}

/**
 * Resolve a YouTube URL through the waterfall. Phase A returns the first
 * provider with a real downloadable stream; Phase B (metadata-only) runs only
 * when every stream source fails, so the caller can answer with a clean,
 * actionable error instead of a raw 500.
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
    const hit = await runWaterfall([
      ...INNERTUBE_CLIENTS.map((client) => ({
        name: client.name,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => innertubePlayer(id, client, true),
      })),
      ...PIPED_APIS.map((api) => ({
        name: `youtube:piped:${new URL(api).hostname}`,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => pipedStreams(id, api),
      })),
      ...INVIDIOUS_APIS.map((api) => ({
        name: `youtube:invidious:${new URL(api).hostname}`,
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => invidiousStreams(id, api),
      })),
    ]);
    if (!hit.streams || (!hit.streams.video && !hit.streams.audio)) {
      throw new AppError("PROVIDER_UNAVAILABLE", "No downloadable YouTube stream was exposed.");
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
    if (streamError instanceof AppError && (streamError.code === "VIDEO_PRIVATE" || streamError.code === "VIDEO_NOT_FOUND" || streamError.code === "UNSUPPORTED_URL")) {
      throw streamError;
    }
    // Phase B: metadata-only fallbacks — proves the video exists so the UI
    // can say "try again" instead of erroring blindly.
    const meta = await runWaterfall([
      {
        name: "youtube:innertube-meta",
        timeoutMs: WATERFALL_TIMEOUT_MS,
        fn: () => innertubePlayer(id, INNERTUBE_CLIENTS[0], false),
      },
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

    if (meta) {
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        `Found “${meta.title.slice(0, 60)}” but no downloadable stream right now.`,
        "YouTube is rate-limiting this network — install the app and retry in a moment.",
      );
    }
    throw streamError instanceof AppError
      ? streamError
      : new AppError("PROVIDER_UNAVAILABLE", "YouTube is unreachable right now. Try again in a moment.");
  }
}
