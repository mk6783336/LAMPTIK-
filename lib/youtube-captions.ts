import { AppError } from "@/lib/errors";

/**
 * YouTube caption (subtitle) reading — no third-party transcription, no OCR.
 *
 * The resolver in `lib/youtube.ts` already POSTs Innertube's `/youtubei/v1/player`
 * with the ANDROID client to get streams; that same response also carries
 * `captions.playerCaptionsTracklistRenderer.captionTracks`. Measured on
 * 2026-11-13 (dQw4w9WgXcQ, from a residential IP): ANDROID and IOS answer 6
 * tracks each, while the WEB client answers `UNPLAYABLE — "The page needs to be
 * reloaded."` with zero tracks, so WEB is deliberately not used here.
 *
 * The signed `baseUrl` inside each track answers the timedtext document with a
 * 200 and `<?xml version="1.0"?><timedtext format="3"><body><p t="1360"
 * d="1680">[♪♪♪]</p>…` — milliseconds in `t`/`d`, so the parser below handles
 * that shape and the older `<text start dur>` shape, which is what a manual
 * track returns when the same URL is requested with `&fmt=srv1`.
 *
 * What this module cannot do: invent captions. A video without tracks returns
 * an empty list, and the page says so instead of promising a transcript.
 */

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}&prettyPrint=false`;
const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const PLAYER_TIMEOUT_MS = 7_000;
const CAPTION_TIMEOUT_MS = 9_000;
const VISITOR_TTL_MS = 30 * 60_000;

/**
 * Player clients tried in order. Measured from a residential IP on
 * 2026-11-13: ANDROID and IOS each return 6 tracks for dQw4w9WgXcQ, WEB
 * returns `UNPLAYABLE` and zero. From Vercel's datacenter IP the ANDROID call
 * alone answers `LOGIN_REQUIRED` — the same bot-check the stream resolver hits
 * — which is why every client also carries the session `visitorData` tokens the
 * resolver loads from the embed page, and why two more clients are tried here.
 */
const CLIENTS = [
  { name: "ANDROID", version: "20.10.38", ua: ANDROID_UA },
  { name: "IOS", version: "20.10.4", ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)" },
  { name: "ANDROID_VR", version: "1.60.19", ua: "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12; GB) gzip" },
  { name: "WEB_EMBEDDED_PLAYER", version: "1.20241126.01.00", ua: DESKTOP_UA },
  { name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", version: "2.0", ua: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version" },
  { name: "WEB", version: "2.20241126.01.00", ua: DESKTOP_UA },
] as const;

/** Timedtext hosts we accept after a caption track hands us its signed URL. */
const CAPTION_HOSTS = ["www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com"];

export type CaptionFormat = "srt" | "vtt" | "txt";

export interface CaptionTrack {
  /** BCP-47 code YouTube publishes, e.g. `en`, `pt-BR`, `ar`. */
  lang: string;
  /** Human label as YouTube shows it, e.g. `English (auto-generated)`. */
  label: string;
  /** `true` when YouTube's speech recognition produced the track. */
  auto: boolean;
}

export interface CaptionCue {
  /** Seconds from the start of the video. */
  start: number;
  /** Seconds; YouTube sometimes omits it, and then it is estimated. */
  duration: number;
  text: string;
}

interface InternalTrack extends CaptionTrack {
  baseUrl: string;
}

interface PlayerPayload {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: { videoId?: string; title?: string; author?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl?: string;
        languageCode?: string;
        kind?: string;
        name?: { simpleText?: string; runs?: Array<{ text?: string }> };
      }>;
    };
  };
}

/**
 * Minimal YouTube URL reader for this route only. `parseYouTubeUrl` lives in
 * `lib/youtube.ts`, which imports `@distube/ytdl-core` at module scope — pulling
 * that whole resolution engine into the captions function for a regex is not a
 * trade worth making. Accepts watch, youtu.be, shorts, live and embed URLs.
 */
export function parseVideoId(raw: string): string | null {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const idPattern = /^[A-Za-z0-9_-]{11}$/;
  const idFrom = (candidate: string | null | undefined) => {
    const id = candidate?.trim();
    return id && idPattern.test(id) ? id : null;
  };

  if (host === "youtu.be") return idFrom(url.pathname.split("/")[1]);

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = idFrom(url.searchParams.get("v"));
    if (v) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed" || parts[0] === "v") {
      return idFrom(parts[1]);
    }
  }

  return null;
}

interface VisitorCache {
  value: string | null;
  expiresAt: number;
}

let visitorCache: VisitorCache | null = null;
let visitorInFlight: Promise<string | null> | null = null;

/** Same `ytcfg.visitorData` the stream resolver reads, from the embed page. */
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
  for (const page of [
    `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
    "https://www.youtube.com/",
  ]) {
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
        visitorCache = { value: token, expiresAt: Date.now() + VISITOR_TTL_MS };
        return token;
      }
    } catch {
      // A missing session token is a soft downgrade, not a failure.
    }
  }
  return null;
}

