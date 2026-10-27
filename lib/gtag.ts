/**
 * Minimal `gtag()` bridge — the only place this codebase pushes Google
 * commands onto `dataLayer`.
 *
 * `components/consent-mode.tsx` defines the real `gtag` function in an inline
 * head script (before anything Google loads), and that function pushes the
 * `arguments` object Google's snippet uses. Calling it is therefore preferred
 * whenever it exists; the array fallback only matters if a caller fires before
 * that script has run (it is in the head, so in practice this is a guard, not
 * a path).
 *
 * This replaces an object-shaped `{ consent: "update", … }` push: gtag.js
 * reads commands positionally (`[command, action, payload]`), so the object
 * form was silently ignored and every consent upgrade was lost.
 */
type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export function gtagCommand(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag === "function") {
    w.gtag(...args);
    return;
  }
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(args);
}

/** Consent Mode v2 signals for one decision. */
export function consentSignals(granted: boolean): Record<string, "granted" | "denied"> {
  const value = granted ? "granted" : "denied";
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  };
}
