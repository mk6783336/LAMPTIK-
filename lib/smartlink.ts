import { trackEvent } from "@/lib/analytics";
import { directLinkUrl, smartlinkUrl } from "@/lib/monetization";

/**
 * One sponsored tab per browser session, opened only after a file hand-off.
 *
 * Order is the whole safety argument: every caller runs this *after* the
 * attachment frame has been appended (or the direct anchor clicked), so the
 * transfer is already moving in Chrome's download manager. Nothing here can
 * delay the file, and nothing opens before the visitor has received anything.
 *
 * What it deliberately does not do:
 *
 * - It never runs on page load, on hover, or on the resolve click. A download
 *   is the only trigger, because that is the only moment the visitor has
 *   already been served.
 * - It never opens twice in a session. `sessionStorage` survives the SPA
 *   navigation between platform pages; a module flag covers browsers where
 *   storage is blocked, so a private-mode visitor cannot get a tab per click.
 * - A blocked pop-up clears the claim, so the next real download may try once
 *   more instead of the session silently losing its only attempt.
 *
 * Risk this file cannot engineer away: auto-opened sponsorship tabs are the
 * pattern ad networks classify as forced traffic, and a network that decides
 * this is abuse terminates the account rather than paying more. The cap above
 * keeps it to one tab per session, which is the least aggressive form.
 */

const SESSION_KEY = "lt_sl_fired";

/** Storage-blocked fallback; resets on a full page load, like the session key. */
let firedThisPage = false;

/** The partner destination: explicit Smartlink first, Direct Link as fallback. */
export function smartlinkTarget(): string {
  return smartlinkUrl || directLinkUrl;
}

/**
 * Open the sponsor tab once per session. Returns true when a tab was opened.
 *
 * `noopener,noreferrer` matters here: the partner page must not get a handle
 * on our window, and it must not learn where the visitor came from.
 */
export function openSmartlinkOnce(source: "download" | "download-direct"): boolean {
  if (typeof window === "undefined") return false;

  const target = smartlinkTarget();
  if (!target) return false;

  if (firedThisPage) return false;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return false;
  } catch {
    // Storage unavailable: the module flag above is the only guard left.
  }

  firedThisPage = true;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode: the module flag still prevents a second tab this pageview.
  }

  let opened: Window | null = null;
  try {
    opened = window.open(target, "_blank", "noopener,noreferrer");
  } catch {
    opened = null;
  }

  if (!opened) {
    // Pop-up blocked (or the partner URL is malformed) — release the claim so
    // the visitor's next download can still monetize the session once.
    firedThisPage = false;
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clean up.
    }
    return false;
  }

  // Reported after the fact: an event that describes what happened, never a
  // gate in front of it.
  trackEvent("smartlink_open", { source });
  return true;
}
