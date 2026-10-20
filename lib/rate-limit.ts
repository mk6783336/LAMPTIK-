interface Bucket {
  /** Available requests (fractional between refills). */
  tokens: number;
  /** Last refill timestamp. */
  updatedAt: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
}

const MAX_BUCKETS = 5_000;

/**
 * LRU-ish Map: insertion order doubles as access order (we delete+re-insert
 * on touch), so hot IPs stay resident and cold ones evict first.
 */
const buckets: Map<string, Bucket> =
  (globalThis as typeof globalThis & { __lamptikRate?: Map<string, Bucket> }).__lamptikRate ??
  new Map<string, Bucket>();

(globalThis as typeof globalThis & { __lamptikRate?: Map<string, Bucket> }).__lamptikRate =
  buckets;

function evictIfNeeded(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;

  // First pass: drop refilled (idle) buckets.
  for (const [key, bucket] of buckets) {
    if (bucket.updatedAt < now) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS) return;
  }
  // Second pass: drop oldest entries (LRU).
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (buckets.size < MAX_BUCKETS) return;
  }
}

/**
 * Token-bucket limiter per key (client IP). Allows `limit` requests per
 * `windowMs` with continuous refill (e.g. 20/min = capacity 20, one token
 * every 3s) — burst-tolerant and self-balancing. Callers return HTTP 429
 * with `Retry-After` when `ok` is false.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const refillPerMs = limit / windowMs;

  let bucket = buckets.get(key);

  if (bucket) {
    bucket.tokens = Math.min(limit, bucket.tokens + (now - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = now;
    // Touch for LRU ordering.
    buckets.delete(key);
    buckets.set(key, bucket);
  } else {
    evictIfNeeded(now);
    bucket = { tokens: limit, updatedAt: now };
    buckets.set(key, bucket);
  }

  if (bucket.tokens < 1) {
    const waitMs = Math.ceil((1 - bucket.tokens) / refillPerMs);
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(waitMs / 1000)),
    };
  }

  bucket.tokens -= 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, Math.floor(bucket.tokens)),
    retryAfter: 0,
  };
}
