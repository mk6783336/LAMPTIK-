"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";
import { HOME_TITLE_COOKIE, isVariant } from "@/lib/experiments/home-title";

/**
 * Reports which homepage title the visitor was served.
 *
 * The variant lives in a first-party cookie that `middleware.ts` assigns before
 * the HTML is rendered, so reading it here matches the `<title>` the browser
 * actually shows. One event per pageview, module-scoped guard, because React
 * StrictMode double-invokes effects in development and a duplicated event would
 * inflate one arm of the test.
 *
 * Renders nothing: the title is the test, not the DOM.
 */
let reported = false;

function variantFromCookie(): string | undefined {
  for (const entry of document.cookie.split(";")) {
    const [name, value] = entry.trim().split("=");
    if (name === HOME_TITLE_COOKIE) return value;
  }
  return undefined;
}

export function TitleExperiment() {
  useEffect(() => {
    if (reported) return;
    reported = true;

    const value = variantFromCookie();
    trackEvent("home_title_variant", { variant: isVariant(value) ? value : "control" });
  }, []);

  return null;
}
