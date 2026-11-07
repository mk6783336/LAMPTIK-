#!/usr/bin/env node
/**
 * Read Microsoft Clarity's frustration signals, and say what moved since the
 * last snapshot.
 *
 * Why this exists: "did the CLS fix actually reduce dead clicks?" could only be
 * answered by opening the Clarity dashboard by hand. The dashboard needs a
 * signed-in session; the Data Export API needs only a project token, which is
 * what makes the question answerable from a terminal and from CI.
 *
 * Three constraints of that API shape this script, all of them documented:
 *
 *   1. **No backfill.** `numOfDays` accepts 1, 2 or 3 — the last 24, 48 or 72
 *      hours, nothing older. A trend therefore only exists if you snapshot
 *      repeatedly, so the script stores each run in `.clarity-check-state.json`
 *      and prints the delta against the previous one.
 *   2. **Ten requests per project per day.** The script makes two: one broken
 *      down by `Device` (the mobile claim is a phone claim) and one by `URL`
 *      (which page the dead clicks are on). It reports how much of the budget
 *      it spent rather than quietly looping.
 *   3. **No Core Web Vitals.** The export exposes Traffic, Engagement Time,
 *      Scroll Depth, Dead Click Count, Excessive Scroll, Rage Click Count,
 *      Quickback Click, Script Error Count and Error Click Count — not LCP,
 *      CLS or INP. So the script looks for those metric names anyway and says
 *      plainly where they have to be read if they are absent, instead of
 *      printing a substituted number.
 *
 * Configuration: `CLARITY_API_TOKEN` in the environment, or the same token on
 * one line in `.scratch/clarity-token.txt` (git-ignored). Generate it in
 * Clarity → project → Settings → Data Export → Generate new API token; only a
 * project admin can. A token stops working when its creator loses access.
 *
 * Exit codes: 0 = reported or nothing to report, 1 = the API refused the
 * request (bad token, wrong project, daily cap). `--skip-if-unconfigured`
 * keeps a missing optional secret from failing a scheduled job, and the
 * process still exits 0 in that case with a line explaining what is missing.
 */

import { readFile, writeFile } from "node:fs/promises";

const ENDPOINT = (
  process.env.CLARITY_API_URL ?? "https://www.clarity.ms/export-data/api/v1/project-live-insights"
).trim();
const TOKEN_FILE = process.env.CLARITY_TOKEN_FILE ?? ".scratch/clarity-token.txt";
const STATE_PATH = process.env.CLARITY_STATE ?? ".clarity-check-state.json";
const SKIP_IF_UNCONFIGURED = process.argv.includes("--skip-if-unconfigured");

/** The API's own ceiling; asking for more is a 400. */
const daysFlag = process.argv.indexOf("--days");
const DAYS = Math.min(3, Math.max(1, Number(daysFlag > -1 ? process.argv[daysFlag + 1] : 3) || 3));

/**
 * `Device` answers "did phones improve"; `URL` answers "which page". Both are
 * worth one of the ten daily requests.
 */
const DIMENSIONS = ["Device", "URL"];

const CWV = /lcp|cls|inp|largest[- ]contentful|layout[- ]shift/i;

const log = (...parts) => console.log("[clarity]", ...parts);

async function readToken() {
  const fromEnv = (process.env.CLARITY_API_TOKEN ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const raw = await readFile(TOKEN_FILE, "utf8");
    const line = raw.split(/\r?\n/).map((entry) => entry.trim()).find(Boolean) ?? "";
    return line;
  } catch {
    return "";
  }
}

/**
 * The response is an array of `{ metricName, information: [ … ] }`. Every row
 * carries the dimension values plus one or more numeric fields, and the field
 * names are not documented per metric — so numeric-looking values are summed
 * and string values are kept as dimensions. If Microsoft changes the shape,
 * the raw payload is printed rather than a made-up total.
 */
function parsePayload(payload) {
  if (!Array.isArray(payload)) return null;
  const rows = [];

  for (const metric of payload) {
    if (!metric || typeof metric !== "object") continue;
    const name = String(metric.metricName ?? "").trim();
    if (!name) continue;
    const information = Array.isArray(metric.information) ? metric.information : [];

    for (const row of information) {
      if (!row || typeof row !== "object") continue;
      const dims = {};
      const values = {};

      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          values[key] = value;
          continue;
        }
        const text = String(value ?? "").trim();
        // "1,234" and "45%" are counts; "Mobile" and a URL are dimensions.
        const numeric = Number(text.replace(/[,\s%]/g, ""));
        if (text && Number.isFinite(numeric) && /^[\d.,\s%+-]+$/.test(text)) {
          values[key] = numeric;
        } else {
          dims[key] = text;
        }
      }

      if (Object.keys(values).length > 0) rows.push({ metric: name, dims, values });
    }
  }

  return rows;
}

