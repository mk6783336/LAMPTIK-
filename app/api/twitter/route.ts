import { NextResponse, type NextRequest } from "next/server";

import { AppError, errorResponse, toAppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { extractTwitter } from "@/lib/twitter";

/**
 * GET /api/twitter?url=… — metadata for one X (Twitter) post.
 *
 * Node runtime, not Edge: the three mirrors are ordinary JSON endpoints and
 * the resolver in `lib/twitter.ts` uses the shared `timedFetch`, which keeps
 * this route consistent with the other resolvers instead of giving X its own
 * transport.
 *
 * The input is never fetched: it is parsed down to a post id first, so an
 * arbitrary URL can never become an SSRF target. Every media URL that comes
 * back out is re-validated (public https + `twimg.com`) inside the resolver.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`twitter:${ip}`, 35, 60_000);

  if (!limit.ok) {
    return errorResponse(
      new AppError(
        "RATE_LIMITED",
        "Too many requests from this address.",
        `Please wait ${limit.retryAfter}s before trying again.`,
      ),
      {
        "Retry-After": String(limit.retryAfter),
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (!url.trim()) {
    return errorResponse(
      new AppError(
        "INVALID_URL",
        "Paste an X (Twitter) post link first.",
        "Supported: x.com/…/status/…, twitter.com/…/status/… and mobile links to the same post.",
      ),
    );
  }
  if (url.length > 2_048) {
    return errorResponse(
      new AppError("INVALID_URL", "That link is too long to be a valid post URL."),
    );
  }

  try {
    const media = await extractTwitter(url, request.signal);
    return NextResponse.json(
      { ok: true, media },
      {
        headers: {
          // Signed `video.twimg.com` URLs are post-bound and short-lived.
          "Cache-Control": "no-store",
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    );
  } catch (error) {
    // Same contract as /api/fetch: a mirror outage answers 200 with
    // `{ ok:false }` so a provider hiccup is not counted as a crashed
    // function, while a bad input keeps its real 4xx status.
    const status = toAppError(error).status;
    return errorResponse(error, undefined, status >= 500 ? 200 : undefined);
  }
}
