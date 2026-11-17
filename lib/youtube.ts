import ytdl from "@distube/ytdl-core";

import { bridgeEndpoints } from "@/lib/bridge-urls";
import { AppError } from "@/lib/errors";
import { asRecord, asString, cleanCaption, DESKTOP_UA, toDuration } from "@/lib/http";
import { runWaterfall, WATERFALL_TIMEOUT_MS } from "@/lib/load-balancer";
import {
  isTruncatedYouTubeId,
  readYouTubeId,
  YOUTUBE_ID_RE,
  YOUTUBE_TRUNCATED_ID_HINT,
  YOUTUBE_TRUNCATED_ID_MESSAGE,
} from "@/lib/youtube-id";
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
 * download through a dead provider-access error. Cobalt is supported only
 * when an operator supplies a permitted instance (public instances require
 * Turnstile/JWTs); nothing here ever buffers media bytes — files stream
 * through `/api/download` chunk-by-chunk.
 */

export interface YouTubeStreams {
  /** Best progressive MP4 (1080p via mirrors, else 720p, else 360p). */
  video: string | null;
  /** Lower-bitrate MP4, when distinct from `video`. */
  videoSd: string | null;
  /** Highest-bitrate audio, when exposed. */
  audio: string | null;
  /**
   * Container behind `audio`, so the UI can label the button with the file the
   * user actually gets. The bridge and the Innertube ladders are AAC in M4A;
   * Piped may answer Opus in WebM, and unknown sources are left null rather
   * than guessed.
   */
  audioFormat?: "m4a" | "mp3" | null;
  /**
   * A real MP3 the bridge can encode on request. Absent when no bridge is
   * configured or its ffmpeg is missing, so the button never promises a file
   * that cannot be produced.
   */
  audioEncoded?: string | null;
}

export interface ResolvedYouTube {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  streams: YouTubeStreams;
}

/** Accept watch / shorts / youtu.be / embed / live / music links. */
export function parseYouTubeUrl(raw: string): { id: string; canonicalUrl: string } | null {
  const candidate = readYouTubeId(raw);
  if (!candidate?.hostMatched || !candidate.id || !YOUTUBE_ID_RE.test(candidate.id)) return null;
  return { id: candidate.id, canonicalUrl: `https://www.youtube.com/watch?v=${candidate.id}` };
}

