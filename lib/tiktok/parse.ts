const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "www.vm.tiktok.com",
  "vt.tiktok.com",
  "www.vt.tiktok.com",
]);

const SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com", "www.vm.tiktok.com", "www.vt.tiktok.com"]);

const URL_IN_TEXT =
  /(?:https?:\/\/)?(?:www\.|m\.|vm\.|vt\.)?tiktok\.com\/[^\s"'<>]+/i;

export interface ParsedTikTokUrl {
  /** Cleaned URL that was supplied by the user. */
  input: string;
  /** Canonical desktop URL when a video id is known, otherwise the input URL. */
  url: string;
  videoId: string | null;
  username: string | null;
  isShort: boolean;
  isPhoto: boolean;
}

/** Pull the first TikTok URL out of arbitrary pasted text (share sheets add copy). */
export function extractTikTokUrl(text: string): string | null {
  const match = text.match(URL_IN_TEXT);
  if (!match) return null;

  let candidate = match[0].replace(/[),.;!?]+$/, "");
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  return candidate;
}

export function parseTikTokUrl(raw: string): ParsedTikTokUrl | null {
  if (typeof raw !== "string") return null;
  const input = raw.trim();
  if (!input || input.length > 2_048) return null;

  const candidate = extractTikTokUrl(input);
  if (!candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const hostname = parsed.hostname.toLowerCase();
  if (!TIKTOK_HOSTS.has(hostname)) return null;

  const path = parsed.pathname.replace(/\/+$/, "");
  const isShort = SHORT_HOSTS.has(hostname) || /^\/t\/[^/]+/i.test(path);
  const videoMatch = path.match(/\/(?:@[^/]+\/)?(?:video|v)\/(\d{6,})/i);
  const photoMatch = path.match(/\/(?:@[^/]+\/)?photo\/(\d{6,})/i);
  const userMatch = path.match(/^\/@([^/]+)/);

  const videoId = videoMatch?.[1] ?? null;
  const username = userMatch ? decodeURIComponent(userMatch[1]) : null;

  // A non-short link must point at a specific video. Search pages, profiles,
  // and the "for you" feed are not downloadable.
  if (!videoId && !isShort) return null;

  const normalizedOrigin = "https://www.tiktok.com";
  const url =
    videoId && username
      ? `${normalizedOrigin}/@${encodeURIComponent(username)}/video/${videoId}`
      : videoId
        ? `${normalizedOrigin}/video/${videoId}`
        : candidate;

  return {
    input,
    url,
    videoId,
    username,
    isShort,
    isPhoto: Boolean(photoMatch),
  };
}
