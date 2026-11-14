import {
  SMARTLINK_DAY_MS,
  SMARTLINK_MAX_PER_DAY,
  SMARTLINK_MAX_PER_WINDOW,
  SMARTLINK_WINDOW_MS,
  smartlinkUrl,
} from "@/lib/monetization";

/**
 * Client-side frequency cap for the click-triggered Monetag Smartlink.
 *
 * Stored in `localStorage`, not a cookie and not the server: the decision has
 * to survive a page reload and a returning visitor, and the site's privacy page
 * promises that nothing about a download is sent anywhere. A localStorage
 * timestamp list is the whole record — no identifier, no network call.
 *
 * Failure mode is "closed": private-mode Safari and blocked storage throw on
 * read, so the tab simply does not open. That is the safe direction for a
 * monetization trigger.
 */
const STORAGE_KEY = "lamptik:smartlink:v1";

function readStamps(now: number): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      .filter((value) => value <= now && now - value < SMARTLINK_DAY_MS);
  } catch {
    return [];
  }
}

function writeStamps(stamps: number[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
  } catch {
    // Storage blocked: the cap cannot be remembered, so nothing opens.
  }
}

/** True when the visitor has not hit the four-hour or daily cap yet. */
export function smartlinkAllowed(now = Date.now()): boolean {
  if (typeof window === "undefined" || !smartlinkUrl) return false;
  const stamps = readStamps(now);
  const inWindow = stamps.filter((stamp) => now - stamp < SMARTLINK_WINDOW_MS).length;
  return inWindow < SMARTLINK_MAX_PER_WINDOW && stamps.length < SMARTLINK_MAX_PER_DAY;
}

/**
 * Open the Smartlink in a new tab and record the timestamp.
 *
 * Called only from the download click handler, after the file hand-off has
 * been dispatched, so the gesture is still live for the browser's popup
 * blocker and the download is already in flight.
 */
export function openSmartlink(now = Date.now()): boolean {
  if (!smartlinkAllowed(now)) return false;
  const opened = window.open(smartlinkUrl, "_blank", "noopener,noreferrer");
  writeStamps([...readStamps(now), now]);
  return Boolean(opened);
}
