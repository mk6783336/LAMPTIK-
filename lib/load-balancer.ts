/**
 * Multi-engine waterfall load balancer with per-provider timeout and a
 * lightweight in-memory circuit breaker.
 *
 * Goal: a valid TikTok / Instagram / Facebook link must NEVER hit a dead
 * end because one upstream is slow or down. Providers run in priority
 * order; the first success wins. A provider that fails 3 times in a row is
 * deprioritized for 60 seconds so subsequent users don't wait on a dead
 * upstream.
 *
 * In-memory only (per isolate): no storage, no logging, zero PII.
 */

export interface WaterfallProvider<T> {
  /** Stable id used for health tracking (e.g. "tiktok:page"). */
  name: string;
  /** Per-provider timeout. Callers should pass 4500ms per spec. */
  timeoutMs: number;
  fn: () => Promise<T>;
}

export const WATERFALL_TIMEOUT_MS = 4_500;
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

interface HealthRecord {
  consecutiveFailures: number;
  coolDownUntil: number;
}

const health = new Map<string, HealthRecord>();

function getHealth(name: string): HealthRecord {
  let record = health.get(name);
  if (!record) {
    record = { consecutiveFailures: 0, coolDownUntil: 0 };
    health.set(name, record);
  }
  return record;
}

function recordSuccess(name: string): void {
  const record = getHealth(name);
  record.consecutiveFailures = 0;
  record.coolDownUntil = 0;
}

function recordFailure(name: string): void {
  const record = getHealth(name);
  record.consecutiveFailures += 1;
  if (record.consecutiveFailures >= FAILURE_THRESHOLD) {
    record.coolDownUntil = Date.now() + COOLDOWN_MS;
  }
}

/**
 * Read one provider's breaker without touching it.
 *
 * Exposed for waterfalls that have to *order* their attempts before running
 * any of them (the X/Twitter resolver has to distinguish a dead mirror from a
 * healthy mirror with nothing to serve, which `runWaterfall`'s success/failure
 * contract cannot express).
 */
export function isCoolingDown(name: string): boolean {
  const record = health.get(name);
  return record !== undefined && record.coolDownUntil > Date.now();
}

/**
 * Record the outcome of one attempt for a caller running its own loop. Same
 * counters `runWaterfall` uses, so both paths share a single breaker instead
 * of drifting apart.
 */
export function recordOutcome(name: string, ok: boolean): void {
  if (ok) recordSuccess(name);
  else recordFailure(name);
}

/** For tests / health endpoints: snapshot of current breaker state. */
export function waterfallHealthSnapshot(): Record<string, { failures: number; coolingDown: boolean }> {
  const out: Record<string, { failures: number; coolingDown: boolean }> = {};
  for (const [name, record] of health) {
    out[name] = {
      failures: record.consecutiveFailures,
      coolingDown: Date.now() < record.coolDownUntil,
    };
  }
  return out;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Provider "${name}" timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/**
 * Run providers in order; first success wins. Cooling-down providers are
 * tried last (not skipped outright) so a recovered upstream rejoins
 * without ever blocking a fresh one.
 */
export async function runWaterfall<T>(providers: Array<WaterfallProvider<T>>): Promise<T> {
  // Stable sort: providers with an equal breaker state keep their declared
  // priority, so the normal order is also the order callers wrote down.
  const ordered = [...providers].sort(
    (a, b) => Number(isCoolingDown(a.name)) - Number(isCoolingDown(b.name)),
  );

  let lastError: unknown = null;
  for (const provider of ordered) {
    try {
      const result = await withTimeout(provider.fn(), provider.timeoutMs, provider.name);
      recordSuccess(provider.name);
      return result;
    } catch (error) {
      recordFailure(provider.name);
      lastError = error;
    }
  }
  throw lastError ?? new Error("All waterfall providers failed without an error.");
}
