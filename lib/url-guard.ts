import { AppError } from "@/lib/errors";

/**
 * Unified platform identifier for the multi-platform resolver.
 */
export type PlatformType = "tiktok" | "instagram" | "facebook" | "youtube";

/** Host suffixes a user-submitted link may live on (dot-boundary matched). */
const INPUT_HOST_SUFFIXES = [
  "tiktok.com",
  "instagram.com",
  "instagr.am",
  "facebook.com",
  "fb.watch",
  "fb.com",
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
] as const;

const MAX_URL_LENGTH = 2_048;

/** Dot-boundary hostname match: `host === suffix` or `host.endsWith("." + suffix)`. */
export function hostMatches(hostname: string, suffix: string): boolean {
  const host = hostname.toLowerCase();
  const base = suffix.toLowerCase();
  return host === base || host.endsWith(`.${base}`);
}

/**
 * Block private / loopback / link-local targets — the SSRF core. Checks both
 * plain literals (`127.0.0.1`, `10.x`, `192.168.x`, `169.254.x`, `::1`,
 * `localhost`) and bracketed IPv6.
 */
export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0.0.0.0" || host === "::") return true;

  // IPv4 literals (also covers decimal/hex tricks after URL normalization).
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }

  // IPv6 unique-local / link-local.
  if (/^f[cd]/.test(host) || /^fe80:/.test(host)) return true;

  return false;
}

/** Which supported platform a URL belongs to, or null. */
export function detectPlatform(input: string): PlatformType | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (INPUT_HOST_SUFFIXES.some((suffix) => hostMatches(host, suffix))) {
    if (hostMatches(host, "tiktok.com")) return "tiktok";
    if (hostMatches(host, "instagram.com") || hostMatches(host, "instagr.am")) return "instagram";
    if (
      hostMatches(host, "youtube.com") ||
      hostMatches(host, "youtu.be") ||
      hostMatches(host, "youtube-nocookie.com")
    ) {
      return "youtube";
    }
    return "facebook";
  }
  return null;
}

/**
 * Validate a user-submitted URL before any network work:
 *  - length < 2048
 *  - http is upgraded to https (only https ever leaves the server)
 *  - private/loopback hosts are rejected outright (SSRF)
 *  - hostname must match the platform input allowlist
 * Throws INVALID_URL / UNSUPPORTED_URL AppErrors with actionable messages.
 */
export function assertInputUrl(raw: string): { url: URL; platform: PlatformType } {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new AppError("INVALID_URL", "Paste a video link first.");
  }
  const input = raw.trim();
  if (input.length > MAX_URL_LENGTH) {
    throw new AppError("INVALID_URL", "That link is too long to be a valid video URL.");
  }

  let url: URL;
  try {
    url = new URL(input.startsWith("http://") ? input.replace(/^http:\/\//i, "https://") : input);
  } catch {
    throw new AppError(
      "INVALID_URL",
      "That doesn't look like a valid URL.",
      "Example: https://www.instagram.com/reel/ABC123/ or https://fb.watch/xyz",
    );
  }

  if (url.protocol !== "https:") {
    throw new AppError("INVALID_URL", "Only https links are accepted.");
  }
  if (url.username || url.password) {
    throw new AppError("INVALID_URL", "That URL contains embedded credentials.");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new AppError("INVALID_URL", "That host isn't allowed.");
  }

  const platform = detectPlatform(url.toString());
  if (!platform) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "Only TikTok, Instagram, Facebook, and YouTube links are supported.",
      "Try a tiktok.com, instagram.com/reel, facebook.com, or youtube.com video link.",
    );
  }

  return { url, platform };
}
