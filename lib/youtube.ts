import ytdl from "@distube/ytdl-core";

import { AppError } from "@/lib/errors";
import { asRecord, asString, cleanCaption, DESKTOP_UA, toDuration } from "@/lib/http";
import { runWaterfall, WATERFALL_TIMEOUT_MS } from "@/lib/load-balancer";
import { ytdlpExtract } from "@/lib/youtube-ytdlp";
import { INVIDIOUS_DIRECT_HOSTS, isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";

/**
 * YouTube resolution engine — no third-party converter in the path.
 *
 *   1. Innertube `/youtubei/v1/player` with the ANDROID player client
 *      (`20.10.38`). Verified against VEVO/music/Shorts/regular videos: it
 *      answers a playable progressive MP4 (itag 18, video+audio) plus the
 *      AAC ladder (itag 139/140) and a REAL `lengthSeconds` — all in
 *      ~300 ms, from a datacenter IP, with no API key and no PoToken.
 *   2. Failover, only when Tier 1 refuses: the remaining Innertube clients
 *      (`IOS`, `ANDROID_VR`, `ANDROID_TESTSUITE`, `TVHTML5_SIMPLY_EMBEDDED…`),
 *      `@distube/ytdl-core`, the optional yt-dlp engine and the public
 *      Invidious / Piped mirrors — raced in parallel, first stream wins.
 *   3. noembed / oEmbed metadata — proves the video exists so a failure
 *      answers with a friendly retry, never a raw error dump.
 *
 * The old loader.to / OceanSaver converter was removed: it now answers an
 * HTML ad card instead of a job id, refuses datacenter IPs and forced every
 * download through a dead provider-access error. Cobalt is not used either —
 * public instances require per-owner JWTs. Nothing here ever buffers media
 * bytes; files stream through `/api/download` chunk-by-chunk.
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

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`;

/** Client-specific HTTP UAs. Sending a desktop UA with an Android context is
 *  itself a bot signal — YouTube expects the UA to match the client. */
const ANDROID_UA = "com.google.android.youtube/21.26.364 (Linux; U; Android 11) gzip";
const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15,gzip(gfe)";

/**
 * POST /youtubei/v1/player purely for METADATA: the real duration in seconds.
 * The converted-file path gives us a stream but never a duration, and the
 * result card must never show "Duration 0:00" — that metered metadata probe
 * usually answers even when YouTube bot-checks every stream provider.
 */
async function innertubeDuration(videoId: string): Promise<number> {
  const session = await visitorDataToken(videoId).catch(() => null);
  const response = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
      "User-Agent": ANDROID_UA,
      ...(session ? { "X-Goog-Visitor-Id": session } : {}),
    },
    signal: AbortSignal.timeout(7_000),
    body: JSON.stringify({
      videoId,
      // Same client as the primary tier: it still answers videoDetails
      // (lengthSeconds) on refusals, where the legacy WEB client now returns
      // a playability error with no metadata at all.
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "21.26.364",
          androidSdkVersion: 30,
          osName: "Android",
          osVersion: "11",
          hl: "en",
          gl: "US",
          ...(session ? { visitorData: session } : {}),
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    cache: "no-store",
  });
  if (!response.ok) return 0;
  const root = asRecord(await response.json().catch(() => null));
  return toDuration(asRecord(root?.videoDetails)?.lengthSeconds);
}

type InnertubeContext = {
  clientName: string;
  clientVersion: string;
} & Record<string, string | number>;

interface InnertubeClient {
  name: string;
  clientId: number;
  /** HTTP UA that matches this client's context. */
  userAgent: string;
  /** Embedded players need a third-party embed context. */
  embedUrl?: string;
  context: InnertubeContext;
}

/**
 * Player clients mirrored from the current yt-dlp set. `visionos` is the
 * JS-less default upstream; `tv_samsung` is the TV fallback; `web_embedded`
 * (with a non-YouTube third-party embed URL) is the age/embed path. The
 * Android client stays first because it is the only one that returns a
 * progressive muxed MP4 (itag 18) in one URL.
 */
