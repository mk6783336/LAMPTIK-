interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_ENTRIES = 300;

/**
 * Small in-memory TTL cache. It is intentionally best-effort: on serverless
 * hosts each instance keeps its own copy, which is fine for short-lived
 * metadata. CDN URLs are signed and expire, so entries are kept brief.
 */
const store: Map<string, CacheEntry<unknown>> =
  (globalThis as typeof globalThis & { __lamptikCache?: Map<string, CacheEntry<unknown>> })
    .__lamptikCache ?? new Map<string, CacheEntry<unknown>>();

(globalThis as typeof globalThis & { __lamptikCache?: Map<string, CacheEntry<unknown>> })
  .__lamptikCache = store;

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry.value as T;
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [entryKey, entry] of store) {
      if (entry.expiresAt <= now || store.size >= MAX_ENTRIES) {
        store.delete(entryKey);
      }
      if (store.size < MAX_ENTRIES / 2) break;
    }
  }

  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** De-duplicate concurrent extractions of the same video. */
const inFlight: Map<string, Promise<unknown>> =
  (globalThis as typeof globalThis & { __lamptikInFlight?: Map<string, Promise<unknown>> })
    .__lamptikInFlight ?? new Map<string, Promise<unknown>>();

(globalThis as typeof globalThis & { __lamptikInFlight?: Map<string, Promise<unknown>> })
  .__lamptikInFlight = inFlight;

export function runOnce<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = task().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}
