import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { DESKTOP_UA } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { assertPublicMediaUrl, isPublicMediaUrl } from "@/lib/security";
import {
  contentDisposition,
  safeFilenamePart,
  safePlatform,
  type DownloadPlatform,
} from "@/lib/tiktok/allowlist";

/**
 * Edge download proxy.
 *
 * Why Edge: the Node serverless path buffers the body for payload validation
 * and is subject to Vercel's 4.5 MB buffered-response limit, which is exactly
 * why an 8 MB clip crawled and 100 MB+ videos died mid-stream. Edge functions
 * start at the user's nearest PoP with no cold start, and a *streamed*
 * response has no 4.5 MB cap (Vercel allows streaming for up to 300s once the
 * response has started within 25s). The body is piped chunk-by-chunk with
 * native backpressure — memory stays flat at any file size.
 *
 * Safety: every hop must stay a public https host (private/loopback targets
 * are rejected — SSRF), the upstream payload is validated (content type,
 * size, first bytes) BEFORE `Content-Disposition: attachment` is attached,
 * and any failure returns a JSON error *without* an attachment header so a
 * browser can never save `download.json` to the user's gallery.
 */

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_REDIRECTS = 3;
const HEADER_TIMEOUT_MS = 10_000;
const SNIFF_TIMEOUT_MS = 8_000;
/** Anything smaller than this is an error page, not media. */
const MIN_MEDIA_BYTES = 5 * 1024;

type DownloadKind = "video" | "audio";

interface PlatformProfile {
  referer: string;
}

const PLATFORM_PROFILES: Record<DownloadPlatform, PlatformProfile> = {
  tiktok: { referer: "https://www.tiktok.com/" },
  instagram: { referer: "https://www.instagram.com/" },
  facebook: { referer: "https://www.facebook.com/" },
  youtube: { referer: "https://www.youtube.com/" },
};

/** Response types that mean "this is an error page / playlist, not media". */
const BLOCKED_TYPES =
  /^(application\/(?:json|problem\+json|xml|xhtml\+xml|javascript)|text\/|audio\/(?:mpegurl|x-mpegurl)|application\/(?:vnd\.apple\.mpegurl|x-mpegurl))/i;

function profileFor(platform: DownloadPlatform, upstreamUrl: string): PlatformProfile {
  try {
    const hostname = new URL(upstreamUrl).hostname.toLowerCase();
    // TikWM serves its own extracted renditions; TikTok's Referer hurts there.
    if (hostname === "tikwm.com" || hostname.endsWith(".tikwm.com")) {
      return { referer: "https://www.tikwm.com/" };
    }
    // Loader.to / OceanSaver proxy renditions (including their rotating
    // download hosts like `*.savenow.to`) require their own Referer.
    if (
      hostname === "loader.to" ||
      hostname.endsWith(".loader.to") ||
      hostname === "oceansaver.in" ||
      hostname.endsWith(".oceansaver.in") ||
      hostname === "savenow.to" ||
      hostname.endsWith(".savenow.to")
    ) {
      return { referer: "https://loader.to/" };
    }
  } catch {
    // URL validation already rejected malformed inputs.
  }
  return PLATFORM_PROFILES[platform];
}

function upstreamHeadersFor(platform: DownloadPlatform, upstreamUrl: string): Record<string, string> {
  const profile = profileFor(platform, upstreamUrl);
  return {
    Accept: "*/*",
    "Accept-Encoding": "identity",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: profile.referer,
    "User-Agent": DESKTOP_UA,
  };
}

/**
 * Follow redirects manually so every hop stays inside the platform's CDN
 * allowlist. Fetch's automatic redirect mode would connect to the target
 * before we could reject a hop that left the allowlist.
 */