function visitorToken(videoId: string): Promise<string | null> {
  if (visitorCache && visitorCache.expiresAt > Date.now()) return Promise.resolve(visitorCache.value);
  if (!visitorInFlight) {
    visitorInFlight = loadVisitorData(videoId).finally(() => {
      visitorInFlight = null;
    });
  }
  return visitorInFlight;
}

/**
 * Per-client verdicts, exposed only for a `?debug=1` request. A datacenter IP
 * gets `LOGIN_REQUIRED` on one client and something else on another, and the
 * single aggregate message cannot tell which — this can.
 */
export async function debugCaptionClients(
  videoId: string,
): Promise<Array<{ client: string; status: string; reason: string; tracks: number }>> {
  const visitor = await visitorToken(videoId).catch(() => null);
  const out: Array<{ client: string; status: string; reason: string; tracks: number }> = [];

  for (const client of CLIENTS) {
    const payload = await fetchPlayerOnce(videoId, client, visitor);
    out.push({
      client: client.name,
      status: payload?.playabilityStatus?.status ?? "NO_RESPONSE",
      reason: (payload?.playabilityStatus?.reason ?? "").slice(0, 90),
      tracks: payload ? tracksOf(payload).length : 0,
    });
  }

  return out;
}

async function fetchPlayerOnce(
  videoId: string,
  client: (typeof CLIENTS)[number],
  visitor: string | null,
): Promise<PlayerPayload | null> {
  const response = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
      "User-Agent": client.ua,
      ...(visitor ? { "X-Goog-Visitor-Id": visitor } : {}),
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: client.name, clientVersion: client.version, hl: "en", gl: "US" },
        ...(visitor ? { visitorData: visitor } : {}),
      },
    }),
    signal: AbortSignal.timeout(PLAYER_TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);

  if (!response || !response.ok) {
    await response?.body?.cancel().catch(() => undefined);
    return null;
  }

  return (await response.json().catch(() => null)) as PlayerPayload | null;
}

function tracksOf(payload: PlayerPayload) {
  return payload.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

/**
 * The first client that answers `OK` with caption tracks wins. A video that
 * genuinely has no captions answers `OK` with an empty list, so that verdict is
 * only trusted once every client has been asked — otherwise a bot-checked
 * client would be reported as "no subtitles" and the page would blame the
 * creator for a YouTube refusal.
 */
async function fetchPlayer(videoId: string): Promise<PlayerPayload> {
  const visitor = await visitorToken(videoId).catch(() => null);
  let okPayload: PlayerPayload | null = null;
  let lastReason = "";
  let lastStatus = "";
  let reachable = false;

  for (const client of CLIENTS) {
    const payload = await fetchPlayerOnce(videoId, client, visitor);
    if (!payload) continue;
    reachable = true;

    const status = payload.playabilityStatus?.status ?? "";
    const tracks = tracksOf(payload);
    if (status === "OK" && tracks.length > 0) return payload;
    if (status === "OK" && !okPayload) okPayload = payload;
    lastStatus = status || lastStatus;
    lastReason = payload.playabilityStatus?.reason ?? lastReason;
  }

  // OK with no tracks is a real answer: the video has no captions at all.
  if (okPayload) return okPayload;

  if (!reachable) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube did not answer the caption request.",
      "Try again in a moment — the player response is usually back within seconds.",
    );
  }

  if (lastStatus === "ERROR" || lastStatus === "UNPLAYABLE") {
    throw new AppError(
      "VIDEO_PRIVATE",
      "YouTube will not serve this video to the server.",
      "Private, members-only and age-restricted videos have no readable captions here.",
    );
  }

  throw new AppError(
    "PROVIDER_UNAVAILABLE",
    "YouTube asked the server to verify itself before answering for this video.",
    `${lastReason ? `${lastReason} ` : ""}Retrying usually clears it; the captions themselves are unchanged.`,
  );
}