/** The API gets the same explanation as the field when a paste is incomplete. */
function truncatedYouTubeError(): AppError {
  return new AppError("INVALID_URL", YOUTUBE_TRUNCATED_ID_MESSAGE, YOUTUBE_TRUNCATED_ID_HINT);
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
    const liveNow = (details as { isLive?: boolean }).isLive === true;
    throw new AppError(
      "VIDEO_LIVE",
      liveNow ? LIVE_NOW_MESSAGE : LIVE_ARCHIVE_MESSAGE,
      liveNow ? LIVE_NOW_HINT : LIVE_ARCHIVE_HINT,
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
    // The version that was originally proven from a datacenter IP. Kept as a
    // separate client because YouTube gates client versions independently.
    name: "youtube:innertube-android-legacy",
    clientId: 3,
    userAgent: ANDROID_UA,
    context: {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
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
    // TVHTML5/ANDROID_TESTSUITE are the two clients most often tried for a
    // datacenter IP. Keep TESTSUITE even though it currently refuses most
    // videos: it costs one parallel request and can recover when YouTube
    // changes the Android gate.
    name: "youtube:innertube-android-testsuite",
    clientId: 30,
    userAgent: "com.google.android.youtube/1.9 (Linux; U; Android 11; en_US) gzip",
    context: {
      clientName: "ANDROID_TESTSUITE",
      clientVersion: "1.9",
      androidSdkVersion: 30,
      osName: "Android",
      osVersion: "11",
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

/**
 * Last-resort live probe.
 *
 * When every engine fails, the watch page is the one document YouTube still
 * serves to a datacenter IP and it carries the live flags in its player JSON.
 * This is what lets a running broadcast / a live recording get its own answer
 * instead of the generic "network is limited" text. Best-effort: an unreachable
 * page returns null and the caller keeps the provider error.
 */
const liveStateCache = new Map<string, { state: "live" | "archive" | "vod"; expiresAt: number }>();

/**
 * One voice for every resolver path that meets live content. The player
 * response, the mirrors and the last-resort probe all used to phrase the same
 * fact differently; the field shows these verbatim, so they live here once.
 */
const LIVE_NOW_MESSAGE =
  "This is a live stream right now. There is no file until the broadcast ends.";
const LIVE_NOW_HINT = "Come back after it ends; YouTube then publishes the recording.";
const LIVE_ARCHIVE_MESSAGE = "This is a recording of a live stream, so there is no downloadable MP4.";
const LIVE_ARCHIVE_HINT = "A regular upload or Short downloads normally.";
const LIVE_PENDING_MESSAGE =
  "This live stream hasn't started yet, or has just ended and is still processing.";
const LIVE_PENDING_HINT = "No file exists until YouTube publishes the recording.";
const LIVE_CONTENT_MESSAGE = "This is live-stream content — there is no downloadable MP4.";

async function detectLiveState(videoId: string): Promise<"live" | "archive" | "vod" | null> {
  const cached = liveStateCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return cached.state;
  // The desktop page answers a datacenter IP with a consent/bot shell often
  // enough that the mobile page is worth one extra try; both are cheap and
  // this only runs after every real engine has already failed.
  const pages = [
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US&bpctr=9999999999&has_verified=1`,
    `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`,
  ];
  for (const page of pages) {
    try {
      const response = await fetch(page, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+1",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) continue;
      const html = await response.text();
      if (!html.includes("ytInitialPlayerResponse")) continue;
      // Only positive evidence is taken from the page: a consent/bot shell
      // carries the initial-player script without any live flags, and calling
      // that "vod" used to return before the page-data probe below could read
      // "Streamed live on …". A page that says nothing falls through.
      const liveContent = /"isLiveContent":true/.test(html);
      if (!liveContent) continue;
      const liveNow = /"isLiveNow":true/.test(html) || /"isLive":true/.test(html);
      const state = liveNow ? ("live" as const) : ("archive" as const);
      liveStateCache.set(videoId, { state, expiresAt: Date.now() + 5 * 60_000 });
      return state;
    } catch {
      // Try the next page shape.
    }
  }
  // Both watch pages can be replaced by a consent/bot shell on a datacenter
  // IP, but the page-data API behind them usually still answers. A finished
  // broadcast dates itself "Streamed live on …"; a normal upload dates
  // itself with its upload date, so this is a direct live-content signal.
  try {
    const response = await fetch(
      "https://www.youtube.com/youtubei/v1/next?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240701.00.00",
              hl: "en",
              gl: "US",
            },
          },
          videoId,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      },
    );
    if (response.ok) {
      const raw = JSON.stringify(await response.json().catch(() => null));
      if (raw.includes("videoPrimaryInfoRenderer")) {
        const state = /"dateText":\{"simpleText":"Streamed live/.test(raw)
          ? ("archive" as const)
          : ("vod" as const);
        liveStateCache.set(videoId, { state, expiresAt: Date.now() + 5 * 60_000 });
        return state;
      }
    }
  } catch {
    // No answer: the caller keeps the provider error.
  }
  return null;
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
    logEngineFailure(client.name, new AppError("PROVIDER_UNAVAILABLE", "player request failed"), response.status);
    throw new AppError("PROVIDER_UNAVAILABLE", "YouTube didn't answer the metadata request.");
  }
  const root = asRecord(await response.json().catch(() => null));
  if (!root) throw new AppError("PROVIDER_UNAVAILABLE", "YouTube returned an empty player response.");

  const status = asString(asRecord(root.playabilityStatus)?.status)?.toUpperCase() ?? "";
  const statusReason = asString(asRecord(root.playabilityStatus)?.reason) ?? "";
  if (status !== "OK") {
    logEngineFailure(client.name, new Error(`${status || "NO_STATUS"}: ${statusReason}`), response.status);
  }
  // Live state must be read before any privacy verdict: a running broadcast
  // often answers LOGIN_REQUIRED/UNPLAYABLE to a datacenter IP, and oEmbed
  // says "not public" for it, which used to surface as "private or
  // age-restricted" — a wrong and unactionable answer.
  const earlyDetails = asRecord(root.videoDetails) ?? {};
  const liveNowEarly = earlyDetails.isLive === true || earlyDetails.isLiveNow === true;
  const liveContentEarly = earlyDetails.isLiveContent === true;
  // A refused playback on live content is an answer about the video, not the
  // network: report which one it is instead of falling through to "private"
  // or "retry in a moment". An OK response still resolves normally — a
  // finished live recording often has a muxed MP4.
  if (status !== "OK" && (liveNowEarly || liveContentEarly)) {
    throw new AppError(
      "VIDEO_LIVE",
      liveNowEarly ? LIVE_NOW_MESSAGE : LIVE_ARCHIVE_MESSAGE,
      liveNowEarly ? LIVE_NOW_HINT : LIVE_ARCHIVE_HINT,
    );
  }
  if (liveNowEarly || status === "LIVE_STREAM_OFFLINE") {
    throw new AppError("VIDEO_LIVE", LIVE_PENDING_MESSAGE, LIVE_PENDING_HINT);
  }
  if (status === "LOGIN_REQUIRED" || status === "UNPLAYABLE") {
    // A datacenter IP gets "Sign in to confirm you're not a bot" on ordinary
    // public videos. oEmbed is not gated, so a 200 proves the video itself is
    // fine and this refusal is the network, not the video. Only a DEFINITE
    // not-public verdict may produce the private/age-restricted answer; an
    // unreachable proof stays a provider error so the race keeps going.
    const isPublic = await isPublicYouTubeVideo(videoId);
    if (isPublic === false) {
      // Live answers LOGIN_REQUIRED to datacenter IPs and oEmbed calls it
      // non-public; the watch page is the tie-breaker.
      const liveState = await detectLiveState(videoId);
      if (liveState === "live" || liveState === "archive") {
        throw new AppError(
          "VIDEO_LIVE",
          LIVE_CONTENT_MESSAGE,
          LIVE_ARCHIVE_HINT,
        );
      }
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
      const liveState = await detectLiveState(videoId);
      if (liveState === "live" || liveState === "archive") {
        throw new AppError(
          "VIDEO_LIVE",
          LIVE_CONTENT_MESSAGE,
          LIVE_ARCHIVE_HINT,
        );
      }
      throw new AppError("VIDEO_NOT_FOUND", "That YouTube video wasn't found — it may be deleted or private.");
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Resolving high-speed stream — YouTube refused this playback.",
      "Retry in a moment.",
    );
  }

  const details = asRecord(root.videoDetails) ?? {};
  /** Live state, straight from the player response YouTube sent us. */
  const isLiveNow = details.isLive === true || details.isLiveNow === true;
  const wasLive = details.isLiveContent === true;
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
    // Live content is not a provider failure: YouTube has no muxed MP4 for a
    // running broadcast, and a finished archive may still be HLS-only. Saying
    // "try another engine" here would send the visitor into a retry loop that
    // can never succeed.
    if (isLiveNow) {
      throw new AppError("VIDEO_LIVE", LIVE_NOW_MESSAGE, LIVE_NOW_HINT);
    }
    if (wasLive) {
      throw new AppError("VIDEO_LIVE", LIVE_ARCHIVE_MESSAGE, LIVE_ARCHIVE_HINT);
    }
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

/* ------------------------------------------------------------------
 * Tier 2b: the mobile watch page itself.
 *
 * The player API is the first thing YouTube bot-checks on a datacenter IP;
 * the HTML watch page is a different edge path and often still carries a
 * complete `ytInitialPlayerResponse`, including the muxed itag 18 URL. This
 * runs as one more racer, not a blocking hop, so a login wall costs only its
 * own deadline. It never turns a page refusal into a video verdict.
 * ------------------------------------------------------------------ */

function balancedJsonAt(text: string, start: number): string | null {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function initialPlayerResponse(html: string): Record<string, unknown> | null {
  for (const marker of ["ytInitialPlayerResponse =", '\"ytInitialPlayerResponse\":', "ytInitialPlayerResponse="]) {
    const at = html.indexOf(marker);
    if (at < 0) continue;
    const brace = html.indexOf("{", at + marker.length);
    if (brace < 0) continue;
    const json = balancedJsonAt(html, brace);
    if (!json) continue;
    try {
      return asRecord(JSON.parse(json));
    } catch {
      // A truncated/challenge page: try the next marker.
    }
  }
  return null;
}

function watchPageHit(root: Record<string, unknown>, videoId: string): TierHit {
  const status = asString(asRecord(root.playabilityStatus)?.status)?.toUpperCase() ?? "";
  const details = asRecord(root.videoDetails) ?? {};
  if (details.isLive === true || details.isLiveNow === true) {
    throw new AppError("VIDEO_LIVE", LIVE_NOW_MESSAGE, LIVE_NOW_HINT);
  }
  if (status !== "OK") {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      `YouTube watch page refused playback (${status || "no status"}).`,
    );
  }
  const streaming = asRecord(root.streamingData);
  const formats = Array.isArray(streaming?.formats) ? (streaming.formats as InnertubeFormat[]) : [];
  let sd: string | null = null;
  let hd: string | null = null;
  for (const format of formats) {
    const url = typeof format.url === "string" && format.url.includes("googlevideo.com") ? format.url : null;
    if (!url || !(format.mimeType ?? "").includes("video/mp4")) continue;
    if (format.itag === 18 || format.qualityLabel === "360p") sd = sd ?? url;
    else if (format.itag === 22 || format.qualityLabel === "720p") hd = hd ?? url;
  }
  // The acceptance target is the muxed 640x360 file; use 720p only when the
  // page did not expose itag 18.
  const video = sd ?? hd;
  if (!video) {
    throw new AppError("PROVIDER_UNAVAILABLE", "YouTube watch page exposed no muxed MP4.");
  }
  const thumbArray = asRecord(details.thumbnail);
  const thumbs = Array.isArray(thumbArray?.thumbnails) ? thumbArray.thumbnails : [];
  const thumb =
    (thumbs as Array<{ url?: unknown }>).reduce<string | null>(
      (best, entry) => (typeof entry.url === "string" && entry.url ? entry.url : best),
      null,
    ) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return {
    id: videoId,
    title: cleanCaption(asString(details.title) ?? `YouTube video ${videoId}`, 200),
    author: asString(details.author) ?? "YouTube",
    duration: toDuration(details.lengthSeconds),
    thumbnail: thumb,
    streams: { video, videoSd: null, audio: null },
  };
}

async function watchPageStreams(videoId: string): Promise<TierHit> {
  const pages = [
    {
      name: "youtube:watch-mobile",
      url: `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US`,
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
    },
    {
      name: "youtube:watch-desktop",
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US&bpctr=9999999999&has_verified=1`,
      userAgent: DESKTOP_UA,
    },
  ];
  const attempts = pages.map(async (page) => {
    try {
      const response = await fetch(page.url, {
        headers: {
          "User-Agent": page.userAgent,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+1",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
      });
      if (!response.ok) {
        logEngineFailure(page.name, new AppError("PROVIDER_UNAVAILABLE", "watch page request failed"), response.status);
        throw new AppError("PROVIDER_UNAVAILABLE", `YouTube watch page answered ${response.status}.`);
      }
      const html = await response.text();
      const root = initialPlayerResponse(html);
      if (!root) {
        logEngineFailure(page.name, new AppError("PROVIDER_UNAVAILABLE", "no player payload on page"));
        throw new AppError("PROVIDER_UNAVAILABLE", "YouTube watch page carried no player payload.");
      }
      const hit = watchPageHit(root, videoId);
      return hit;
    } catch (error) {
      if (!(error instanceof AppError) || error.code === "PROVIDER_UNAVAILABLE") {
        logEngineFailure(page.name, error);
      }
      throw error;
    }
  });
  try {
    return await Promise.any(attempts);
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "Both YouTube watch pages refused playback.");
  }
}

/* ------------------------------------------------------------------ Tier 3 */

/**
 * Public mirror lists, measured 2026-11-14 from the production network.
 *
 * The previous pair was dead: pipedapi.kavin.rocks answered nothing and
 * pipedapi.adminforge.de answered 301 → 403. Both were replaced with the two
 * Piped APIs that still returned a parseable stream payload; the Invidious
 * pair answers 403 to some networks (Cloudflare bot rules) but is reachable
 * from others, so it stays behind the env override instead of being deleted.
 *
 * A mirror is one racer in a Promise.race, never a blocking hop: a dead
 * instance costs its own timeout and nothing else. Operators can replace the
 * lists without a deploy:
 *
 *   YT_PIPED_APIS=https://a.example,https://b.example
 *   YT_INVIDIOUS_APIS=https://c.example
 */
function mirrorList(name: string, defaults: readonly string[]): string[] {
  const configured = (process.env[name] ?? "")
    .split(/[\s,]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter((entry) => /^https:\/\/[^\s]{4,2048}$/.test(entry));
  return configured.length ? configured : [...defaults];
}

const PIPED_APIS = mirrorList("YT_PIPED_APIS", [
  "https://api.piped.private.coffee",
  "https://pipedapi.ducks.party",
  "https://pipedapi.kavin.rocks",
]);

/**
 * Cobalt is optional, not a default. Every public instance listed by
 * cobalt.directory currently answers `error.api.auth.jwt.missing` unless the
 * caller has solved Turnstile; hard-coding those hosts would only spend a
 * dead 8-second racer on every video. An operator who runs (or has permission
 * to use) an instance can opt in with COBALT_API_URL or YT_COBALT_APIS,
 * comma-separated for failover, plus COBALT_API_KEY when required.
 */
function cobaltApis(): string[] {
  const raw = [process.env.COBALT_API_URL, process.env.YT_COBALT_APIS]
    .filter((value): value is string => Boolean(value))
    .join(",");
  return raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter((entry) => /^https:\/\/[^\s]{4,2048}$/.test(entry));
}

const COBALT_APIS = cobaltApis();

const INVIDIOUS_APIS = mirrorList("YT_INVIDIOUS_APIS", [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
]);

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
    // rescued still gets an audio button instead of "Audio unavailable".
    // That ladder is AAC, which is the M4A the download route names it.
    streams: {
      video: hit.video,
      videoSd: null,
      audio: hit.audio,
      audioFormat: hit.audio ? "m4a" : null,
      audioEncoded: hit.mp3,
    },
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
    // A mirror hanging must cost its own deadline, not the Netlify function.
    cache: "no-store",
    signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
  });
  if (!response.ok) {
    logEngineFailure(`youtube:piped:${new URL(api).hostname}`, new AppError("PROVIDER_UNAVAILABLE", "stream request failed"), response.status);
    throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  }
  const data = asRecord(await response.json().catch(() => null));
  if (!data) throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  if (data.livestream === true) {
    throw new AppError("VIDEO_LIVE", LIVE_NOW_MESSAGE, LIVE_NOW_HINT);
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
    {
      headers: { Accept: "application/json", "User-Agent": DESKTOP_UA },
      cache: "no-store",
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    logEngineFailure(`youtube:invidious:${new URL(api).hostname}`, new AppError("PROVIDER_UNAVAILABLE", "stream request failed"), response.status);
    throw new AppError("PROVIDER_UNAVAILABLE", "Resolving high-speed stream — mirror busy.");
  }
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
async function cobaltResolve(videoId: string, canonicalUrl: string): Promise<TierHit> {
  if (COBALT_APIS.length === 0) {
    throw new AppError("PROVIDER_UNAVAILABLE", "No permitted Cobalt instance is configured.");
  }
  const attempts = COBALT_APIS.map(async (api) => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": DESKTOP_UA,
    };
    const key = process.env.COBALT_API_KEY?.trim();
    if (key) headers.Authorization = `Api-Key ${key}`;
    try {
      const response = await fetch(api, {
        method: "POST",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
        body: JSON.stringify({
          url: canonicalUrl,
          videoQuality: "360",
          youtubeVideoCodec: "h264",
          filenameStyle: "basic",
        }),
      });
      const data = asRecord(await response.json().catch(() => null));
      if (!response.ok) {
        const code = asString(asRecord(data?.error)?.code) ?? "request failed";
        logEngineFailure(`youtube:cobalt:${new URL(api).hostname}`, new Error(code), response.status);
        throw new AppError("PROVIDER_UNAVAILABLE", `Cobalt answered ${response.status}: ${code}`);
      }
      const status = asString(data?.status);
      const url = asString(data?.url);
      if ((status === "tunnel" || status === "redirect") && url && /^https:\/\//.test(url)) {
        return {
          id: videoId,
          title: `YouTube video ${videoId}`,
          author: "YouTube",
          duration: 0,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          streams: { video: url, videoSd: null, audio: null },
        } satisfies TierHit;
      }
      const code = asString(asRecord(data?.error)?.code) ?? status ?? "no stream";
      logEngineFailure(`youtube:cobalt:${new URL(api).hostname}`, new Error(code), response.status);
      throw new AppError("PROVIDER_UNAVAILABLE", `Cobalt exposed no stream (${code}).`);
    } catch (error) {
      if (!(error instanceof AppError)) {
        logEngineFailure(`youtube:cobalt:${new URL(api).hostname}`, error);
      }
      throw error;
    }
  });
  try {
    return await Promise.any(attempts);
  } catch {
    throw new AppError("PROVIDER_UNAVAILABLE", "Every permitted Cobalt instance failed.");
  }
}

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
          signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
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
function logEngineFailure(engine: string, error: unknown, status?: number): void {
  const detail =
    error instanceof AppError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
  const line = `[youtube-resolve] engine=${engine}${status === undefined ? "" : ` status=${status}`} ${detail.replace(/\s+/g, " ").slice(0, 240)}`;
  // These lines are the Netlify function log's diagnosis trail: engine name,
  // real HTTP status, and the reason that racer lost.
  console.error(line);
}

function traced<T>(engine: string, task: Promise<T>): Promise<T> {
  return task.catch((error) => {
    logEngineFailure(engine, error);
    throw error;
  });
}

/** Hard wall-clock bound around a provider that manages its own polling. */
function withDeadline<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        const error = new AppError("PROVIDER_UNAVAILABLE", `${name} timed out after ${timeoutMs}ms.`);
        logEngineFailure(name, error);
        reject(error);
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
      error.code === "VIDEO_LIVE" ||
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
 * The failover race stops at the first tier that returns a muxed video, and
 * several of those tiers (ytdl-core, Invidious, Piped, the direct Invidious
 * loader) carry no audio-only ladder. Label music often wins through exactly
 * one of them, so the card arrived with a working MP4 and no MP3 button even
 * though the bridge resolves both streams for the same video in ~1 s.
 *
 * Ask the bridge for the audio handle only when the winner lacks one, and
 * only with wall clock that is still left — a missing MP3 must never turn a
 * good resolve into a failure.
 */
const AUDIO_ENRICH_MIN_BUDGET_MS = 2_200;
const AUDIO_ENRICH_MAX_MS = 6_000;

async function withBridgeAudio(
  hit: TierHit & { streams: YouTubeStreams },
  canonicalUrl: string,
  remainingMs: number,
): Promise<TierHit & { streams: YouTubeStreams }> {
  if (hit.streams.audio) return hit;
  if (bridgeEndpoints().length === 0) return hit;
  const budget = Math.min(remainingMs, AUDIO_ENRICH_MAX_MS);
  if (budget < AUDIO_ENRICH_MIN_BUDGET_MS) return hit;
  try {
    const bridge = await withDeadline(ytdlpExtract(canonicalUrl), budget, "youtube:ytdlp-audio");
    if (!bridge.audio) return hit;
    return {
      ...hit,
      streams: {
        ...hit.streams,
        audio: bridge.audio,
        audioFormat: "m4a",
        audioEncoded: bridge.mp3 ?? hit.streams.audioEncoded ?? null,
      },
    };
  } catch {
    // No MP3 button rather than a failed resolve.
    return hit;
  }
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
const RESOLVE_BUDGET_MS = 30_000;

/** Every mirror / player hop gets a bounded 8s external call on Netlify. */
const EXTERNAL_TIMEOUT_MS = 8_000;

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
  const [android, ...defined] = INNERTUBE_CLIENTS;
  // Failover order is explicit, not array order: the Apple and TV clients are
  // the ones that keep answering public videos when a datacenter IP is
  // challenged, and VISIONOS — useful as a last resort — is the most likely to
  // demand a login. A client missing from the priority list still runs, at the
  // end, so adding one to the table can never silently drop it.
  const FAILOVER_ORDER = [
    "youtube:innertube-tv-samsung",
    "youtube:innertube-android-testsuite",
    "youtube:innertube-android-vr",
    "youtube:innertube-android-legacy",
    "youtube:innertube-ios",
    "youtube:innertube-visionos",
    "youtube:innertube-web-embedded",
    "youtube:innertube-tv-embedded",
  ];
  const fallbacks = [
    ...FAILOVER_ORDER.map((name) => defined.find((client) => client.name === name)).filter(
      (client): client is InnertubeClient => Boolean(client),
    ),
    ...defined.filter((client) => !FAILOVER_ORDER.includes(client.name)),
  ];

  try {
    const primary = requireStreams(
      await traced(
        android.name,
        withDeadline(innertubePlayer(id, android), PRIMARY_BUDGET_MS, android.name),
      ),
    );
    return await withBridgeAudio(primary, canonicalUrl, RESOLVE_BUDGET_MS - (Date.now() - startedAt));
  } catch (error) {
    // A private / deleted / livestream answer is definitive — never retried.
    if (isDefinitiveVideoError(error)) throw error;
  }

  // What is left of the function budget. A blocked music video spends it in
  // the yt-dlp bridge, so the bridge gets the whole window instead of the
  // old 8 s inner deadline that the race always cut short anyway.
  const failoverBudget = Math.max(1_800, RESOLVE_BUDGET_MS - (Date.now() - startedAt));

  // Every external hop is bounded independently. The order below is the
  // preferred rescue order: permitted Cobalt → Piped → watch-page HTML →
  // Innertube spoofs → ytdl-core → yt-dlp bridge → Invidious. They race in
  // parallel, so a dead mirror can never delay the winner.
  const chains: Array<Promise<TierHit>> = [
    ...(COBALT_APIS.length > 0
      ? [
          traced(
            "youtube:cobalt",
            withDeadline(cobaltResolve(id, canonicalUrl), EXTERNAL_TIMEOUT_MS, "youtube:cobalt"),
          ),
        ]
      : []),
    ...PIPED_APIS.map((api) =>
      traced(
        `youtube:piped:${new URL(api).hostname}`,
        withDeadline(
          pipedStreams(id, api),
          EXTERNAL_TIMEOUT_MS,
          `youtube:piped:${new URL(api).hostname}`,
        ),
      ),
    ),
    traced(
      "youtube:watch-page",
      withDeadline(watchPageStreams(id), EXTERNAL_TIMEOUT_MS, "youtube:watch-page"),
    ),
    ...fallbacks.map((client) =>
      traced(
        client.name,
        withDeadline(innertubePlayer(id, client), EXTERNAL_TIMEOUT_MS, client.name),
      ),
    ),
    traced(
      "youtube:ytdl-core",
      withDeadline(ytdlCoreResolve(id, canonicalUrl), EXTERNAL_TIMEOUT_MS, "youtube:ytdl-core"),
    ),
    // The bridge has its own 22s extraction ceiling; the outer budget must
    // outwait it so a configured bridge is genuinely queried before giving up.
    traced(
      "youtube:ytdlp-android",
      withDeadline(ytdlpAndroidResolve(id, canonicalUrl), failoverBudget, "youtube:ytdlp-android"),
    ),
    ...INVIDIOUS_APIS.map((api) =>
      traced(
        `youtube:invidious:${new URL(api).hostname}`,
        withDeadline(
          invidiousStreams(id, api),
          EXTERNAL_TIMEOUT_MS,
          `youtube:invidious:${new URL(api).hostname}`,
        ),
      ),
    ),
    // Sits IN the race, not after it: a dead mirror probe must never add its
    // timeout to a resolve that already ran out of function budget.
    traced(
      "youtube:invidious-direct",
      withDeadline(invidiousDirectStream(id, canonicalUrl), EXTERNAL_TIMEOUT_MS, "youtube:invidious-direct"),
    ),
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
    // Before blaming the network, ask the watch page whether this is live
    // content: a running broadcast has no MP4 by definition, and a finished
    // live recording may still be HLS-only. Those are answers, not outages.
    const live = await detectLiveState(id);
    if (live === "live") {
      throw new AppError("VIDEO_LIVE", LIVE_NOW_MESSAGE, LIVE_NOW_HINT);
    }
    if (live === "archive") {
      throw new AppError("VIDEO_LIVE", LIVE_ARCHIVE_MESSAGE, LIVE_ARCHIVE_HINT);
    }
    // Every engine failed for a reason that is NOT the video (bot-checked
    // datacenter IP, mirror timeout). Surface one stable, user-safe message
    // instead of the last engine's internal timeout text.
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube is limiting downloads on this server network right now.",
      "Retry in a moment — the browser fallback also tries your own connection.",
    );
  }

  const resolved = requireStreams(hit);
  return withBridgeAudio(resolved, canonicalUrl, RESOLVE_BUDGET_MS - (Date.now() - startedAt));
}

export async function startYouTubeResolution(
  rawUrl: string,
  options: { fresh?: boolean } = {},
): Promise<ResolvedYouTubeStart> {
  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed) {
    if (isTruncatedYouTubeId(rawUrl)) throw truncatedYouTubeError();
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
    if (isTruncatedYouTubeId(rawUrl)) throw truncatedYouTubeError();
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
