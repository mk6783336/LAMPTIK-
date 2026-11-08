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
      // Progress is measured against what can actually scroll, so a page that
      // barely overflows a tall viewport does not read as "35% read" while
      // sitting at the top. The first version divided by the full document
      // height and armed a guide on dwell alone — measured `armed: true` with
      // `scrollY === 0` before any scroll happened.
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable < SCROLL_RATIO) return;
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