const INNERTUBE_CLIENTS: [InnertubeClient, ...InnertubeClient[]] = [
  {
    name: "youtube:innertube-android",
    clientId: 3,
    userAgent: ANDROID_UA,
    context: {
      clientName: "ANDROID",
      clientVersion: "21.26.364",
      androidSdkVersion: 30,
      osName: "Android",
      osVersion: "11",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-visionos",
    clientId: 101,
    userAgent: SAFARI_UA,
    context: {
      clientName: "VISIONOS",
      clientVersion: "1.02",
      deviceMake: "Apple",
      deviceModel: "RealityDevice17,1",
      osName: "visionOS",
      osVersion: "26.5.23O471",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-tv-samsung",
    clientId: 7,
    userAgent:
      "Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1",
    context: {
      clientName: "TVHTML5",
      clientVersion: "5.20260707",
      deviceMake: "Samsung",
      deviceModel: "UKS9800",
      osName: "Tizen",
      osVersion: "2.4.0",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-ios",
    clientId: 5,
    userAgent: "com.google.ios.youtube/21.26.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
    context: {
      clientName: "IOS",
      clientVersion: "21.26.4",
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      osName: "iPhone",
      osVersion: "18.3.2.22D82",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-android-vr",
    clientId: 28,
    userAgent:
      "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    context: {
      clientName: "ANDROID_VR",
      clientVersion: "1.65.10",
      deviceMake: "Oculus",
      deviceModel: "Quest 3",
      androidSdkVersion: 32,
      osName: "Android",
      osVersion: "12L",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-web-embedded",
    clientId: 56,
    userAgent: SAFARI_UA,
    // A non-YouTube embed URL is what the embedded client expects; using
    // youtube.com here makes YouTube answer "video unavailable".
    embedUrl: "https://www.reddit.com/",
    context: {
      clientName: "WEB_EMBEDDED_PLAYER",
      clientVersion: "2.20260708.00.00",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "youtube:innertube-tv-embedded",
    clientId: 85,
    userAgent: SAFARI_UA,
    embedUrl: "https://www.reddit.com/",
    context: {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      hl: "en",
      gl: "US",
    },
  },
];

/* ------------------------------------------------------------------
 * Datacenter context: visitorData + public-video proof.
 *
 * Vercel's egress IPs are asked for sign-in (`LOGIN_REQUIRED`) even on public
 * videos. Two cheap, allowlisted calls make that survivable:
 *   - the embed page carries a fresh `visitorData` token that gives Innertube
 *     a real session context instead of an anonymous datacenter request;
 *   - oEmbed is NOT bot-checked for public videos, so a 200 proves the video
 *     is public and the player refusal is a network block, not a private
 *     video. That distinction is what used to surface as a false 403.
 * Both are cached per isolate.
 * ------------------------------------------------------------------ */

const VISITOR_DATA_TTL_MS = 30 * 60_000;
let visitorDataCache: { value: string; expiresAt: number } | null = null;
/** Single-flight: the failover clients race in parallel and must share one
 *  embed fetch instead of each paying the same page load. */
let visitorDataInFlight: Promise<string | null> | null = null;

function extractVisitorData(html: string): string | null {
  const at = html.indexOf("visitorData");
  if (at < 0) return null;
  const colon = html.indexOf(":", at);
  if (colon < 0) return null;
  const start = html.indexOf('"', colon);
  if (start < 0) return null;
  const end = html.indexOf('"', start + 1);
  if (end < 0) return null;
  const value = html.slice(start + 1, end);
  return /^[A-Za-z0-9_%=-]{20,200}$/.test(value) ? value : null;
}

async function loadVisitorData(videoId: string): Promise<string | null> {
  const now = Date.now();
  // The embed page usually carries visitorData, but a consent/challenge page
  // can replace it. The watch page and the homepage carry the same ytcfg
  // token, so try all three before giving up on a session context.
  const pages = [
    `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    "https://www.youtube.com/",
  ];
  for (const page of pages) {
    try {
      const response = await fetch(page, {
        headers: {
          "User-Agent": DESKTOP_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(3_500),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        continue;
      }
      const token = extractVisitorData(await response.text());
      if (token) {
        visitorDataCache = { value: token, expiresAt: now + VISITOR_DATA_TTL_MS };
        return token;
      }
    } catch {
      // Try the next page; a missing session token is a soft downgrade.
    }
  }
  return null;
}

async function visitorDataToken(videoId: string): Promise<string | null> {
  if (visitorDataCache && visitorDataCache.expiresAt > Date.now()) return visitorDataCache.value;
  if (!visitorDataInFlight) {
    visitorDataInFlight = loadVisitorData(videoId).finally(() => {
      visitorDataInFlight = null;
    });
  }
  return visitorDataInFlight;
}

const PUBLIC_VIDEO_TTL_MS = 10 * 60_000;
const publicVideoCache = new Map<string, { isPublic: boolean; expiresAt: number }>();

function cachePublicVerdict(videoId: string, isPublic: boolean): void {
  publicVideoCache.set(videoId, { isPublic, expiresAt: Date.now() + PUBLIC_VIDEO_TTL_MS });
  while (publicVideoCache.size > 500) {
    const oldest = publicVideoCache.keys().next().value;
    if (oldest === undefined) break;
    publicVideoCache.delete(oldest);
  }
}

/**
 * Definite public/not-public verdict from oEmbed, or null when the proof
 * itself is unreachable. A network failure must NEVER become a video
 * verdict: that is what produced the false "private"/"not found" banners.
 */
async function checkPublicYouTubeVideo(videoId: string): Promise<boolean | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      {
        headers: { Accept: "application/json", "User-Agent": DESKTOP_UA },
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      // Only a genuine "this video is not public" answer may become a
      // verdict. 403 is what YouTube's edge sends to a blocked network, and
      // caching that as "not found" is what produced false 404s.
      if (response.status === 401 || response.status === 404) {
        cachePublicVerdict(videoId, false);
        return false;
      }
      return null; // rate limit / 5xx: the proof is unavailable, not the video
    }
    const data = asRecord(await response.json().catch(() => null));
    const isPublic = typeof data?.title === "string" && data.title.length > 0;
    cachePublicVerdict(videoId, isPublic);
    return isPublic;
  } catch {
    return null;
  }
}

const publicVideoInFlight = new Map<string, Promise<boolean | null>>();

/** Single-flight wrapper: every racing player client shares one oEmbed proof. */
async function isPublicYouTubeVideo(videoId: string): Promise<boolean | null> {
  const cached = publicVideoCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return cached.isPublic;
  const inFlight = publicVideoInFlight.get(videoId);
  if (inFlight) return inFlight;
  const task = checkPublicYouTubeVideo(videoId).finally(() => publicVideoInFlight.delete(videoId));
  publicVideoInFlight.set(videoId, task);
  return task;
}

interface InnertubeFormat {
  itag?: number;
  url?: string;
  signatureCipher?: string;
  mimeType?: string;
  qualityLabel?: string;
  bitrate?: number;
}

async function innertubePlayer(
  videoId: string,
  client: InnertubeClient,
): Promise<TierHit> {
  const session = await visitorDataToken(videoId);
  const response = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      // Embedded players must look like a third-party embed, not a YouTube
      // page load. A YouTube referer here makes them answer "unavailable".
      Referer: client.embedUrl ?? "https://www.youtube.com/",
      "User-Agent": client.userAgent,
      "X-YouTube-Client-Name": String(client.clientId),
      "X-YouTube-Client-Version": client.context.clientVersion,
      ...(session ? { "X-Goog-Visitor-Id": session } : {}),
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: { ...client.context, ...(session ? { visitorData: session } : {}) },
        ...(client.embedUrl ? { thirdParty: { embedUrl: client.embedUrl } } : {}),
      },
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
  if (status === "LOGIN_REQUIRED" || status === "UNPLAYABLE") {
    // A datacenter IP gets "Sign in to confirm you're not a bot" on ordinary
    // public videos. oEmbed is not gated, so a 200 proves the video itself is
    // fine and this refusal is the network, not the video. Only a DEFINITE
    // not-public verdict may produce the private/age-restricted answer; an
    // unreachable proof stays a provider error so the race keeps going.
    const isPublic = await isPublicYouTubeVideo(videoId);
    if (isPublic === false) {
      throw new AppError(
        "VIDEO_PRIVATE",
        "This YouTube video needs login, is age-restricted, or is private.",
        "Public videos and Shorts download normally.",
      );
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube is bot-checking this network for that video.",
      "Trying the other extraction engines and your own connection.",
    );
  }
  if (status !== "OK") {
    // A single client can answer "unavailable" for a perfectly public video
    // (embedded/TV refusals do exactly that). Never let that one reply become
    // a definitive 404 unless oEmbed also says the video is gone.
    const isPublic = await isPublicYouTubeVideo(videoId);
    if (isPublic === false) {
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
  // Audio-only renditions are deliberately NOT exposed as a download.
  // Adaptive googlevideo URLs are prefix-limited without n-signature
  // deciphering: Google serves roughly the first 1 MB and answers every later
  // range with 403, so an "MP3" would arrive truncated. The video button
  // below uses the muxed itag 18 file, which streams end to end.
  const audio: string | null = null;

  const primary = hd ?? sd;
  // A video-only adaptive stream is NOT a valid card: the download would be
  // silent. Only a muxed MP4 (itag 18/22) may win; audio alone is kept for
  // the MP3 button below when a different client supplies it.
  if (!primary) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — no muxed MP4 from this client.",
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
    // The bridge hands back a lazily-resolved audio URL, so a music video it
    // rescued still gets its MP3 button instead of "Audio unavailable".
    streams: { video: hit.video, videoSd: null, audio: hit.audio },
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

/**
 * Direct Invidious attachment (`/latest_version?id=…&itag=18&local=true`).
 * The instance proxies the bytes, so a datacenter-blocked resolver can still
 * hand off a file. The endpoint is never trusted blindly: a real Range
 * request must return MP4/WebM bytes, not the Cloudflare/HTML page that dead
 * mirrors answer with.
 */
async function invidiousDirectStream(videoId: string, canonicalUrl: string): Promise<TierHit> {
  const candidates = await Promise.all(
    INVIDIOUS_DIRECT_HOSTS.map(async (host) => {
      const url = `https://${host}/latest_version?id=${encodeURIComponent(videoId)}&itag=18&local=true`;
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": DESKTOP_UA,
            Range: "bytes=0-4095",
            Accept: "video/mp4,video/webm,*/*",
          },
          redirect: "follow",
          cache: "no-store",
          signal: AbortSignal.timeout(4_500),
        });
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          return null;
        }
        const type = (response.headers.get("content-type") ?? "").toLowerCase();
        if (type.startsWith("video/")) {
          await response.body?.cancel().catch(() => undefined);
          return url;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const mp4 =
          bytes.length >= 8 &&
          bytes[4] === 0x66 && // f
          bytes[5] === 0x74 && // t
          bytes[6] === 0x79 && // y
          bytes[7] === 0x70; // p
        const webm =
          bytes.length >= 4 &&
          bytes[0] === 0x1a &&
          bytes[1] === 0x45 &&
          bytes[2] === 0xdf &&
          bytes[3] === 0xa3;
        return mp4 || webm ? url : null;
      } catch {
        return null;
      }
    }),
  );
  const direct = candidates.find((value): value is string => Boolean(value)) ?? null;
  if (!direct) {
    throw new AppError("PROVIDER_UNAVAILABLE", "No direct mirror answered.");
  }

  const meta = await oembedMeta(videoId, canonicalUrl).catch(() => null);
  const duration = await watchPageDuration(videoId);
  return {
    id: videoId,
    title: meta?.title ?? `YouTube video ${videoId}`,
    author: meta?.author ?? "YouTube",
    duration,
    thumbnail: meta?.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    streams: { video: direct, videoSd: null, audio: null },
  };
}