/** Stable `metric|dimension=value|field` key for the baseline diff. */
function rowKey(row) {
  const dims = Object.entries(row.dims)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join(",");
  const fields = Object.keys(row.values).sort().join(",");
  return `${row.metric}|${dims}|${fields}`;
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDelta(current, previous) {
  if (typeof previous !== "number" || previous === 0) return "";
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change) || Math.abs(change) < 0.5) return "  (±0%)";
  return `  (${change > 0 ? "+" : ""}${change.toFixed(0)}% vs last run)`;
}

async function requestDimension(dimension) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("numOfDays", String(DAYS));
  url.searchParams.set("dimension1", dimension);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Left null: the caller prints the body so the failure is diagnosable.
  }
  return { status: response.status, ok: response.ok, payload, text };
}

const token = await readToken();

if (!token) {
  const message =
    "Microsoft Clarity Data Export is not configured — no CLARITY_API_TOKEN (or .scratch/clarity-token.txt).\n" +
    "Generate one in Clarity → project → Settings → Data Export → Generate new API token.";
  if (SKIP_IF_UNCONFIGURED) {
    log(message);
    process.exit(0);
  }
  console.error(`[clarity] ${message}`);
  process.exit(1);
}

const previous = await readState();
const previousMetrics = previous && typeof previous.metrics === "object" ? previous.metrics : {};
const nextMetrics = {};
const seenMetrics = new Set();
let sawCwv = false;
let failed = false;

for (const dimension of DIMENSIONS) {
  const result = await requestDimension(dimension);

  if (!result.ok) {
    failed = true;
    log(`${dimension}: HTTP ${result.status}`);
    log((result.text || "(empty body)").slice(0, 400));
    continue;
  }

  const rows = parsePayload(result.payload);
  if (!rows) {
    log(`${dimension}: unexpected payload shape — printing it instead of a total`);
    log(JSON.stringify(result.payload).slice(0, 800));
    continue;
  }

  console.log("");
  console.log(`## By ${dimension} (last ${DAYS * 24}h)`);

  for (const row of rows) {
    const dims = Object.entries(row.dims).map(([key, value]) => `${key}=${value}`).join(" ");
    seenMetrics.add(row.metric);
    if (CWV.test(row.metric)) sawCwv = true;

    for (const [field, value] of Object.entries(row.values)) {
      const key = `${rowKey(row)}|${field}`;
      nextMetrics[key] = value;
      log(
        `${row.metric.padEnd(24)} ${dims.padEnd(38)} ${field}=${formatValue(value)}${formatDelta(value, previousMetrics[key])}`,
      );
    }
  }
}

console.log("");
console.log(`## Metrics returned (${seenMetrics.size})`);
console.log([...seenMetrics].sort().join(", ") || "(none)");

if (!sawCwv) {
  console.log("");
  console.log(
    "Core Web Vitals are NOT part of the Data Export API — no LCP, CLS or INP metric came back.\n" +
      "Read those in the dashboard: Clarity → project → Dashboard → Core Web Vitals, or a\n" +
      "Recordings filter by 'poor' LCP/CLS. LAMP TIK now reports layout shifts of its own in\n" +
      "the browser (components/ads/AdSlot.tsx reserves one fixed box), so a CLS regression\n" +
      "here would have to come from the ad creative inside its iframe, not the page.",
  );
}

console.log("");
console.log(`[clarity] ${DIMENSIONS.length} of 10 daily export requests used.`);

if (previous && previous.capturedAt) {
  log(`compared against the snapshot captured ${previous.capturedAt}`);
} else {
  log("first snapshot — this run is the baseline, the next one gets a delta");
}

if (!failed) {
  const entries = Object.entries(nextMetrics);
  if (entries.length > 0) {
    const state = {
      capturedAt: new Date().toISOString(),
      days: DAYS,
      metrics: nextMetrics,
    };
    try {
      await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
      log(`baseline written to ${STATE_PATH}`);
    } catch (error) {
      log(`could not write ${STATE_PATH}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

process.exit(failed ? 1 : 0);