function sortTracks(tracks: InternalTrack[]): InternalTrack[] {
  // Manual tracks beat auto-generated ones for the same language, and English
  // leads the list because that is the transcript most visitors are after.
  const seen = new Set<string>();
  const ordered = [...tracks].sort((a, b) => {
    if (a.lang === "en" && b.lang !== "en") return -1;
    if (b.lang === "en" && a.lang !== "en") return 1;
    if (a.auto !== b.auto) return a.auto ? 1 : -1;
    return a.lang.localeCompare(b.lang);
  });

  return ordered.filter((track) => {
    const key = `${track.lang}:${track.auto ? "asr" : "manual"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface ResolvedCaptions {
  videoId: string;
  title: string;
  author: string;
  tracks: InternalTrack[];
}

async function resolveCaptionTracks(rawUrl: string): Promise<ResolvedCaptions> {
  const videoId = parseVideoId(rawUrl);
  if (!videoId) {
    throw new AppError(
      "INVALID_URL",
      "That does not look like a YouTube video link.",
      "Paste a youtube.com/watch?v=…, youtu.be/… or /shorts/… link.",
    );
  }

  const player = await fetchPlayer(videoId);

  const raw = tracksOf(player);
  const tracks: InternalTrack[] = [];

  for (const track of raw) {
    const baseUrl = typeof track.baseUrl === "string" ? track.baseUrl : "";
    const lang = typeof track.languageCode === "string" ? track.languageCode : "";
    if (!baseUrl || !lang) continue;

    const label =
      track.name?.simpleText ||
      track.name?.runs?.map((run) => run.text ?? "").join("") ||
      lang.toUpperCase();

    tracks.push({ lang, label, auto: track.kind === "asr", baseUrl });
  }

  return {
    videoId,
    title: player.videoDetails?.title ?? "Untitled video",
    author: player.videoDetails?.author ?? "",
    tracks: sortTracks(tracks),
  };
}

/** Languages this video actually has, manual first — safe to show in the UI. */
export async function listCaptionTracks(rawUrl: string): Promise<{
  videoId: string;
  title: string;
  author: string;
  tracks: CaptionTrack[];
}> {
  const resolved = await resolveCaptionTracks(rawUrl);
  return {
    videoId: resolved.videoId,
    title: resolved.title,
    author: resolved.author,
    tracks: resolved.tracks.map(({ lang, label, auto }) => ({ lang, label, auto })),
  };
}

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
    };
    return named[entity.toLowerCase()] ?? match;
  });
}

function cleanCueText(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Both timedtext shapes in one pass: srv3 (`t`/`d`, milliseconds) and srv1
 * (`start`/`dur`, seconds). Text can carry `<s>` spans and entities, which are
 * stripped here so an SRT never ships markup into somebody's editor.
 */
export function parseCaptionXml(xml: string): CaptionCue[] {
  const pattern = /<(?:p|text)\b([^>]*)>([\s\S]*?)<\/(?:p|text)>/g;
  const cues: CaptionCue[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const attrs = match[1];
    const text = cleanCueText(match[2]);
    if (!text) continue;

    const msStart = /(?:^|\s)t="([\d.]+)"/.exec(attrs);
    const secondsStart = /(?:^|\s)start="([\d.]+)"/.exec(attrs);
    const start = msStart
      ? Number(msStart[1]) / 1000
      : secondsStart
        ? Number(secondsStart[1])
        : null;
    if (start === null || !Number.isFinite(start)) continue;

    const msDuration = /(?:^|\s)d="([\d.]+)"/.exec(attrs);
    const secondsDuration = /(?:^|\s)dur="([\d.]+)"/.exec(attrs);
    const duration = msDuration
      ? Number(msDuration[1]) / 1000
      : secondsDuration
        ? Number(secondsDuration[1])
        : 2;

    cues.push({ start, duration: Number.isFinite(duration) && duration > 0 ? duration : 2, text });
  }

  // Auto-generated tracks repeat the same line while it stays on screen; keep
  // the first occurrence so an SRT reads like speech, not like a stutter.
  return cues.filter((cue, index) => {
    const previous = cues[index - 1];
    return !previous || cue.text !== previous.text;
  });
}

function isAllowedCaptionUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return CAPTION_HOSTS.includes(host) || host.endsWith(".googlevideo.com");
  } catch {
    return false;
  }
}

export async function readCaptionCues(
  rawUrl: string,
  lang?: string,
): Promise<{ videoId: string; title: string; author: string; track: CaptionTrack; cues: CaptionCue[] }> {
  const resolved = await resolveCaptionTracks(rawUrl);

  if (resolved.tracks.length === 0) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "This video has no captions, so there is no transcript to save.",
      "Captions are added by the uploader or auto-generated by YouTube. Neither exists here, and nothing on this page invents one.",
    );
  }

  const wanted = (lang ?? "").trim().toLowerCase();
  const manual = resolved.tracks.find((t) => !t.auto && t.lang.toLowerCase() === wanted);
  const auto = resolved.tracks.find((t) => t.auto && t.lang.toLowerCase() === wanted);
  const track = manual ?? auto ?? resolved.tracks[0];

  if (!isAllowedCaptionUrl(track.baseUrl)) {
    throw new AppError(
      "UPSTREAM_ERROR",
      "YouTube returned a caption URL this page refuses to fetch.",
      "Retrying usually returns a normal youtube.com caption URL.",
    );
  }

  const separator = track.baseUrl.includes("?") ? "&" : "?";
  const response = await fetch(`${track.baseUrl}${separator}fmt=srv3`, {
    headers: { "User-Agent": ANDROID_UA, "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(CAPTION_TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "The caption download timed out.",
      "Caption URLs from YouTube expire after a few hours; this one was fetched fresh, so a retry is worth it.",
    );
  });

  if (!response.ok) {
    throw new AppError(
      "UPSTREAM_ERROR",
      `YouTube answered ${response.status} for the caption file.`,
      "The video may have had its captions removed since it was resolved.",
    );
  }

  const xml = await response.text();
  const cues = parseCaptionXml(xml);

  if (cues.length === 0) {
    throw new AppError(
      "UPSTREAM_ERROR",
      "YouTube returned an empty caption file.",
      "This happens when a track is listed but carries no text; another language may still work.",
    );
  }

  return {
    videoId: resolved.videoId,
    title: resolved.title,
    author: resolved.author,
    track: { lang: track.lang, label: track.label, auto: track.auto },
    cues,
  };
}

function timecode(seconds: number, separator: "," | "."): string {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const whole = Math.floor(total % 60);
  const millis = Math.round((total - Math.floor(total)) * 1000);
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(whole)}${separator}${pad(millis, 3)}`;
}

export function toSrt(cues: CaptionCue[]): string {
  return cues
    .map((cue, index) => {
      const start = timecode(cue.start, ",");
      const end = timecode(cue.start + cue.duration, ",");
      return `${index + 1}\n${start} --> ${end}\n${cue.text}`;
    })
    .join("\n\n");
}

export function toVtt(cues: CaptionCue[]): string {
  const body = cues
    .map((cue) => {
      const start = timecode(cue.start, ".");
      const end = timecode(cue.start + cue.duration, ".");
      return `${start} --> ${end}\n${cue.text}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${body}`;
}

/** Plain text: one spoken line per row, timestamps dropped. */
export function toTxt(cues: CaptionCue[]): string {
  return cues.map((cue) => cue.text).join("\n");
}

export function formatCaptions(cues: CaptionCue[], format: CaptionFormat): string {
  if (format === "vtt") return toVtt(cues);
  if (format === "txt") return toTxt(cues);
  return toSrt(cues);
}