/** Real duration from the watch page (works when the player API is gated). */
async function watchPageDuration(videoId: string): Promise<number> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { "User-Agent": DESKTOP_UA, "Accept-Language": "en-US,en;q=0.9" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return 0;
    }
    const html = await response.text();
    const match = html.match(/"lengthSeconds":"(\d+)"/);
    return match ? toDuration(match[1]) : 0;
  } catch {
    return 0;
  }
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

/* --------------------------------------------------------------------------
 *  Resolved-link cache — a second resolve of the same video must not repeat
 *  the extraction work.
 *
 *  Only shareable CDN links (mirror / attachment hosts) are cached.
 *  googlevideo URLs are bound to the IP that resolved them, so serving one to
 *  a different visitor would dead-end their download; the cache declines
 *  them and the next call re-resolves through Innertube (one fast request).
 *  Per-isolate memory: a cold function simply re-resolves.
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
 * Remember a successfully resolved video. Merge-friendly: a later claim can
 * add audio to an entry that already has video. Entries without a shareable
 * stream aren't kept.
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

/**
 * One resolved stream set, shared by `/api/youtube` and `/api/fetch`.
 * `jobs` stays in the shape so the client response contract does not change —
 * it is always empty now that no converter exists.
 */
export interface ResolvedYouTubeStart {
  state: "resolved";
  meta: { id: string; title: string; author: string; duration: number; thumbnail: string };
  streams: YouTubeStreams;
  jobs: [];
}