async function fetchAllowedMedia(
  startUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    // Public https only: any platform CDN host is fine (they rotate dozens of
    // dynamic regional domains), but a redirect must never walk into
    // localhost / private / link-local space.
    if (!isPublicMediaUrl(currentUrl)) {
      throw new AppError("BAD_REQUEST", "That media source isn't allowed.");
    }

    const response = await fetch(currentUrl, {
      method: "GET",
      headers,
      redirect: "manual",
      cache: "no-store",
      signal,
    });

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel().catch(() => undefined);
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new AppError("BAD_REQUEST", "The media server returned an invalid redirect.");
      }
      continue;
    }

    return response;
  }

  throw new AppError(
    "UPSTREAM_ERROR",
    "The media server redirected too many times.",
    "Fetch the video again to refresh the stream.",
  );
}

/**
 * Last-resort hand-off: let the VISITOR'S browser fetch the bytes directly
 * from the CDN.
 *
 * Vercel's datacenter egress is blocked or rate-limited by some signed hosts
 * (Loader.to's `*.savenow.to` renditions, selected TikTok/Facebook edges) even
 * while the same URL serves the user's own mobile/residential IP normally. A
 * 302 turns that into a working download instead of a JSON error — and since
 * the target already passed the public-https SSRF gate, the browser can only
 * be sent to a public host.
 */
function handOffToCdn(upstreamUrl: string): Response {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: upstreamUrl,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isBlockedUpstream(status: number): boolean {
  // 401/403/416/429: the CDN refused this *server*. 5xx: their edge failed.
  // All of them are routinely served fine to a normal browser IP.
  return status === 401 || status === 403 || status === 416 || status === 429 || status >= 500;
}

function expiredError(): AppError {
  return new AppError(
    "UPSTREAM_ERROR",
    "The CDN link expired or was blocked.",
    "We'll re-resolve a fresh stream — try the download again.",
  );
}

function toByteCount(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mediaSize(headers: Headers, status: number): number | null {
  const contentRange = headers.get("content-range");
  const total = contentRange?.match(/\/(\d+)\s*$/)?.[1];
  if (total) return toByteCount(total);
  if (status === 200) return toByteCount(headers.get("content-length"));
  return null;
}

/**
 * Guard #0: the upstream must actually describe media. Catches HTML/JSON
 * error documents and HLS playlists before anything is streamed.
 */
function isAcceptableType(contentType: string, kind: DownloadKind): boolean {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!base) return true; // Some CDNs omit it; the byte sniff still runs.
  if (BLOCKED_TYPES.test(base)) return false;
  if (base === "application/octet-stream" || base === "binary/octet-stream" || base === "application/mp4") {
    return true;
  }
  return kind === "video" ? base.startsWith("video/") : base.startsWith("audio/") || base.startsWith("video/");
}

function baseMediaType(contentType: string, kind: DownloadKind): string {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (kind === "audio") {
    return base.startsWith("audio/") ? base : "audio/mpeg";
  }
  return base.startsWith("video/") ? base : "video/mp4";
}

function extensionFor(mediaType: string, kind: DownloadKind): string {
  if (kind === "audio") return mediaType.includes("mp4") || mediaType.includes("m4a") ? "m4a" : "mp3";
  return "mp4";
}

/** First non-whitespace byte check: JSON/HTML error payloads never look like media. */
function looksLikeMedia(bytes: Uint8Array): boolean {
  let index = 0;
  // Skip UTF-8 BOM + ASCII whitespace.
  while (
    index < bytes.length &&
    index < 8 &&
    (bytes[index] === 0xef ||
      bytes[index] === 0xbb ||
      bytes[index] === 0xbf ||
      bytes[index] === 0x20 ||
      bytes[index] === 0x0a ||
      bytes[index] === 0x0d ||
      bytes[index] === 0x09)
  ) {
    index += 1;
  }
  const first = bytes[index];
  // `{`, `[`, `<` → JSON error object, JSON array, or an HTML login/wall page.
  return first !== 0x7b && first !== 0x5b && first !== 0x3c;
}

/**
 * Read the first chunk before sending headers so a JSON/HTML body can still be
 * answered with a clean 502 instead of an attachment. The chunk is replayed
 * into a pull-based stream that keeps native backpressure.
 */
async function validateAndReplay(
  body: ReadableStream<Uint8Array>,
  skipSniff: boolean,
): Promise<{ stream: ReadableStream<Uint8Array>; valid: boolean }> {
  const reader = body.getReader();
  let first: Uint8Array | null = null;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("sniff-timeout")), SNIFF_TIMEOUT_MS);
      }),
    ]);
    first = result.value ?? null;
    finished = result.done;
  } catch {
    await reader.cancel().catch(() => undefined);
    throw new AppError(
      "UPSTREAM_ERROR",
      "The media server stalled before sending any data.",
      "Fetch the video again to refresh the signed stream.",
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!finished && first && first.byteLength > 0 && !skipSniff && !looksLikeMedia(first)) {
    await reader.cancel().catch(() => undefined);
    return { stream: new ReadableStream<Uint8Array>({ start: (controller) => controller.close() }), valid: false };
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (first && first.byteLength > 0) controller.enqueue(first);
      if (finished) controller.close();
    },
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          controller.close();
          return;
        }
        if (next.value) controller.enqueue(next.value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return { stream, valid: true };
}

