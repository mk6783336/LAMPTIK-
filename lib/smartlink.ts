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
  // A blocked popup is not an open: recording the stamp there would burn the
  // visitor's one-per-four-hours allowance without ever showing them the page.
  if (!opened) return false;
  writeStamps([...readStamps(now), now]);
  return true;
}

/**
 * Cap check for an anchor whose href IS the Smartlink.
 *
 * `window.open` is the right call from a download hand-off (the gesture is
 * already spent on the file), but a plain anchor is immune to popup blockers
 * and survives in-app browsers that suppress `window.open` entirely. The
 * browser performs the navigation, so nothing here opens a second tab: the
 * handler only records the stamp, or cancels the click once the cap is hit.
 *
 * Returns true when the click may proceed.
 */
export function claimSmartlink(
  event: { preventDefault: () => void },
  now = Date.now(),
): boolean {
  if (!smartlinkAllowed(now)) {
    event.preventDefault();
    return false;
  }
  writeStamps([...readStamps(now), now]);
  return true;
}
