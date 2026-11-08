#!/usr/bin/env node
/**
 * Did switching the push zones off help? — GA4 before/after, honestly labelled.
 *
 *   node scripts/push-zone-impact.mjs            # default: 7-day baseline
 *   node scripts/push-zone-impact.mjs --days=14 --lag=2
 *
 * Why a script and not a one-off query: the switch has a single date, the
 * baseline stops existing once GA4 rolls its retention window, and the answer
 * is only meaningful with the sample size printed beside it.
 *
 * What it measures, and what it cannot:
 *
 *   - Sessions, engaged sessions, engagement rate, bounce rate, average
 *     session duration, and `download_start` per session — the funnel the push
 *     cards could plausibly have damaged (a fake OS notification over the tool
 *     interrupts the resolve, and a visitor who bounces never downloads).
 *   - NOT revenue. GA4 carries no ad revenue for this site: the impressions are
 *     billed inside Monetag and Adsterra, whose dashboards are the only source.
 *     A revenue claim from this data would be invented.
 *
 * The switch day itself is excluded from BOTH windows — the cards served for
 * most of it, so a mixed day belongs to neither arm.
 *
 * Auth: the same service account as `scripts/gsc-check.mjs` and
 * `scripts/ads-health.mjs` (`.scratch/ga4-key.json`, or
 * `GA4_SERVICE_ACCOUNT_FILE`). Viewer access on the GA4 property is enough.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((entry) => entry.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

/** The deploy that removed both tags. Override with `--switch=YYYY-MM-DD`. */
const SWITCH = arg("switch", "2026-11-08");
const DAYS = Math.max(3, Math.min(56, Number(arg("days", "7")) || 7));
/** GA4 finalises a day up to ~48h late; the newest complete day is today-lag. */
const LAG = Math.max(0, Math.min(7, Number(arg("lag", "2")) || 0));
const PROPERTY = (process.env.GA4_PROPERTY_ID || "561275135")
  .trim()
  .replace(/^properties\//, "");
const KEY_PATH = process.env.GA4_SERVICE_ACCOUNT_FILE || ".scratch/ga4-key.json";
const METRICS = [
  "sessions",
  "totalUsers",
  "engagedSessions",
  "engagementRate",
  "bounceRate",
  "averageSessionDuration",
];

const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};
const midnight = () => {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
};
const span = (start, end) => Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

/* ------------------------------- windows ------------------------------- */

const switchDate = new Date(`${SWITCH}T00:00:00Z`);
if (Number.isNaN(switchDate.getTime())) {
  throw new Error(`--switch must be YYYY-MM-DD, got "${SWITCH}"`);
}

const beforeEnd = addDays(switchDate, -1);
const before = { startDate: iso(addDays(beforeEnd, -(DAYS - 1))), endDate: iso(beforeEnd) };
const afterStart = addDays(switchDate, 1);
const afterEnd = addDays(midnight(), -LAG);
const afterDays = span(afterStart, afterEnd);
const after = afterDays > 0 ? { startDate: iso(afterStart), endDate: iso(afterEnd) } : null;

/* --------------------------------- auth -------------------------------- */

const b64 = (value) => Buffer.from(value).toString("base64url");

