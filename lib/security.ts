import { AppError } from "@/lib/errors";
import { isAllowedMediaUrl } from "@/lib/tiktok/allowlist";
import { isPrivateHostname } from "@/lib/url-guard";

/**
 * Production security hardening: SSRF + payload guards shared by the API
 * routes. Layered on top of the existing per-route checks (defense in depth):
 *
 *  - `assertPublicMediaUrl` — strictly validates a download target: https
 *    only, no credentials, no private/loopback/link-local host
 *    (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, ::1, localhost), and a
 *    match against the platform CDN allowlist.
 *  - `readBoundedJson` — rejects oversized JSON bodies before parsing so a
 *    hostile client can't force the server to buffer megabytes.
 */

/** Maximum /api/fetch JSON body: 4 KiB (a video URL is ~100 bytes). */
export const MAX_FETCH_BODY_BYTES = 4_096;

/** Loopback / private / link-local literals, belt-and-braces on top of isPrivateHostname. */
const PRIVATE_LITERAL =
  /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|\[::1\])$/i;

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (PRIVATE_LITERAL.test(host)) return true;
  return isPrivateHostname(host);
}

/** Throw a BAD_REQUEST AppError unless `raw` is a public, allowlisted https media URL. */
export function assertPublicMediaUrl(raw: string): URL {
  if (!raw || raw.length > 4_096) {
    throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }
  if (url.protocol !== "https:") {
    throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }
  if (url.username || url.password) {
    throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }
  if (!isAllowedMediaUrl(raw)) {
    throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }
  return url;
}

/**
 * Read a JSON body with a hard size cap. Throws BAD_REQUEST when the payload
 * exceeds `maxBytes` or isn't valid JSON — the caller never buffers more
 * than the cap plus one chunk.
 */
export async function readBoundedJson<T = unknown>(
  request: Request,
  maxBytes: number = MAX_FETCH_BODY_BYTES,
): Promise<T> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      throw new AppError("BAD_REQUEST", "The request body is too large.");
    }
  }
  const raw = await request.text().catch(() => {
    throw new AppError("BAD_REQUEST", "The request body must be valid JSON.");
  });
  if (raw.length > maxBytes) {
    throw new AppError("BAD_REQUEST", "The request body is too large.");
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AppError("BAD_REQUEST", "The request body must be valid JSON.");
  }
}