/**
 * Tier 1 wall clock. The ANDROID client answers in ~300 ms from a clean IP
 * and refuses in about the same time from a blocked one, so a long wait only
 * delays the browser rescue. Kept short to stay inside a 6-second function
 * budget (the smallest Vercel plan) with room to return the soft failure.
 */
const PRIMARY_BUDGET_MS = 2_500;

/**
 * Narrow a provider hit to one that can become a download card. Only a muxed
 * (video+audio) MP4 qualifies: an adaptive video-only file would save silently,
 * which is worse than a clean retry.
 */
function requireStreams(hit: TierHit): TierHit & { streams: YouTubeStreams } {
  if (!hit.streams?.video) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — retry in a moment.",
      "No muxed MP4 was returned for this video; retry shortly.",
    );
  }
  return { ...hit, streams: hit.streams };
}
/**
 * Wall clock for the WHOLE resolve, failover included. Vercel's smallest plan
 * kills a function at ~6 s, so the failover race gets whatever is left of
 * this after Tier 1 — not a fixed slice.
 *
 * That matters for the one engine that survives YouTube's datacenter
 * bot-check on label music: the yt-dlp bridge has to spawn Python, fetch the
 * player response and pick a format, which is seconds, not milliseconds. The
 * old fixed 3.5 s race killed it mid-extraction on exactly the videos the
 * mirrors cannot resolve.
 */
