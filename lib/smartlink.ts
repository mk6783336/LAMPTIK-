import {
  SMARTLINK_DAY_MS,
  SMARTLINK_MAX_PER_DAY,
  SMARTLINK_MAX_PER_WINDOW,
  SMARTLINK_WINDOW_MS,
  smartlinkUrl,
  smartlinkUrl2,
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

/**
 * Which Smartlink the next automatic trigger uses.
 *
 * Both account links earn the same event; alternating them keeps a single
 * zone's frequency from being hit by the same browser. Returns primary when
 * the second link is unset.
 */
export function nextSmartlinkUrl(now = Date.now()): string {
  if (!smartlinkUrl2) return smartlinkUrl;
  return readStamps(now).length % 2 === 0 ? smartlinkUrl : smartlinkUrl2;
}

/** True when the visitor has not hit the 90-second or daily cap yet. */
export function smartlinkAllowed(now = Date.now()): boolean {
  if (typeof window === "undefined" || (!smartlinkUrl && !smartlinkUrl2)) return false;
  const stamps = readStamps(now);
  const inWindow = stamps.filter((stamp) => now - stamp < SMARTLINK_WINDOW_MS).length;
  return inWindow < SMARTLINK_MAX_PER_WINDOW && stamps.length < SMARTLINK_MAX_PER_DAY;
}

/**
 * Open a tab and cut the opener link.
 *
 * `window.open(url, "_blank", "noopener")` is the tempting form, but any
 * feature string makes Chrome return `null` even when the tab opened — which
 * previously read as "blocked", so the cap never stamped and the trigger looked
 * dead. Opening without features returns a real Window (the only way to tell a
 * blocked popup from a successful one) and `opener = null` gives the same
 * isolation.
 */
function openFreshTab(url: string): boolean {
  const opened = window.open(url, "_blank");
  if (!opened) return false;
  try {
    opened.opener = null;
  } catch {
    // Cross-origin already: nothing to sever.
  }
  return true;
}

/**
 * Explicit partner click: no frequency cap.
 *
 * The cap exists so a download is not taxed every time. A visitor pressing a
 * button that says "Partner" is asking for that tab, and suppressing the tab
 * there is what makes a partner placement pointless. Still records the stamp
 * so the automatic download-click trigger knows the partner surface was just
 * shown.
 */
export function openPartnerLink(url: string, now = Date.now()): boolean {
  if (!url || !openFreshTab(url)) return false;
  writeStamps([...readStamps(now), now]);
  return true;
}

/**
 * Automatic trigger from the download click handler, capped.
 *
 * Called after the file hand-off has been dispatched, so the gesture is still
 * live for the browser's popup blocker and the download is already in flight.
 */
export function openSmartlink(now = Date.now()): boolean {
  if (!smartlinkAllowed(now)) return false;
  // A blocked popup is not an open: recording the stamp there would burn the
  // visitor's allowance without ever showing them the page.
  if (!openFreshTab(nextSmartlinkUrl(now))) return false;
  writeStamps([...readStamps(now), now]);
  return true;
}

/**
 * Record that a labelled partner unit was clicked, for rotation parity.
 *
 * Explicit partner/in-content/sticky clicks are never capped — the visitor
 * pressed a button that says "Partner" — so this does not consult the cap and
 * never prevents the navigation. A plain anchor still performs the tab open,
 * which is immune to popup blockers and in-app browsers that suppress
 * `window.open`.
 */
export function notePartnerClick(url: string, now = Date.now()): void {
  if (!url) return;
  writeStamps([...readStamps(now), now]);
}
