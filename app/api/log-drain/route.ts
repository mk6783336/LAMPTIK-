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
 * 4. Deliveries are retried, so counting is made idempotent twice over: the
 *    raw body is claimed under `dl:b:{sha256}` and every event under
 *    `dl:id:{id}` with `SET … NX`. A replay therefore adds nothing, while a
 *    batch re-split differently still loses each event at most once.
 * 5. Accepted events land as atomic `INCRBY`s: `dl:{day}`, `dl:{day}:bytes`,
 *    `dl:{day}:p:{platform}`, `dl:{day}:d:{delivery}`.
 *
 * Deliberately not stored: the link, the video id, the filename, the IP, the
 * user agent, and the log line itself. A few numbers per download plus a
 * short-lived Vercel log id is the whole payload, which is what the privacy
 * page promises.
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

/** A replayed batch is recognised for this long; Vercel retries within hours. */
const BATCH_TTL_SECONDS = 3 * 86_400;
/** Per-event claims outlive the retry window with room to spare. */
const EVENT_TTL_SECONDS = 7 * 86_400;

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

/** One counter line, already reduced to the numbers that get stored. */
interface Start {
  /** Vercel's log id; empty when the sender did not supply one. */
  id: string;
  day: string;
  bytes: number;
  platform: string;
  delivery: string;
}

interface DayTotal {
  count: number;
  bytes: number;
  platforms: Map<string, number>;
  deliveries: Map<string, number>;
}

interface CommitResult {
  stored: boolean;
  counted: number;
  days: string[];
}

type Command = (string | number)[];

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

/** SHA-256 hex of the raw body: the identity of one delivery. */
async function digestOf(body: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
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
 * Walk the NDJSON body and collect only the counter lines.
 *
 * A malformed line is skipped, never fatal: one bad event must not fail the
 * delivery and drop the rest of the batch. Two lines carrying the same log id
 * inside one body are the same download, so the second is dropped here.
 */
function starts(raw: string): Start[] {
  const out: Start[] = [];
  const seen = new Set<string>();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event: { id?: unknown; message?: unknown; timestamp?: unknown };
    try {
      event = JSON.parse(trimmed) as { id?: unknown; message?: unknown; timestamp?: unknown };
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

    const id = typeof event.id === "string" && event.id ? event.id : "";
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }

    out.push({
      id,
      day: dayOf(event.timestamp),
      bytes:
        typeof payload.bytes === "number" && Number.isFinite(payload.bytes)
          ? Math.max(0, Math.round(payload.bytes))
          : 0,
      platform: allowed(payload.platform, KNOWN_PLATFORMS, "unknown"),
      delivery: allowed(payload.delivery, KNOWN_DELIVERIES, "unknown"),
    });
  }

  return out;
}

/** Fold the accepted lines into per-day totals. */
function tally(list: Start[]): Map<string, DayTotal> {
  const days = new Map<string, DayTotal>();

  for (const start of list) {
    const total = days.get(start.day) ?? {
      count: 0,
      bytes: 0,
      platforms: new Map<string, number>(),
      deliveries: new Map<string, number>(),
    };
    total.count += 1;
    total.bytes += start.bytes;
    bump(total.platforms, start.platform, 1);
    bump(total.deliveries, start.delivery, 1);
    days.set(start.day, total);
  }

  return days;
}

/** One round trip for a whole batch of commands. `null` means "try again later". */
async function pipeline(commands: Command[]): Promise<{ result?: unknown; error?: string }[] | null> {
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
      console.error(`[log-drain] store rejected ${commands.length} commands: ${response.status}`);
      return null;
    }
    const rows = (await response.json()) as { result?: unknown; error?: string }[];
    return Array.isArray(rows) ? rows : null;
  } catch (error) {
    console.error(
      "[log-drain] store unreachable:",
      error instanceof Error ? error.message : "unknown",
    );
    return null;
  }
}

/**
 * Claim this delivery, keep only the events no earlier delivery stored, and
 * increment the day counters for those.
 *
 * Two round trips: claims first, counters second. A claim that succeeds but
 * whose counters fail undercounts by one retry — the safe direction, since an
 * inflated download total is a lie about the site's own traffic.
 */
async function commit(raw: string, list: Start[]): Promise<CommitResult> {
  if (!STORE_URL || !STORE_TOKEN) return { stored: false, counted: 0, days: [] };

  const withId = list.filter((start) => start.id);
  const claims: Command[] = [
    ["SET", `dl:b:${await digestOf(raw)}`, "1", "NX", "EX", BATCH_TTL_SECONDS],
  ];
  for (const start of withId) {
    claims.push(["SET", `dl:id:${start.id}`, "1", "NX", "EX", EVENT_TTL_SECONDS]);
  }

  const claimed = await pipeline(claims);
  if (!claimed) return { stored: false, counted: 0, days: [] };
  // `SET … NX` returns null when the key already existed: a replayed batch.
  if (claimed[0]?.result !== "OK") return { stored: true, counted: 0, days: [] };

  const claimIndex = new Map<Start, number>();
  withId.forEach((start, index) => claimIndex.set(start, index + 1));

  const accepted = list.filter((start) => {
    const index = claimIndex.get(start);
    // An id-less line has no per-event claim; the batch key is what protects it.
    return index === undefined || claimed[index]?.result === "OK";
  });
  if (!accepted.length) return { stored: true, counted: 0, days: [] };

  const days = tally(accepted);
  const commands: Command[] = [];
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

  const stored = await pipeline(commands);
  if (!stored) return { stored: false, counted: 0, days: [] };

  return { stored: true, counted: accepted.length, days: Array.from(days.keys()) };
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

  const list = starts(raw);
  if (!list.length) {
    // A drain carries every source; the ones we do not count still get a 200.
    return NextResponse.json({ stored: false, counted: 0, days: [] }, { status: 200 });
  }

  const result = await commit(raw, list);
  if (!result.stored) {
    console.error("[log-drain] counted but not stored — set KV_REST_API_URL / KV_REST_API_TOKEN");
  }

  return NextResponse.json(
    { stored: result.stored, counted: result.counted, days: result.days },
    { status: 200 },
  );
}
