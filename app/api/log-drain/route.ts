import { NextResponse, type NextRequest } from "next/server";

/**
 * Vercel log-drain sink for the download counter.
 *
 * `app/api/download/route.ts` writes one `[download] stream-start {…}` line per
 * transfer that actually began. Vercel keeps runtime logs for a short window
 * and offers no query API, so this endpoint is the drain destination that
 * turns those lines into something durable: daily totals in a Redis REST
 * store (Vercel Marketplace's Redis integration injects `KV_REST_API_URL` and
 * `KV_REST_API_TOKEN`; plain `fetch` is the whole client).
 *
 * Shape of the job:
 * 1. Vercel POSTs NDJSON (one log event per line) to this URL.
 * 2. The body is authenticated with `x-vercel-signature`, an HMAC-SHA1 hex
 *    digest of the raw body keyed by the drain secret — verified before a
 *    single line is read.
 * 3. Only lines carrying the counter prefix are counted; everything else is
 *    ignored, so this can be the drain for every source without storing logs.
 * 4. Counts land as atomic `INCRBY`s: `dl:{day}`, `dl:{day}:bytes`,
 *    `dl:{day}:p:{platform}`, `dl:{day}:d:{delivery}`.
 *
 * Deliberately not stored: the link, the video id, the filename, the IP, the
 * user agent, and the log line itself. A few numbers per download is the whole
 * payload, which is exactly what the privacy page promises.
 *
 * When the store is not configured this answers 200 with `stored: false`
 * rather than an error: Vercel retries failed deliveries, and a retry is a
 * double count the day a store appears. Losing a line is cheaper than
 * inflating the total, and the missing env var is visible in the log.
 */

export const dynamic = "force-dynamic";

/** Vercel Marketplace Redis (Upstash-compatible REST). Trailing slash trimmed. */
const STORE_URL = (
  process.env.KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL ??
  ""
).replace(/\/+$/, "");
const STORE_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
/** Signing key from the drain's `delivery.secret`. Upfront = unverifiable sink. */
const DRAIN_SECRET = process.env.LOG_DRAIN_SECRET ?? "";

/** The exact prefix `app/api/download/route.ts` emits. */
const COUNTER_PREFIX = "[download] stream-start ";
/** Platform names the site can emit (see `lib/tiktok/allowlist.ts`). */
const KNOWN_PLATFORMS = new Set(["tiktok", "instagram", "facebook", "youtube", "twitter"]);
const KNOWN_DELIVERIES = new Set(["proxy", "bridge", "direct"]);

interface TransferEvent {
  delivery?: unknown;
  platform?: unknown;
  bytes?: unknown;
}

interface DayTotal {
  count: number;
  bytes: number;
  platforms: Map<string, number>;
  deliveries: Map<string, number>;
}

