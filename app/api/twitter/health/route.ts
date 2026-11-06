import { NextResponse, type NextRequest } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import {
  DEFAULT_TWITTER_HEALTH_POSTS,
  twitterMirrorHealth,
  type TwitterHealthSnapshot,
} from "@/lib/twitter";

/**
 * GET /api/twitter/health — do the three X/Twitter mirrors still answer?
 *
 * A mirror breaking is invisible from the inside: the waterfall keeps
 * succeeding as long as *one* of the three is up, so a dead primary only shows
 * up as extra latency and an `provider` field nobody reads. This endpoint
 * probes all three in parallel and reports each one separately, which is what
 * `.github/workflows/twitter-health.yml` polls.
 *
 * Status codes are the contract the monitor keys on:
 *   200 `ok`              — every mirror parsed a real post.
 *   200 `degraded`        — at least one is down; the resolver still serves.
 *   200 `fixture_missing` — probes agree there is nothing to parse (fixture
 *                           deleted or payload shape changed). Unmeasured, not
 *                           an outage: update TWITTER_HEALTH_POSTS.
 *   503 `down`            — no mirror produced a downloadable rendition.
 *   429                   — this endpoint is rate limited like the rest.
 *
 * Public and cheap (one minute of caching, no secrets, no media bytes), so it
 * is safe to poll from CI and to curl by hand.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function fixturePostIds(): string[] {
  const configured = (process.env.TWITTER_HEALTH_POSTS ?? "").trim();
  const values = configured ? configured.split(",") : [...DEFAULT_TWITTER_HEALTH_POSTS];
  const ids = values
    .map((value) => value.trim().replace(/^.*\/status\//, ""))
    .filter((value) => /^\d{5,25}$/.test(value))
    .slice(0, 3);
  return ids.length > 0 ? ids : [...DEFAULT_TWITTER_HEALTH_POSTS];
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`twitter-health:${ip}`, 12, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  let snapshot: TwitterHealthSnapshot;
  try {
    snapshot = await twitterMirrorHealth(fixturePostIds());
  } catch {
    // A probe that throws says nothing about the mirrors; never turn it into a
    // clean bill of health.
    return NextResponse.json(
      { ok: false, status: "unprobed", checkedAt: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: snapshot.status === "ok", ...snapshot },
    {
      status: snapshot.status === "down" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
        // The one-line number a smoke test can grep without parsing JSON.
        "X-Twitter-Resolvers": `${snapshot.usable}/${snapshot.total}`,
      },
    },
  );
}
