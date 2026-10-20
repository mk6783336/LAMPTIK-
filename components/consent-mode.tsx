const CONSENT_KEY = "lamptik-consent";

/**
 * Fired on window whenever the visitor changes their decision. Ad loaders
 * listen for it so a third-party script is only ever injected *after* an
 * explicit accept — never on the initial render.
 */
export const CONSENT_EVENT = "lamptik:consent";

/**
 * Google Consent Mode v2 defaults. Runs before any Google script so ad
 * requests start in a compliant "denied" state; the on-page consent bar
 * upgrades the state to "granted" when the visitor accepts.
 *
 * Note (documented in the privacy policy): for EEA/UK personalized ads,
 * Google additionally requires a Google-certified CMP (e.g. Funding
 * Choices). This implementation keeps all visitors in the safe default and
 * never grants without an explicit action.
 */
export function ConsentModeScript() {
  const code = [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('consent','default',{",
    "ad_storage:'denied',ad_user_data:'denied',",
    "ad_personalization:'denied',analytics_storage:'denied'",
    "});",
    "window.__lamptikConsentKey=" + JSON.stringify(CONSENT_KEY) + ";",
  ].join("");

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export type ConsentDecision = "granted" | "denied";

export function readConsent(): ConsentDecision | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(decision: ConsentDecision): void {
  try {
    localStorage.setItem(CONSENT_KEY, decision);
  } catch {
    // Storage blocked: decision applies to this page view only.
  }
  pushConsent(decision);
  try {
    window.dispatchEvent(new CustomEvent<ConsentDecision>(CONSENT_EVENT, { detail: decision }));
  } catch {
    // CustomEvent unavailable: listeners simply keep their initial state.
  }
}

export function pushConsent(decision: ConsentDecision): void {
  const gtag = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (!Array.isArray(gtag)) return;
  gtag.push({
    consent: "update",
    ...(decision === "granted"
      ? {
          ad_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
        }
      : {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        }),
  });
}