function bump(map: Map<string, number>, key: string, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

/** Constant-time compare, so a signature guess cannot be timed. */
function sameDigest(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return diff === 0;
}

/** HMAC-SHA1 hex of the raw body, keyed by the drain secret. */
async function signatureOf(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Only known labels become key names, so a log line can never invent a key. */
function allowed(value: unknown, known: Set<string>, fallback: string): string {
  return typeof value === "string" && known.has(value) ? value : fallback;
}

/** UTC day of the log event: a line belongs to the day it happened. */
function dayOf(timestamp: unknown): string {
  const ms = typeof timestamp === "number" && Number.isFinite(timestamp) ? timestamp : Date.now();
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Walk the NDJSON body and total only the counter lines, per UTC day.
 *
 * A malformed line is skipped, never fatal: one bad event must not fail the
 * delivery and drop the rest of the batch. A batch that straddles midnight
 * therefore still lands on two correct days.
 */
function tally(raw: string): Map<string, DayTotal> {
  const days = new Map<string, DayTotal>();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event: { message?: unknown; timestamp?: unknown };
    try {
      event = JSON.parse(trimmed) as { message?: unknown; timestamp?: unknown };
    } catch {
      continue;
    }

    const message = typeof event.message === "string" ? event.message : "";
    const at = message.indexOf(COUNTER_PREFIX);
    if (at === -1) continue;

    let payload: TransferEvent;
    try {
      payload = JSON.parse(message.slice(at + COUNTER_PREFIX.length).trim()) as TransferEvent;
    } catch {
      continue;
    }

    const day = dayOf(event.timestamp);
    const total = days.get(day) ?? { count: 0, bytes: 0, platforms: new Map(), deliveries: new Map() };
    const bytes =
      typeof payload.bytes === "number" && Number.isFinite(payload.bytes) ? Math.max(0, Math.round(payload.bytes)) : 0;

    total.count += 1;
    total.bytes += bytes;
    bump(total.platforms, allowed(payload.platform, KNOWN_PLATFORMS, "unknown"), 1);
    bump(total.deliveries, allowed(payload.delivery, KNOWN_DELIVERIES, "unknown"), 1);
    days.set(day, total);
  }

  return days;
}

/** One round trip for every increment, in the order the keys were built. */
async function store(days: Map<string, DayTotal>): Promise<boolean> {
  if (!STORE_URL || !STORE_TOKEN) return false;

  const commands: (string | number)[][] = [];
  for (const [day, total] of days) {
    commands.push(["INCRBY", `dl:${day}`, total.count]);
    if (total.bytes > 0) commands.push(["INCRBY", `dl:${day}:bytes`, total.bytes]);
    for (const [platform, count] of total.platforms) {
      if (count > 0) commands.push(["INCRBY", `dl:${day}:p:${platform}`, count]);
    }
    for (const [delivery, count] of total.deliveries) {
      if (count > 0) commands.push(["INCRBY", `dl:${day}:d:${delivery}`, count]);
    }
  }
  if (!commands.length) return false;

  try {
    const response = await fetch(`${STORE_URL}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${STORE_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[log-drain] store rejected the batch: ${response.status}`);
      return false;
    }
    await response.body?.cancel().catch(() => undefined);
    return true;
  } catch (error) {
    console.error(
      "[log-drain] store unreachable:",
      error instanceof Error ? error.message : "unknown",
    );
    return false;
  }
}

/**
 * Ownership token for the drain handshake.
 *
 * Vercel's probe carries the token either as the `x-vercel-verify` header or as
 * an `x-vercel-verify` query parameter depending on where the drain was created
 * from (API vs dashboard), and it checks the response header. Reading both
 * means one implementation satisfies either sender.
 */
function verifyToken(request: NextRequest): string | null {
  const fromQuery = request.nextUrl.searchParams.get("x-vercel-verify");
  if (fromQuery) return fromQuery;
  const fromHeader = request.headers.get("x-vercel-verify");
  return fromHeader ?? null;
}

/** Vercel probes the URL before enabling the drain: answer, count nothing. */
export async function GET(request: NextRequest): Promise<Response> {
  // The ownership handshake has been seen as both a GET and a POST; echo the
  // token on either, so enabling the drain never depends on the method.
  const probe = verifyToken(request);
  return new NextResponse("lamptik log-drain", {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...(probe ? { "x-vercel-verify": probe } : {}),
    },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  // Ownership handshake: no signature, no events — just prove we are here.
  const probe = verifyToken(request);
  if (probe) {
    return new NextResponse(null, { status: 200, headers: { "x-vercel-verify": probe } });
  }

  const raw = await request.text();

  if (!DRAIN_SECRET) {
    // Nothing to verify against, so nothing may be counted: an open counter is
    // an invitation to inflate the number.
    console.error("[log-drain] LOG_DRAIN_SECRET is not set — delivery ignored");
    return NextResponse.json({ stored: false, counted: 0, reason: "no-secret" }, { status: 200 });
  }

  const header = request.headers.get("x-vercel-signature");
  if (!header) {
    // A rejected delivery is worth one line: it is the only way to see what a
    // handshake actually sent when the drain refuses to be created. No body,
    // no token, no IP — just the method and path.
    console.log(`[log-drain] unsigned delivery: ${request.method} ${request.nextUrl.pathname}`);
    return NextResponse.json({ stored: false, counted: 0, reason: "unsigned" }, { status: 401 });
  }

  const expected = await signatureOf(raw, DRAIN_SECRET);
  if (!sameDigest(expected, header.trim().toLowerCase())) {
    return NextResponse.json({ stored: false, counted: 0, reason: "bad-signature" }, { status: 401 });
  }

  const days = tally(raw);
  if (days.size === 0) {
    // A drain carries every source; the ones we do not count still get a 200.
    return NextResponse.json({ stored: false, counted: 0 }, { status: 200 });
  }

  const counted = Array.from(days.values()).reduce((sum, total) => sum + total.count, 0);
  const stored = await store(days);
  if (!stored) {
    console.error("[log-drain] counted but not stored — set KV_REST_API_URL / KV_REST_API_TOKEN");
  }

  return NextResponse.json({ stored, counted, days: Array.from(days.keys()) }, { status: 200 });
}
