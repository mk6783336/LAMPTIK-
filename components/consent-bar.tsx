"use client";

import Link from "next/link";
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
 *
 * It is server-rendered on purpose. Mounting it from an effect made it the
 * largest paint of the whole cold load: at 390px wide its paragraph covers
 * ~28,400px², twice the hero paragraph, and it only appeared when hydration
 * finished — measured 11.0s (and up to 27.8s) after navigation, which is the
 * 7.7s-19.9s LCP this page was reporting. Rendering it in the HTML means it
 * paints with the first screen, so the hero stays the LCP candidate.
 *
 * Returning visitors must not see it flash before hydration, so a tiny inline
 * script (below, parsed before this markup) flags the document and CSS hides
 * the bar. It also keeps working when storage is blocked: nothing is hidden.
 */
export function ConsentBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (readConsent()) setHidden(true);
  }, []);

  function decide(decision: ConsentDecision) {
    writeConsent(decision);
    try {
      document.documentElement.setAttribute("data-consent", "1");
    } catch {
      // Storage/attribute blocked — hiding below still applies this view.
    }
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <>
      <script
        // Runs during HTML parsing, before the panel below is painted.
        dangerouslySetInnerHTML={{
          __html:
            'try{if(localStorage.getItem("lamptik-consent"))document.documentElement.setAttribute("data-consent","1")}catch(e){}',
        }}
      />
      <div
        role="region"
        aria-label="Privacy choices"
        className="consent-bar fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm sm:inset-x-auto sm:bottom-5 sm:right-5"
      >
        <div className="panel p-2.5 sm:p-3.5">
          {/* Phones get one line so the bar stays short enough to clear the
              Download CTA on a 600px-tall viewport. */}
          <p className="text-xs leading-relaxed text-[var(--text-2)] sm:hidden">
            Ads: Adsterra, Monetag.{" "}
            <Link
              href="/privacy"
              className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-2"
            >
              Policy
            </Link>
          </p>
          <p className="hidden text-sm leading-relaxed text-[var(--text-2)] sm:block">
            <span className="micro mr-1.5 text-xs text-[var(--text-3)]">Privacy</span>
            Ads here are served by Adsterra and Monetag. Accept to allow
            cookie-based personalisation; decline for contextual only. Stored on
            this device.{" "}
            <Link
              href="/privacy"
              className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-2"
            >
              Policy
            </Link>
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => decide("granted")}
              className="btn btn-primary h-7 flex-1 px-3 text-xs font-semibold sm:h-8 sm:text-sm"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => decide("denied")}
              className="btn btn-ghost h-7 flex-1 px-3 text-xs sm:h-8 sm:text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
