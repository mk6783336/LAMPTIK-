"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";

import { signalAdIntent } from "@/lib/ad-intent";

/**
 * Creator Rewards + brand-deal estimator.
 *
 * The arithmetic is deliberately conservative and visible: TikTok publishes no
 * rate card, so the page shows a LOW–HIGH band built from creator-reported
 * RPMs, and it discounts raw plays to "qualified views" before applying them.
 * Every constant is named so the page can explain itself; nothing is fetched
 * and no number leaves the browser.
 */

interface Country {
  id: string;
  label: string;
  /** Creator-reported RPM band, USD per 1,000 qualified views. */
  rpm: readonly [number, number];
}

const COUNTRIES: readonly Country[] = [
  { id: "us", label: "United States", rpm: [0.9, 1.8] },
  { id: "uk", label: "United Kingdom", rpm: [0.7, 1.4] },
  { id: "de", label: "Germany", rpm: [0.6, 1.2] },
  { id: "fr", label: "France", rpm: [0.5, 1.0] },
  { id: "ca", label: "Canada", rpm: [0.6, 1.3] },
  { id: "au", label: "Australia", rpm: [0.6, 1.2] },
  { id: "sa", label: "Saudi Arabia", rpm: [0.3, 0.7] },
  { id: "global", label: "Global / mixed", rpm: [0.2, 0.6] },
];

interface Niche {
  id: string;
  label: string;
  /** How much more (or less) this niche's audience is worth to a brand. */
  multiplier: number;
}

const NICHES: readonly Niche[] = [
  { id: "finance", label: "Finance & business", multiplier: 1.5 },
  { id: "tech", label: "Tech & software", multiplier: 1.3 },
  { id: "lifestyle", label: "Lifestyle & beauty", multiplier: 1.05 },
  { id: "gaming", label: "Gaming", multiplier: 0.9 },
  { id: "entertainment", label: "Entertainment & comedy", multiplier: 0.8 },
];

/** Share of plays that survive TikTok's qualified-view rules, before engagement. */
const BASE_QUALIFICATION = 0.55;
/** Each point of engagement rate adds this much qualification, capped at 20%. */
const ENGAGEMENT_WEIGHT = 0.01;
/** Brand deals are priced per 1,000 views, not per qualified view. */
const BRAND_CPM: readonly [number, number] = [8, 18];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function qualificationRate(engagement: number): number {
  const clamped = Math.min(Math.max(engagement, 0), 20);
  return Math.min(BASE_QUALIFICATION + clamped * ENGAGEMENT_WEIGHT, 0.95);
}

export function MoneyCalculator() {
  const [views, setViews] = useState(250_000);
  const [countryId, setCountryId] = useState("us");
  const [nicheId, setNicheId] = useState("finance");
  const [engagement, setEngagement] = useState(6);
  const [target, setTarget] = useState(1_000);

  const result = useMemo(() => {
    const country = COUNTRIES.find((entry) => entry.id === countryId) ?? COUNTRIES[0];
    const niche = NICHES.find((entry) => entry.id === nicheId) ?? NICHES[0];
    const safeViews = Number.isFinite(views) && views > 0 ? views : 0;
    const rate = qualificationRate(engagement);
    const qualified = safeViews * rate;
    const payout = (rpm: number) => (qualified / 1_000) * rpm * niche.multiplier;
    const brand = (cpm: number) => (safeViews / 1_000) * cpm * niche.multiplier;
    const midRpm = (country.rpm[0] + country.rpm[1]) / 2;
    const monthlyViewsForTarget =
      midRpm > 0 && rate > 0
        ? (target / (midRpm * niche.multiplier)) * 1_000 / rate
        : 0;
    return {
      country,
      niche,
      rate,
      qualified,
      low: payout(country.rpm[0]),
      high: payout(country.rpm[1]),
      brandLow: brand(BRAND_CPM[0]),
      brandHigh: brand(BRAND_CPM[1]),
      monthlyViewsForTarget,
      targetSafe: Number.isFinite(target) && target > 0 ? target : 0,
    };
  }, [views, countryId, nicheId, engagement, target]);

  return (
    <div
      className="panel p-4 sm:p-5"
      // Any edit is engagement: the visitor is modelling their own numbers, not
      // looking at a landing page. This is the arm the push networks wait for
      // (see lib/ad-intent.ts).
      onChange={() => signalAdIntent("calculator-input")}
    >
      <div className="flex items-center gap-2">
        <Calculator aria-hidden="true" className="size-4 text-[var(--accent-text)]" />
        <p className="text-sm font-semibold tracking-tight">Earnings estimator</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="micro text-xs text-[var(--text-3)]">Views on the video</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={views}
            onChange={(event) => setViews(Number(event.target.value))}
            className="mt-1.5 h-11 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <span className="micro text-xs text-[var(--text-3)]">Audience country</span>
          <select
            value={countryId}
            onChange={(event) => setCountryId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {COUNTRIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="micro text-xs text-[var(--text-3)]">Niche</span>
          <select
            value={nicheId}
            onChange={(event) => setNicheId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {NICHES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="micro text-xs text-[var(--text-3)]">
            Engagement rate · {engagement}%
          </span>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={engagement}
            onChange={(event) => setEngagement(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--accent)]"
          />
        </label>
      </div>

      <div aria-live="polite" className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
          <p className="micro text-xs text-[var(--text-3)]">Qualified views</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            {compact.format(Math.round(result.qualified))}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">
            {Math.round(result.rate * 100)}% of plays
          </p>
        </div>
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
          <p className="micro text-xs text-[var(--text-3)]">Creator Rewards</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--accent-text)]">
            {usd.format(result.low)} – {usd.format(result.high)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">
            {result.country.label} · {result.niche.label.split(" ")[0]}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
          <p className="micro text-xs text-[var(--text-3)]">One sponsored post</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            {usd.format(result.brandLow)} – {usd.format(result.brandHigh)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">Same view count</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
        <div className="flex items-center gap-2">
          <TrendingUp aria-hidden="true" className="size-4 text-[var(--accent-text)]" />
          <p className="text-sm font-semibold tracking-tight">Reverse: what $ buys</p>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="micro text-xs text-[var(--text-3)]">Monthly target</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={target}
              onChange={(event) => setTarget(Number(event.target.value))}
              className="mt-1.5 h-11 w-36 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <p className="pretty pb-2 text-sm leading-relaxed text-[var(--text-2)]">
            needs about{" "}
            <span className="font-semibold text-[var(--text)]">
              {compact.format(Math.round(result.monthlyViewsForTarget))}
            </span>{" "}
            views a month at this RPM.
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--text-3)]">
        Estimates only. TikTok publishes no RPM; these bands come from creator-reported
        earnings and move with watch time, audience country and the month&apos;s pool.
      </p>
    </div>
  );
}
