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
  // Facebook
  "fbcdn.net",
  "fbsbx.com",
  "facebook.com",
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

const SAFE_PLATFORMS = ["tiktok", "instagram", "facebook"] as const;
export type DownloadPlatform = (typeof SAFE_PLATFORMS)[number];

/** Whitelist-validate the `platform` filename segment (default: tiktok). */
export function safePlatform(value: string | null): DownloadPlatform {
  return SAFE_PLATFORMS.find((p) => p === value) ?? "tiktok";
}
