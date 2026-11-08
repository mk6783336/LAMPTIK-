"use client";

import { useEffect } from "react";

import { signalAdIntent } from "@/lib/ad-intent";

/**
 * Scroll-depth engagement arm for the long-form pages (guides, /tools).
 *
 * Nobody downloads from a guide, so there is no `a[download]` click to catch.
 * Reading a third of the article after four seconds is the honest equivalent of
 * "this visitor got what they came for" — and only then are the push networks
 * armed. Both conditions are required: a fast scroll to a footer link is not
 * reading, and four seconds at the top of the page is not either.
 *
 * Renders nothing, so it adds no layout and no CLS.
 */
const SCROLL_RATIO = 0.35;
const MIN_DWELL_MS = 4_000;

export function EngagementIntent() {
  useEffect(() => {
    let done = false;
    const startedAt = Date.now();

    const check = () => {
      if (done) return;
      if (Date.now() - startedAt < MIN_DWELL_MS) return;
      const total = document.documentElement.scrollHeight;
      if (total <= 0) return;
      const seen = window.scrollY + window.innerHeight;
      if (seen / total < SCROLL_RATIO) return;
      done = true;
      window.removeEventListener("scroll", check);
      signalAdIntent("scroll-depth");
    };

    window.addEventListener("scroll", check, { passive: true });
    const timer = window.setTimeout(check, MIN_DWELL_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", check);
    };
  }, []);

  return null;
}
