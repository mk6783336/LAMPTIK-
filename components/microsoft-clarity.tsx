"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { CONSENT_EVENT, readConsent } from "@/components/consent-mode";
import { clarityProjectId } from "@/lib/analytics";

/**
 * Microsoft Clarity heatmaps and session recordings — opt-in only.
 *
 * Clarity has no Consent Mode: once the tag runs it writes `_clck` / `_clsk`
 * cookies and starts recording. So unlike GA4 (which sends a cookieless ping
 * while denied) this tag is not rendered at all until the visitor has pressed
 * Accept, and it reacts to a later Accept on the same page view.
 *
 * The tag is the project's own bootstrap URL — the same `clarity.ms/tag/<id>`
 * request Microsoft's inline snippet injects — so there is no third script
 * body to keep in sync with their install instructions.
 */
export function MicrosoftClarity() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!clarityProjectId) return;
    setAllowed(readConsent() === "granted");

    function onConsent(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      setAllowed(detail === "granted");
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  if (!clarityProjectId || !allowed) return null;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      src={`https://www.clarity.ms/tag/${encodeURIComponent(clarityProjectId)}`}
    />
  );
}
