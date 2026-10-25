import type { ApiResponse, MediaPayload, PlatformType, ResolveResult } from "./types";

/**
 * The web app is the whole backend: same resolvers, same CDN allowlists, same
 * rate limits. Nothing is duplicated in the app, so a fix shipped to
 * lamptik.online reaches every installed copy instantly.
 */
export const API_ORIGIN = (
  process.env.EXPO_PUBLIC_API_ORIGIN ?? "https://www.lamptik.online"
).replace(/\/+$/, "");

/** Extraction can legitimately take 30s+ when the bridge has to be woken. */
const RESOLVE_TIMEOUT_MS = 45_000;

export class ResolveError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "ResolveError";
    this.code = code;
    this.hint = hint;
  }
}

/** Pull the first http(s) URL out of arbitrary shared text. */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match?.[0]) return null;
  return match[0].replace(/[),.;]+$/, "");
}

const HOST_RULES: Array<{ platform: PlatformType; pattern: RegExp }> = [
  { platform: "youtube", pattern: /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)$/i },
  { platform: "tiktok", pattern: /^(?:www\.|m\.)?tiktok\.com$/i },
  { platform: "instagram", pattern: /^(?:www\.)?instagram\.com$/i },
  { platform: "facebook", pattern: /^(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch)$/i },
];

/**
 * Which resolver a link belongs to. YouTube has its own endpoint because its
 * extraction waterfall is different; everything else uses /api/fetch.
 */
export function detectPlatform(rawUrl: string): PlatformType | null {
  const url = extractUrl(rawUrl) ?? rawUrl.trim();
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  for (const rule of HOST_RULES) {
    if (rule.pattern.test(host)) return rule.platform;
  }
  return null;
}

export function isSupportedUrl(value: string): boolean {
  return detectPlatform(value) !== null;
}

/**
 * `videoHd` / `audioMp3` are same-origin proxy paths (`/api/download?…`) while
 * `videoDirect` / `audioDirect` are absolute CDN URLs. Everything the app hands
 * to the downloader has to be absolute.
 */
export function absolutise(link: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  return `${API_ORIGIN}${link.startsWith("/") ? "" : "/"}${link}`;
}

function endpointFor(platform: PlatformType): string {
  return platform === "youtube" ? `${API_ORIGIN}/api/youtube` : `${API_ORIGIN}/api/fetch`;
}

/**
 * Resolve a link to downloadable streams.
 *
 * The server answers provider outages with HTTP 200 + `{ ok: false }` on
 * purpose (a 5xx would be counted as a crashed function), so `response.ok`
 * alone is never enough — the payload's `ok` flag is the real verdict.
 */
export async function resolveUrl(rawUrl: string): Promise<ResolveResult> {
  const url = extractUrl(rawUrl) ?? rawUrl.trim();
  const platform = detectPlatform(url);
  if (!platform) {
    throw new ResolveError(
      "UNSUPPORTED_URL",
      "That link is not from TikTok, YouTube, Instagram or Facebook.",
      "Copy a video link from one of those apps and try again.",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpointFor(platform), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new ResolveError(
      aborted ? "TIMEOUT" : "NETWORK",
      aborted
        ? "The resolver took too long to answer."
        : "Could not reach lamptik.online.",
      "Check your connection and tap Retry.",
    );
  } finally {
    clearTimeout(timer);
  }

  let payload: ApiResponse;
  try {
    payload = (await response.json()) as ApiResponse;
  } catch {
    throw new ResolveError(
      "BAD_RESPONSE",
      "The resolver returned an unreadable answer.",
      "Please retry in a moment.",
    );
  }

  if (!payload || payload.ok !== true) {
    const failure = payload as { error?: { code?: string; message?: string; hint?: string } };
    throw new ResolveError(
      failure.error?.code ?? "PROVIDER_UNAVAILABLE",
      failure.error?.message ?? "That video could not be resolved.",
      failure.error?.hint,
    );
  }

  return { media: payload.media as MediaPayload, cached: payload.cached === true };
}

/** Choose the stream for a quality, preferring the same-origin proxy. */
export function streamFor(media: MediaPayload, quality: "hd" | "sd" | "audio"): string | null {
  if (quality === "audio") return absolutise(media.audioMp3) ?? absolutise(media.audioDirect);
  if (quality === "hd") return absolutise(media.videoHd) ?? absolutise(media.videoDirect);
  return absolutise(media.videoSd) ?? absolutise(media.videoHd) ?? absolutise(media.videoDirect);
}

export function qualityAvailable(media: MediaPayload, quality: "hd" | "sd" | "audio"): boolean {
  return streamFor(media, quality) !== null;
}
