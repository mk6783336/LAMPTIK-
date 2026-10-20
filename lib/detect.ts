import type { Platform } from "@/lib/platforms";
import { parseTikTokUrl } from "@/lib/tiktok/parse";

/**
 * Client-side link detection — the front door of the multi-platform UX.
 *
 * Detects TikTok, Instagram, and Facebook video links in arbitrary pasted
 * text (share sheets append captions) and reports which platform owns the
 * link, so the UI can greet it with the right badge and accent instead of an
 * error — even when the user is on another platform's page.
 *
 * Shapes mirror the server parsers (lib/tiktok/parse.ts, lib/instagram.ts
 * parseInstagramUrl, lib/facebook.ts parseFacebookUrl): the client must
 * accept exactly what the resolver can actually resolve.
 *
 * Pure module — no server imports; ships to the browser.
 */
export interface DetectedLink {
  platform: Platform;
  /** Normalized URL ready to POST to /api/fetch (https:// scheme ensured). */
  url: string;
  /** Short/redirect link (vt/vm, instagr.am, fb.watch, /share/v/). */
  isShort: boolean;
  /** TikTok photo slideshows — no video stream exists. */
  isPhoto: boolean;
  videoId: string | null;
}

/** Loose URL scanner: optional scheme, any host, until whitespace/quote. */
const URL_CANDIDATE =
  /(?:https?:\/\/)?(?:www\.|m\.|mbasic\.|vm\.|vt\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/[^\s"'<>]*)?/gi;

/** Trailing punctuation share sheets love to append. */
const TRAILING_NOISE = /[)\]}>,.;!?…]+$/;

/** Dot-boundary host match (mirror of url-guard's, without server imports). */
function hostIs(hostname: string, base: string): boolean {
  const host = hostname.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}

/** Instagram video post shapes: /reel/, /reels/, /p/, /tv/ (+ instagr.am). */
const INSTAGRAM_PATH = /^\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,})/i;
/** Mobile-app share links: /share/reel/<code>, /share/reels/<code>, /share/p/<code>. */
const INSTAGRAM_SHARE_PATH = /^\/share\/(?:reels?|p)\/([A-Za-z0-9_-]{5,})/i;

function classify(rawCandidate: string): DetectedLink | null {
  let candidate = rawCandidate.replace(TRAILING_NOISE, "");
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  // TikTok — reuse the hardened parser (short links, ids, photo posts).
  const tiktok = parseTikTokUrl(candidate);
  if (tiktok) {
    return {
      platform: "tiktok",
      url: candidate,
      isShort: tiktok.isShort,
      isPhoto: tiktok.isPhoto,
      videoId: tiktok.videoId,
    };
  }

  // Instagram — same path shapes the server extractor accepts, plus the
  // mobile-app /share/ links (always short links needing resolution).
  if (hostIs(host, "instagram.com") || hostIs(host, "instagr.am")) {
    if (INSTAGRAM_PATH.test(url.pathname)) {
      return {
        platform: "instagram",
        url: candidate,
        isShort: hostIs(host, "instagr.am"),
        isPhoto: false,
        videoId: null,
      };
    }
    if (INSTAGRAM_SHARE_PATH.test(url.pathname)) {
      return {
        platform: "instagram",
        url: candidate,
        isShort: true,
        isPhoto: false,
        videoId: null,
      };
    }
    // Profile / explore / stories links are not downloadable video posts.
    return null;
  }

  // Facebook — every video/share shape the resolver resolves (desktop +
  // mobile-app links). /share/r/ is the standard link copied from the
  // Facebook mobile app and must never be rejected here.
  if (hostIs(host, "facebook.com") || hostIs(host, "fb.watch") || hostIs(host, "fb.com")) {
    const path = url.pathname;
    // fb.watch/<slug> carries no path markers — the slug IS the video
    // reference, so every non-root fb.watch URL is a video short link.
    const isFbWatchLink = hostIs(host, "fb.watch") && path.replace(/\/+$/, "").length > 1;
    const isVideo =
      isFbWatchLink ||
      /\/videos\//i.test(path) ||
      /\/reels?\//i.test(path) ||
      /^\/v\//i.test(path) ||
      /\/share\/[vr]\//i.test(path) ||
      /^\/share\/[^/]{3,}/i.test(path) ||
      /\/watch\//i.test(path) ||
      /\/video\.php/i.test(path) ||
      /\/story\.php/i.test(path) ||
      /\/permalink\.php/i.test(path) ||
      url.searchParams.has("v") ||
      url.searchParams.has("story_fbid");

    if (isVideo) {
      // Mirror the server parser: a link is short when it carries no numeric
      // id (path or query) — /share/r/<slug>, fb.watch, video.php without
      // ?v=. Links with an id (watch?v=<id>, /reel/<id>) resolve directly.
      const hasNumericId = /\d{5,}/.test(path) || /\d{5,}/.test(url.search);
      return {
        platform: "facebook",
        url: candidate,
        isShort: hostIs(host, "fb.watch") || /\/share\//i.test(path) || !hasNumericId,
        isPhoto: false,
        videoId: null,
      };
    }
    return null;
  }

  return null;
}

/**
 * Find the first supported video link in arbitrary text.
 * Returns null when nothing downloadable is present — the caller decides
 * the error copy (never "wrong platform": all three are accepted everywhere).
 */
export function detectLink(text: string): DetectedLink | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 2_048) return null;

  const candidates = trimmed.match(URL_CANDIDATE) ?? [];
  for (const candidate of candidates) {
    const hit = classify(candidate);
    if (hit) return hit;
  }

  // The whole string may itself be a URL the scanner split oddly.
  return classify(trimmed);
}

/**
 * Best text to put in the input field after a clipboard paste: the detected
 * video link, else the first URL-ish candidate, else the raw trimmed text.
 */
export function extractLinkText(text: string): string {
  const detected = detectLink(text);
  if (detected) return detected.url;

  const candidate = text.trim().match(URL_CANDIDATE)?.[0];
  if (candidate) return candidate.replace(TRAILING_NOISE, "");
  return text.trim();
}
