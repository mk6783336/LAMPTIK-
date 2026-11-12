import { isPrivateHostname } from "@/lib/url-guard";

/**
 * Only platform-owned media CDNs may be streamed through the download proxy.
 * This keeps the route from becoming an open SSRF / proxy endpoint.
 * TikTok CDNs + Instagram (`*.cdninstagram.com`) + Facebook (`*.fbcdn.net`,
 * `*.xx.fbcdn.net`, `*.fbsbx.com`).
 */
const ALLOWED_HOST_SUFFIXES = [
  // TikTok
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokcdn-eu.com",
  "tiktokcdn-asia.com",
  "tiktokv.com",
  "tiktokv.us",
  "tikwm.com",
  "byteoversea.com",
  "ibytedtos.com",
  // TikTok page-level play endpoints (`/aweme/v1/play/?video_id=…`), which
  // 302 to a signed CDN URL that is checked again on the next hop.
  "tiktok.com",
  // Instagram
  "cdninstagram.com",
  "instagram.com",
  // Facebook — including its rotating regional video edges
  // (e.g. video.fisb9-1.fna.fbcdn.net).
  "fna.fbcdn.net",
  "fbcdn.net",
  "fbsbx.com",
  "facebook.com",
  // X / Twitter — `video.twimg.com` MP4 renditions and `pbs.twimg.com`
  // posters. Both are the platform's own CDNs, so the proxy may stream them
  // exactly like the other four platforms' media hosts.
  "twimg.com",
  // YouTube — googlevideo media shards + Piped/Invidious proxied mirrors.
  "googlevideo.com",
  "youtube.com",
  "youtu.be",
  "ytimg.com",
  "kavin.rocks",
  "tokhmi.xyz",
  "adminforge.de",
  "reallyaweso.me",
  "tux.pizza",
] as const;

export function isAllowedMediaUrl(raw: string): boolean {
  if (!raw || raw.length > 4_096) return false;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    // Defense in depth: a CDN hostname resolving into private space (or a
    // literal private IP in the URL) must never be proxied.
    if (isPrivateHostname(url.hostname)) return false;

    const hostname = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

/** Safe ASCII filename plus RFC 5987 UTF-8 fallback. */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Filename fragment sanitizer — strips CR/LF/quotes/separators so a hostile
 * `id`/`platform`/`author` query value can never inject response headers.
 */
export function safeFilenamePart(value: string | null, fallback: string): string {
  const cleaned = (value ?? "")
    .replace(/[^a-zA-Z0-9._@-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 48);
  return cleaned || fallback;
}

/**
 * Title-based filename stem — the video's own name in the Downloads tray.
 *
 * Every file used to arrive as `lamptik-<platform>-<id>.mp4`, which tells the
 * person who just saved a clip nothing about which clip it was; a phone
 * Downloads folder full of them is unusable. The resolver already knows the
 * title, so callers pass it and this turns it into a safe stem.
 *
 * Unicode is kept: `contentDisposition` emits the RFC 5987 `filename*` half
 * (percent-encoded UTF-8) next to a flattened ASCII `filename`, so a Hindi,
 * Arabic or Spanish title survives in the browsers that matter without ever
 * putting a non-ASCII byte in the plain header. What IS removed is everything
 * that can break a header, a path or a phone's filesystem: control characters,
 * quotes, `/ \ : * ? " < > |`, and any run of separators. The result is capped
 * at 80 code points so a 300-character TikTok caption cannot produce a filename
 * that Windows truncates into a different name than the browser was told.
 */
export function safeTitlePart(value: string | null): string {
  if (!value) return "";
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\\/:*?"<>|#]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return Array.from(cleaned).slice(0, 80).join("").replace(/[-.]+$/, "");
}

const SAFE_PLATFORMS = ["tiktok", "instagram", "facebook", "youtube", "twitter"] as const;
export type DownloadPlatform = (typeof SAFE_PLATFORMS)[number];

/** Whitelist-validate the `platform` filename segment (default: tiktok). */
export function safePlatform(value: string | null): DownloadPlatform {
  return SAFE_PLATFORMS.find((p) => p === value) ?? "tiktok";
}