// The bridge is the only engine that survives YouTube's datacenter bot-check
// on label music, and a cold run spawns Python, fetches the player response and
// picks a format — 8-15 s, not milliseconds. A 5.4 s window cut it off
// mid-extraction and reported PROVIDER_UNAVAILABLE for videos it then resolved
// fine on a second attempt. 16 s fits just under the bridge's own 15 s ceiling,
// so a genuinely unavailable video still fails inside the 60 s function.
const RESOLVE_BUDGET_MS = 16_000;

/**
 * Tier 1 — ANDROID Innertube. This is the engine that actually works from a
 * datacenter IP in 2026: it answers itag 18 (progressive MP4 with audio), the
 * AAC ladder for the MP3 button and a real `lengthSeconds` in ~300 ms. Every
 * other Innertube client is failover only: IOS advertises adaptive-only
 * streams, ANDROID_VR/IOS currently answer LOGIN_REQUIRED for music videos,
 * and the TV/embedded clients are refused outright.
 */
async function resolveYouTubeStreams(
  id: string,
  canonicalUrl: string,
): Promise<TierHit & { streams: YouTubeStreams }> {
  const startedAt = Date.now();
  const [android, ...fallbacks] = INNERTUBE_CLIENTS;

  try {
    return requireStreams(
      await withDeadline(innertubePlayer(id, android), PRIMARY_BUDGET_MS, android.name),
    );
  } catch (error) {
    // A private / deleted / livestream answer is definitive — never retried.
    if (isDefinitiveVideoError(error)) throw error;
  }

  // What is left of the function budget. A blocked music video spends it in
  // the yt-dlp bridge, so the bridge gets the whole window instead of the
  // old 8 s inner deadline that the race always cut short anyway.
  const failoverBudget = Math.max(1_800, RESOLVE_BUDGET_MS - (Date.now() - startedAt));

  const chains: Array<Promise<TierHit>> = [
    ...fallbacks.map((client) =>
      withDeadline(innertubePlayer(id, client), WATERFALL_TIMEOUT_MS, client.name),
    ),
    withDeadline(ytdlCoreResolve(id, canonicalUrl), WATERFALL_TIMEOUT_MS, "youtube:ytdl-core"),
    withDeadline(ytdlpAndroidResolve(id, canonicalUrl), failoverBudget, "youtube:ytdlp-android"),
    ...INVIDIOUS_APIS.map((api) =>
      withDeadline(
        invidiousStreams(id, api),
        WATERFALL_TIMEOUT_MS,
        `youtube:invidious:${new URL(api).hostname}`,
      ),
    ),
    ...PIPED_APIS.map((api) =>
      withDeadline(pipedStreams(id, api), WATERFALL_TIMEOUT_MS, `youtube:piped:${new URL(api).hostname}`),
    ),
    // Sits IN the race, not after it: a dead mirror probe must never add its
    // timeout to a resolve that already ran out of function budget.
    withDeadline(invidiousDirectStream(id, canonicalUrl), WATERFALL_TIMEOUT_MS, "youtube:invidious-direct"),
  ];

  let hit: TierHit;
  try {
    hit = await Promise.race([
      firstDefinitiveHit(...chains),
      new Promise<never>((_resolve, reject) => {
        setTimeout(
          () =>
            reject(
              new AppError(
                "PROVIDER_UNAVAILABLE",
                "Resolving high-speed stream — retry in a moment.",
                "YouTube is answering slowly; retry shortly.",
              ),
            ),
          failoverBudget,
        );
      }),
    ]);
  } catch (error) {
    if (isDefinitiveVideoError(error)) throw error;
    // Every engine failed for a reason that is NOT the video (bot-checked
    // datacenter IP, mirror timeout). Surface one stable, user-safe message
    // instead of the last engine's internal timeout text.
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube is limiting downloads on this server network right now.",
      "Retry in a moment — the browser fallback also tries your own connection.",
    );
  }

  return requireStreams(hit);
}

