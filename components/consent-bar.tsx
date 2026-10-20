"use client";

import { useEffect, useState } from "react";

import {
  readConsent,
  writeConsent,
  type ConsentDecision,
} from "@/components/consent-mode";

/**
 * First-visit consent bar. Keeps every visitor in Consent Mode "denied"
 * until they explicitly choose; stores the decision locally and never
 * blocks the page. Styling follows the design system (hairline panel).
 */
export function ConsentBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent()) return;
    // Defer so the page paints before the bar rises.
    const timer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  function decide(decision: ConsentDecision) {
    writeConsent(decision);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Privacy choices"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm sm:inset-x-auto sm:bottom-5 sm:right-5"
    >
      <div className="panel animate-rise p-3.5">
        <p className="text-[12px] leading-relaxed text-[var(--text-2)]">
          <span className="micro mr-1.5 text-[9px] text-[var(--text-3)]">Privacy</span>
          Ads here are served by Adsterra and Monetag. Accept to allow
          cookie-based personalisation; decline for contextual only. Stored on
          this device.{" "}
          <a
            href="/privacy"
            className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-2"
          >
            Policy
          </a>
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => decide("granted")}
            className="btn btn-primary h-8 flex-1 px-3 text-[12px] font-semibold"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => decide("denied")}
            className="btn btn-ghost h-8 flex-1 px-3 text-[12px]"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
