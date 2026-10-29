import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse } from "@/lib/errors";
import { isBlockedHost } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Only TikTok's own image CDNs (and TikWM's proxy of them) may be streamed
 * here. The endpoint exists to force a real attachment download for
 * slideshow photos, not to be a general-purpose open image proxy.
 */
const ALLOWED_IMAGE_HOSTS = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokcdn-eu.com",
  "tiktokcdn-asia.com",
  "tikwm.com",
  "ibytedtos.com",
  "byteoversea.com",
];

const MAX_REDIRECTS = 3;

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_IMAGE_HOSTS.some(
    (base) => host === base || host.endsWith(`.${base}`),
  );
}

/** https-only, no credentials, public host — checked on every redirect hop. */
function parseTarget(raw: string | null): URL {
  if (!raw) {
    throw new AppError("BAD_REQUEST", "That image source isn't allowed.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("BAD_REQUEST", "That image source isn't allowed.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new AppError("BAD_REQUEST", "That image source isn't allowed.");
  }

  if (isBlockedHost(url.hostname)) {
    throw new AppError("BAD_REQUEST", "That image source isn't allowed.");
  }

  return url;
}

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("avif")) return "avif";
  return "jpg";
}

function safePart(value: string | null, fallback: string): string {
  const cleaned = (value ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return cleaned || fallback;
}

/**
 * GET /api/image?u=<cdn>&id=<post>&i=<slide>
 *
 * Streams one slideshow photo as an attachment. Redirects are followed by
 * hand so every hop passes the same public-host + TikTok-CDN gate, and the
 * bytes are piped straight through — nothing is buffered in memory.
 */
export async function GET(request: NextRequest) {
  let target: URL;
  try {
    target = parseTarget(request.nextUrl.searchParams.get("u"));
  } catch (error) {
    return errorResponse(error);
  }

  const abort = new AbortController();
  const onClientAbort = () => abort.abort();
  if (request.signal.aborted) onClientAbort();
  else request.signal.addEventListener("abort", onClientAbort, { once: true });

  const timer = setTimeout(() => abort.abort(), 15_000);

  let upstream: Response | null = null;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await fetch(target, {
        redirect: "manual",
        cache: "no-store",
        signal: abort.signal,
        headers: {
          Accept: "image/avif,image/webp,image/png,image/*;q=0.8",
          Referer: "https://www.tikwm.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        if (!location) break;

        // Relative Location is resolved against the hop we just asked for.
        const next = new URL(location, target);
        if (
          next.protocol !== "https:" ||
          next.username ||
          next.password ||
          isBlockedHost(next.hostname)
        ) {
          break;
        }
        target = next;
        continue;
      }

      upstream = response;
      break;
    }
  } catch {
    return errorResponse(
      new AppError(
        "UPSTREAM_ERROR",
        "The photo CDN didn't answer.",
        "Refresh the post and try again.",
      ),
    );
  } finally {
    clearTimeout(timer);
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    await upstream?.body?.cancel().catch(() => undefined);
    return errorResponse(
      new AppError(
        "UPSTREAM_ERROR",
        "That photo has expired.",
        "Paste the post again to get fresh links.",
      ),
    );
  }

  if (!isAllowedImageHost(target.hostname)) {
    await upstream.body.cancel().catch(() => undefined);
    return errorResponse(
      new AppError("BAD_REQUEST", "That image source isn't allowed."),
    );
  }

  const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    await upstream.body.cancel().catch(() => undefined);
    return errorResponse(
      new AppError(
        "UPSTREAM_ERROR",
        "That slide didn't return an image.",
        "Refresh the post and try again.",
      ),
    );
  }

  const id = safePart(request.nextUrl.searchParams.get("id"), "tiktok");
  const slide = safePart(request.nextUrl.searchParams.get("i"), "1");
  // WebP slides stay WebP: re-encoding would need a codec we deliberately do
  // not ship, and every phone gallery opens WebP fine.
  const filename = `lamptik-tiktok-${id}-${slide}.${extensionFor(contentType)}`;
  const length = upstream.headers.get("content-length");

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...(length ? { "Content-Length": length } : {}),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