export async function startYouTubeResolution(
  rawUrl: string,
  options: { fresh?: boolean } = {},
): Promise<ResolvedYouTubeStart> {
  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "That doesn't look like a YouTube video link.",
      "Try a youtube.com/watch, youtu.be share link, or /shorts/ link.",
    );
  }
  const { id, canonicalUrl } = parsed;

  // Only converter/mirror CDN links are shareable across IPs; googlevideo
  // URLs are bound to the resolving IP, so `rememberYouTubeStreams` declines
  // them and the next call simply resolves fresh (one fast Innertube request).
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
    const hit = await resolveYouTubeStreams(id, canonicalUrl);
    const meta = {
      id: hit.id || id,
      title: hit.title || `YouTube video ${id}`,
      author: hit.author || "YouTube",
      // Every stream provider above carries `lengthSeconds`; the metadata
      // probe is only a safety net, so the card can never show 0:00.
      duration: hit.duration > 0 ? hit.duration : await innertubeDuration(id).catch(() => 0),
      thumbnail: hit.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
    rememberYouTubeStreams(id, meta, hit.streams);
    return { state: "resolved", meta, streams: hit.streams, jobs: [] };
  } catch (error) {
    if (isDefinitiveVideoError(error)) throw error;
    if (error instanceof AppError) throw error;
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube is limiting downloads on this server network right now.",
      "Retry in a moment — the browser fallback also tries your own connection.",
    );
  }
}

/**
 * Resolve a YouTube URL for the shared resolver (`/api/fetch`). Same engine,
 * same errors — only the response shape differs.
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
    const hit = await resolveYouTubeStreams(id, canonicalUrl);
    const duration = hit.duration > 0 ? hit.duration : await innertubeDuration(id).catch(() => 0);
    return {
      id: hit.id || id,
      title: hit.title || `YouTube video ${id}`,
      author: hit.author || "YouTube",
      duration,
      thumbnail: hit.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      streams: hit.streams,
    };
  } catch (streamError) {
    if (isDefinitiveVideoError(streamError)) throw streamError;
    // Metadata-only fallbacks prove the video exists, so the UI answers with
    // a friendly retry instead of pretending the link is invalid.
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
      "YouTube is limiting downloads on this server network right now.",
      "Retry in a moment — the browser fallback also tries your own connection.",
    );
  }
}
