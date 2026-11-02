import { trackEvent } from "@/lib/analytics";
import type { AdFormat, AdSlotId } from "@/lib/monetization";

/**
 * Ad slot telemetry — one record per auction, answered with real numbers.
 *
 * The question this exists to settle: a slot sitting on its reserved box tells
 * you nothing. It could be a zone with no demand, a slow auction that still
 * paid, or the visitor's ad-blocker. Those need different fixes (new zone,
 * more wait, or nothing at all), so each is a distinct `outcome`:
 *
 *   - `filled`  a creative painted. `waitedMs` is the auction's real latency:
 *               small (≲ 3s) is healthy, large is a slow auction worth waiting
 *               for, and the two are directly comparable across placements.
 *   - `timeout` the frame returned no word before AdSlot's deadline. No bid,
 *               or a creative slower than the deadline. This is the "dead
 *               zone" signal.
 *   - `blocked` the network's tag script itself errored — almost always an
 *               ad-blocker. Excluded from demand analysis on purpose: a
 *               blocked visitor is not a missing bid.
 *
 * Destinations, also on purpose:
 *   - GA4 event `ad_slot_result` (+ a mirrored `dataLayer` push for GTM):
 *     retention. Params are `slot`, `zone_key`, `format`, `outcome`,
 *     `wait_ms` and `page_path`; register the first four as event-scoped
 *     custom dimensions to break reports down by them.
 *   - `adReport()` (dev-only `__lamptikAds()` in the console): live tuning.
 */
export type AdOutcome = "filled" | "blocked" | "timeout";

export interface AdOutcomeInput {
  /** Placement that requested the creative, when the call site names one. */
  slot?: AdSlotId;
  /** Zone key the frame requested — the same string as in the Adsterra dashboard. */
  zoneKey: string;
  /** Size actually requested. The mobile swap makes this differ from the
   *  placement's native format, which is exactly what a fill-rate report
   *  needs to see. */
  format: AdFormat;
  outcome: AdOutcome;
  /** Milliseconds from iframe mount to the outcome. */
  waitedMs: number;
}

export interface AdRecord extends Omit<AdOutcomeInput, "waitedMs"> {
  waitedMs: number;
  at: string;
}

/** Rolling window — long enough to explain a page session, small enough to
 *  never grow while a tab stays open for hours. */
const records: AdRecord[] = [];

/** Record one slot's auction outcome. Safe to call more than once per
 *  attempt: AdSlot guards its own duplicates before it gets here. */
export function reportAdOutcome(input: AdOutcomeInput): void {
  if (typeof window === "undefined") return;

  const record: AdRecord = {
    ...input,
    waitedMs: Math.max(0, Math.round(input.waitedMs)),
    at: new Date().toISOString(),
  };

  records.push(record);
  if (records.length > 50) records.shift();

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[ad] ${record.slot ?? "unassigned"} ${record.outcome} in ${record.waitedMs}ms · ${record.zoneKey}`,
    );
  }

  trackEvent("ad_slot_result", {
    slot: record.slot ?? "unassigned",
    zone_key: record.zoneKey,
    format: record.format,
    outcome: record.outcome,
    wait_ms: record.waitedMs,
    page_path: window.location.pathname,
  });
}

/** Latest outcomes for this tab, newest last — for console inspection while
 *  tuning placements. */
export function adReport(): AdRecord[] {
  return records.slice();
}

// Dev-only handle: `__lamptikAds()` prints the table from DevTools. Kept out
// of the production bundle so the live page exposes no ad diagnostics.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as Window & { __lamptikAds?: () => AdRecord[] }).__lamptikAds = adReport;
}
