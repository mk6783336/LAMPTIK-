"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

/**
 * Real-user Core Web Vitals — LCP, CLS and INP from actual visitors, sent
 * through the analytics this site already has instead of a new pipe.
 *
 * Why this exists: the CLS fix (one fixed AdSlot box) and the LCP fix
 * (third-party ad scripts gated behind the first interaction) were verified on
 * a local production build, where nothing is throttled. The only honest proof
 * is field data — and the dashboard that shows it (Clarity) lags 24–48h, needs
 * a signed-in session, and its Data Export API does not carry LCP or CLS at
 * all. These three numbers in GA4 answer the question on our own terms.
 *
 * How it reports:
 *
 *  - `useReportWebVitals` (Next's own hook, no extra dependency) forwards every
 *    web-vitals report. LCP, CLS and INP are kept; FCP, TTFB and Next's
 *    internal hydration timings are dropped — they are not what was fixed.
 *  - Values are buffered per `metric.id` and flushed once on `pagehide` /
 *    `visibilitychange → hidden`, because that is when the browser finalises
 *    them: CLS keeps accumulating while a page is open, and an LCP sent at 1s
 *    would be a lie. Each metric is therefore sent at most once per pageview,
 *    with its final value.
 *  - Nothing is sent in development, and nothing is sent when GA is not
 *    configured: `trackEvent` mirrors into `dataLayer` and gtag and returns
 *    early without measurement IDs.
 *
 * `rating` is computed here rather than read from the report: Next's metric
 * type carries `{ id, name, value, startTime, label }` — no `rating`, no
 * `delta`, no navigation type — and inventing a field that does not exist
 * would be worse than deriving it from Google's published thresholds.
 *
 * To read it: GA4 → Explore → free form, dimension `Event name = web_vitals`,
 * then break down by the `metric` parameter and `rating`. Both custom
 * parameters must be registered once under Admin → Custom definitions (event
 * scope) before they appear there; until then the event is still collected.
 */
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  // Google's Core Web Vitals thresholds (75th percentile, mobile).
  LCP: { good: 2_500, poor: 4_000 }, // ms
  INP: { good: 200, poor: 500 }, // ms
  CLS: { good: 0.1, poor: 0.25 }, // unitless
};

const REPORTED = new Set(["LCP", "CLS", "INP"]);

function rate(metric: string, value: number): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[metric];
  if (!threshold) return "needs-improvement";
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/** CLS is a ratio (0.08); LCP and INP are milliseconds. */
function reportValue(metric: string, value: number): number {
  return metric === "CLS" ? Math.round(value * 1000) / 1000 : Math.round(value);
}

export function WebVitals() {
  /** `metric.id:name` → latest value. A newer report replaces the older one. */
  const pending = useRef<Map<string, { metric: string; value: number }>>(new Map());
  /** Keys already sent, so a second hide event cannot double-count a pageview. */
  const sent = useRef<Set<string>>(new Set());

  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") return;
    if (!REPORTED.has(metric.name)) return;
    pending.current.set(`${metric.id}:${metric.name}`, {
      metric: metric.name,
      value: metric.value,
    });
  });

  useEffect(() => {
    const flush = () => {
      for (const [key, entry] of pending.current) {
        if (sent.current.has(key)) continue;
        sent.current.add(key);
        trackEvent("web_vitals", {
          metric: entry.metric,
          value: reportValue(entry.metric, entry.value),
          rating: rate(entry.metric, entry.value),
        });
      }
      pending.current.clear();
    };

    // `pagehide` covers bfcache and tab close; `visibilitychange` covers a
    // backgrounded tab that is never closed, which is the common mobile case.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