interface ParsedRequest {
  kind: DownloadKind;
  upstreamUrl: string;
  platform: DownloadPlatform;
  range: string | null;
}

function parseRequest(request: NextRequest): ParsedRequest | AppError {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind");
  const upstreamUrl = params.get("u") ?? "";

  if (kind !== "video" && kind !== "audio") {
    return new AppError("BAD_REQUEST", "Choose either a video or audio download.");
  }
  // Strict SSRF gate: https-only, no credentials, and no private/loopback
  // host — before any fetch. Any public platform CDN host is accepted.
  try {
    assertPublicMediaUrl(upstreamUrl);
  } catch (error) {
    if (error instanceof AppError) return error;
    return new AppError("BAD_REQUEST", "That media source isn't allowed.");
  }

  return {
    kind,
    upstreamUrl,
    platform: safePlatform(params.get("platform")),
    range: request.headers.get("range"),
  };
}

function filenameFor(request: NextRequest, kind: DownloadKind, mediaType: string): string {
  const params = request.nextUrl.searchParams;
  const id = safeFilenamePart(params.get("id"), "video");
  const platform = safePlatform(params.get("platform"));
  return `lamptik-${platform}-${id}.${extensionFor(mediaType, kind)}`;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`download:${ip}`, 60, 60_000);

  if (!limit.ok) {
    return errorResponse(
      new AppError(
        "RATE_LIMITED",
        "Too many downloads in a short time.",
        `Please wait ${limit.retryAfter}s and try again.`,
      ),
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const parsed = parseRequest(request);
  if (parsed instanceof AppError) return errorResponse(parsed);

  const { kind, upstreamUrl, platform, range } = parsed;

  // Header phase only: connect + redirects are bounded, then the timer is
  // cleared so a 500 MB body can stream for as long as the client reads it.
  const abort = new AbortController();
  const onClientAbort = () => abort.abort();
  if (request.signal.aborted) onClientAbort();
  else request.signal.addEventListener("abort", onClientAbort, { once: true });
  const headerTimer = setTimeout(() => abort.abort(), HEADER_TIMEOUT_MS);

  let upstream: Response;
  try {
    const headers = upstreamHeadersFor(platform, upstreamUrl);
    if (range) headers.Range = range;
    upstream = await fetchAllowedMedia(upstreamUrl, headers, abort.signal);

    // Some signed CDN URLs reject `Range` outright (403/416) while serving a
    // plain GET fine — retry once without the Range header before giving up.
    if (range && (upstream.status === 403 || upstream.status === 416)) {
      await upstream.body?.cancel().catch(() => undefined);
      const plainHeaders = upstreamHeadersFor(platform, upstreamUrl);
      upstream = await fetchAllowedMedia(upstreamUrl, plainHeaders, abort.signal);
    }
  } catch (error) {
    if (error instanceof AppError && error.code === "BAD_REQUEST") return errorResponse(error);
    // Network refusal / timeout: do not fail the user. Their browser reaches
    // the CDN on a different network path; redirect it there.
    return handOffToCdn(upstreamUrl);
  } finally {
    clearTimeout(headerTimer);
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    await upstream.body?.cancel().catch(() => undefined);
    if (isBlockedUpstream(upstream.status)) {
      return handOffToCdn(upstreamUrl);
    }
    return errorResponse(expiredError());
  }

  if (!upstream.body) {
    return errorResponse(new AppError("UPSTREAM_ERROR", "The video stream was empty."));
  }

  const upstreamType = upstream.headers.get("content-type") ?? "";
  const contentLength = toByteCount(upstream.headers.get("content-length"));
  const isPartial = upstream.status === 206;

  // `download.json` guard #1: an error document or HLS playlist is never
  // attached as a file, no matter what the URL extension says.
  if (!isAcceptableType(upstreamType, kind)) {
    await upstream.body.cancel().catch(() => undefined);
    return errorResponse(expiredError());
  }

  // `download.json` guard #2: a full response under 5 KB is an error payload.
  if (!isPartial && contentLength !== null && contentLength < MIN_MEDIA_BYTES) {
    await upstream.body.cancel().catch(() => undefined);
    return errorResponse(expiredError());
  }

  // `download.json` guard #3: sniff the first chunk (JSON/HTML start bytes).
  let stream: ReadableStream<Uint8Array>;
  try {
    const validated = await validateAndReplay(upstream.body, isPartial);
    if (!validated.valid) {
      return errorResponse(expiredError());
    }
    stream = validated.stream;
  } catch (error) {
    return errorResponse(error);
  }

  const mediaType = baseMediaType(upstreamType, kind);
  const filename = filenameFor(request, kind, mediaType);

  const headers = new Headers({
    "Content-Type": mediaType,
    "Content-Disposition": contentDisposition(filename),
    "Accept-Ranges": "bytes",
    // Signed CDN URLs must never be cached by a shared cache.
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });

  // Forward the exact byte length (partial for 206) so mobile download
  // managers can run multi-threaded, resumable transfers.
  const length = upstream.headers.get("content-length") ?? mediaSize(upstream.headers, upstream.status);
  if (length !== null) headers.set("Content-Length", String(length));

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  return new Response(stream, {
    status: upstream.status,
    headers,
  });
}

/**
 * Lightweight probe used by the result panel before starting a download:
 * verifies the signed URL still resolves to media (and returns its size)
 * without transferring the file. Lets the client re-resolve *before* the
 * browser navigates, so users never see a `.json` save dialog.
 */
export async function HEAD(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`probe:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return new Response(null, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  const parsed = parseRequest(request);
  if (parsed instanceof AppError) {
    return new Response(null, { status: parsed.status });
  }

  const { upstreamUrl, kind, platform } = parsed;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), HEADER_TIMEOUT_MS);
  const onClientAbort = () => abort.abort();
  request.signal.addEventListener("abort", onClientAbort, { once: true });

  try {
    const headers = upstreamHeadersFor(platform, upstreamUrl);
    // Ask for a single byte so even a CDN that ignores HEAD sends almost nothing.
    headers.Range = "bytes=0-0";
    const upstream = await fetchAllowedMedia(upstreamUrl, headers, abort.signal);
    await upstream.body?.cancel().catch(() => undefined);

    if (upstream.status !== 200 && upstream.status !== 206) {
      return new Response(null, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!isAcceptableType(contentType, kind)) {
      return new Response(null, { status: 502 });
    }

    const size = mediaSize(upstream.headers, upstream.status);
    const mediaType = baseMediaType(contentType, kind);

    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": mediaType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store, max-age=0",
        ...(size ? { "Content-Length": String(size), "X-Media-Bytes": String(size) } : {}),
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onClientAbort);
  }
}
