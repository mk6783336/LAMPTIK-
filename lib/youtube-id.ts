/**
 * YouTube id helpers shared by the browser detector and the server parser.
 *
 * Keeping the host/path rules in one pure module matters: the client uses the
 * same shapes to catch a truncated share link before a request is made, and the
 * server uses them to return the same explanation if a request bypasses the UI.
 */

/** A complete YouTube video id: exactly 11 base64url characters. */
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const YOUTUBE_TRUNCATED_ID_MESSAGE =
  "YouTube links must contain an 11-character video ID. Please re-copy the full link via Share -> Copy link.";

export const YOUTUBE_TRUNCATED_ID_HINT =
  "Open the video in YouTube, tap Share, then Copy link and paste the full link.";

export interface YouTubeIdCandidate {
  /** The raw id-shaped path/query value; callers validate its length. */
  id: string | null;
  hostMatched: boolean;
}

function hostIs(hostname: string, base: string): boolean {
  const host = hostname.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}

/** True for every host the resolver accepts (including music/nocookie). */
export function isYouTubeHost(hostname: string): boolean {
  return (
    hostIs(hostname, "youtube.com") ||
    hostIs(hostname, "youtu.be") ||
    hostIs(hostname, "youtube-nocookie.com")
  );
}

/**
 * Read the id-shaped value from a YouTube URL without deciding whether it is
 * complete. `null` means the string is not a YouTube URL at all; a returned
 * candidate with `id: null` is a YouTube URL with no id (e.g. the homepage).
 */
export function readYouTubeId(raw: string): YouTubeIdCandidate | null {
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
  if (!isYouTubeHost(host)) return null;

  if (hostIs(host, "youtu.be")) {
    return {
      id: url.pathname.split("/").filter(Boolean)[0] ?? null,
      hostMatched: true,
    };
  }

  const param = url.searchParams.get("v");
  if (param) return { id: param, hostMatched: true };

  const segments = url.pathname.split("/").filter(Boolean);
  const head = segments[0]?.toLowerCase();
  if ((head === "shorts" || head === "embed" || head === "live" || head === "v") && segments[1]) {
    return { id: segments[1], hostMatched: true };
  }
  return { id: null, hostMatched: true };
}

/** A shorter-than-11 id: the paste is a YouTube link, but it is incomplete. */
export function isTruncatedYouTubeId(raw: string): boolean {
  const candidate = readYouTubeId(raw);
  const id = candidate?.id?.trim();
  if (!candidate?.hostMatched || !id) return false;
  return /^[A-Za-z0-9_-]+$/.test(id) && id.length < 11;
}
