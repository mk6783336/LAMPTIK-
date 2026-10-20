export const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Combine an optional external abort signal (e.g. client disconnect) with a
 * timeout. Guarantees extraction never hangs past `timeoutMs` even when the
 * caller's signal never fires, and aborts immediately when it does.
 */
export function withTimeoutSignal(
  external: AbortSignal | undefined,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Node timers keep the event loop alive otherwise; extraction is short-lived.
  (timer as unknown as { unref?: () => void }).unref?.();

  if (external?.aborted) {
    controller.abort();
  } else if (external) {
    external.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/**
 * `fetch` with a hard timeout. Callers that need their own abort signal should
 * pass one; requests here are short-lived and independent, so a timeout is the
 * safe default.
 */
export async function timedFetch(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}

/** Turn protocol-relative or origin-relative CDN URLs into absolute https URLs. */
export function toAbsoluteUrl(value: unknown, origin = "https://www.tikwm.com"): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;

  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${origin}${url}`;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Collapse whitespace and strip any HTML fragments from a caption. */
export function cleanCaption(value: unknown, maxLength = 2_000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function toCount(value: unknown): number {
  const count = typeof value === "string" ? Number(value) : value;
  return typeof count === "number" && Number.isFinite(count) && count > 0
    ? Math.floor(count)
    : 0;
}

export function toDuration(value: unknown): number {
  const duration = typeof value === "string" ? Number(value) : value;
  return typeof duration === "number" && Number.isFinite(duration) && duration > 0
    ? Math.round(duration)
    : 0;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