async function token() {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256")
    .update(`${head}.${body}`)
    .sign(key.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${body}.${signature}`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || `token HTTP ${response.status}`);
  }
  return { access: data.access_token, email: key.client_email };
}

async function report(body, auth) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${auth.access}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  return data;
}

async function totals(range, auth) {
  const data = await report({ dateRanges: [range], metrics: METRICS.map((name) => ({ name })) }, auth);
  const row = data?.rows?.[0];
  if (!row) return null;
  return Object.fromEntries(
    METRICS.map((name, index) => [name, Number(row.metricValues[index]?.value ?? 0)]),
  );
}

async function eventCount(range, eventName, auth) {
  const data = await report(
    {
      dateRanges: [range],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: eventName, matchType: "EXACT" } },
      },
    },
    auth,
  );
  return Number(data?.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

/* -------------------------------- report ------------------------------- */

const fmt = (metric, value) =>
  metric.endsWith("Rate")
    ? `${(value * 100).toFixed(1)}%`
    : metric === "averageSessionDuration"
      ? `${Math.round(value)}s`
      : value.toFixed(1);

function sampleSize(bounceRate, absoluteChange = 0.1) {
  // Two-proportion test, alpha 0.05 two-sided, power 0.80 (z 1.96 / 0.84).
  const p = Math.min(0.95, Math.max(0.05, bounceRate));
  return Math.ceil((2 * (1.96 + 0.84) ** 2 * p * (1 - p)) / absoluteChange ** 2);
}

async function main() {
  const auth = await token();
  const [beforeTotals, afterTotals] = await Promise.all([
    totals(before, auth),
    after ? totals(after, auth) : Promise.resolve(null),
  ]);
  const [downloadsBefore, downloadsAfter] = await Promise.all([
    eventCount(before, "download_start", auth),
    after ? eventCount(after, "download_start", auth) : Promise.resolve(0),
  ]);

  console.log(`GA4 ${PROPERTY} · ${auth.email}`);
  console.log(
    `switch ${SWITCH} · baseline ${DAYS}d ${before.startDate}..${before.endDate}` +
      (after ? ` · after ${afterDays}d ${after.startDate}..${after.endDate}` : " · after: no complete day"),
  );
  console.log("");

  if (!beforeTotals) {
    console.log("No baseline rows — GA4 has no sessions in that window.");
    return;
  }

  const perDay = (total, days) => (total === null ? null : total / days);
  console.log(
    "metric".padEnd(22),
    "before/day".padStart(11),
    "after/day".padStart(11),
    "delta".padStart(8),
  );
  for (const metric of METRICS) {
    const base = perDay(beforeTotals[metric], DAYS);
    const next = afterTotals ? perDay(afterTotals[metric], afterDays) : null;
    const delta = next === null || base === 0 ? "—" : `${(((next - base) / base) * 100).toFixed(0)}%`;
    console.log(
      metric.padEnd(22),
      fmt(metric, base).padStart(11),
      (next === null ? "—" : fmt(metric, next)).padStart(11),
      delta.padStart(8),
    );
  }

  const perSession = (count, sessions) => (sessions > 0 ? (count / sessions).toFixed(2) : "—");
  console.log("");
  console.log(
    `download_start/session  before ${perSession(downloadsBefore, beforeTotals.sessions)}` +
      (afterTotals ? ` · after ${perSession(downloadsAfter, afterTotals.sessions)}` : " · after —"),
  );
  console.log(
    `sessions/day            before ${(beforeTotals.sessions / DAYS).toFixed(1)}` +
      (afterTotals ? ` · after ${(afterTotals.sessions / afterDays).toFixed(1)}` : " · after —"),
  );

  const needed = sampleSize(beforeTotals.bounceRate);
  console.log("");
  console.log(`sample needed for a 10-point bounce change: ~${needed} sessions per window.`);
  if (!afterTotals) {
    console.log(`VERDICT: not measurable yet — 0 complete post-switch days (GA4 lag ${LAG}d).`);
  } else if ((afterTotals.sessions ?? 0) < needed || beforeTotals.sessions < needed) {
    console.log(
      `VERDICT: underpowered — ${Math.round(afterTotals.sessions)} vs ` +
        `${Math.round(beforeTotals.sessions)} sessions on a ~${needed}-per-window requirement. ` +
        "Any delta above is noise.",
    );
  } else {
    console.log("VERDICT: windows meet the sample requirement — the delta is worth acting on.");
  }
  console.log("");
  console.log("Ad revenue is NOT in GA4: check Monetag and Adsterra dashboards for the money half.");
}

main().catch((error) => {
  console.error(`push-zone-impact failed: ${error.message}`);
  process.exitCode = 1;
});
