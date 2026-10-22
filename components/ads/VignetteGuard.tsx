"use client";

import { useEffect } from "react";

/**
 * Keeps full-screen ad overlays from eating the visitor's first tap.
 *
 * Why this is not a click listener: the Monetag Vignette is an
 * `position: fixed` **iframe** at `z-index: 2147483647`. A click inside that
 * iframe is dispatched in the ad's own document, so no listener on ours ever
 * sees it — the previous pointer-capture guard could only rescue same-document
 * divs, which is not what this network ships.
 *
 * What it does instead: a watchdog looks for third-party layers that are
 * fixed, near-max z-index and cover most of the viewport. Each one gets its
 * impression window (six seconds — long enough to render and be seen, short
 * enough that nobody is stuck), and is then collapsed with `display: none`
 * while staying in the DOM so vendor code cannot throw on a missing node.
 *
 * Taps made during that window still land on the ad; every tap after it lands
 * on the tool. The watchdog stops after the first minute: a vignette that
 * appears later belongs to a different pageview.
 */
const WATCH_MS = 700;
const WATCH_BUDGET_MS = 60_000;
const OVERLAY_MIN_Z = 1_000_000;
const OVERLAY_MIN_AREA_RATIO = 0.45;
/** How long a full-screen interstitial stays before it is collapsed. */
const IMPRESSION_WINDOW_MS = 6_000;

function isOverlayCandidate(style: CSSStyleDeclaration, area: number): boolean {
  if (style.position !== "fixed") return false;
  const zIndex = Number.parseInt(style.zIndex, 10);
  if (!Number.isFinite(zIndex) || zIndex < OVERLAY_MIN_Z) return false;
  return area >= window.innerWidth * window.innerHeight * OVERLAY_MIN_AREA_RATIO;
}

function collapseAfterImpression(element: HTMLElement): void {
  element.setAttribute("data-lamptik-softened", "1");
  window.setTimeout(() => {
    element.style.setProperty("display", "none", "important");
    element.style.setProperty("pointer-events", "none", "important");
    element.setAttribute("data-lamptik-collapsed", "1");
  }, IMPRESSION_WINDOW_MS);
}

function softenOverlays(): boolean {
  let softened = false;

  // Vendor overlays are appended to <body> (sometimes <html>). Scan those two
  // levels plus every iframe — enough to catch them, cheap enough to poll.
  const candidates = new Set<Element>();
  for (const child of Array.from(document.body.children)) candidates.add(child);
  for (const child of Array.from(document.documentElement.children)) candidates.add(child);
  for (const frame of Array.from(document.querySelectorAll("iframe"))) candidates.add(frame);

  for (const element of candidates) {
    if (element.hasAttribute("data-lamptik-softened")) continue;
    if (element.closest("header, nav, footer") !== null) continue;
    if (element.hasAttribute("data-lamptik-ui")) continue;
    if (element.tagName === "SCRIPT" || element.tagName === "STYLE") continue;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (!isOverlayCandidate(style, rect.width * rect.height)) continue;

    collapseAfterImpression(element as HTMLElement);
    softened = true;
  }

  return softened;
}

export function VignetteGuard() {
  useEffect(() => {
    const startedAt = performance.now();

    // First pass immediately: the vignette can paint before hydration ends.
    softenOverlays();

    const timer = window.setInterval(() => {
      if (performance.now() - startedAt > WATCH_BUDGET_MS) {
        window.clearInterval(timer);
        return;
      }
      softenOverlays();
    }, WATCH_MS);

    const clear = () => window.clearInterval(timer);
    window.addEventListener("pagehide", clear, { once: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", clear);
    };
  }, []);

  return null;
}
