#!/usr/bin/env node
/**
 * Google Search Console coverage + traffic report.
 *
 * Runs beside `scripts/index-check.mjs` in the weekly Index Check workflow so
 * Google and Bing land in the same run Summary instead of two different tools.
 *
 * Two read-only Google APIs:
 *
 *   1. **URL Inspection** — the indexing verdict for every sitemap URL:
 *      PASS / PARTIAL / FAIL / NEUTRAL plus Google's own `coverageState`
 *      ("Submitted and indexed", "Crawled - currently not indexed", …). This is
 *      the Google mirror of what the Bing Webmaster API gives us, and the only
 *      API that explains *why* a page is absent rather than just that it is.
 *   2. **Search Analytics** — clicks, impressions, CTR and average position for
 *      the last 28 days against the 28 before. Clicks are the number that pays,
 *      so it belongs in the same weekly report as the coverage counts.
 *
 * Auth is a service-account JWT (RS256, signed with node:crypto — no SDK, no
 * extra dependency). The service account's client email must be added as a user
 * on the Search Console property before the API can see it; a property the
 * account was never granted answers 403, not an empty list.
 *
 * Without `GSC_SERVICE_ACCOUNT_JSON` the script reports that it is unconfigured,
 * writes that to the summary, and exits 0. An optional integration that was
 * never set up must not turn a scheduled job red.
 *
 * Exit codes: 0 = report produced (including "not configured"), 1 = the script
 * itself failed.
 */

import { appendFile, readFile, writeFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import { pathToFileURL } from "node:url";

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const HOST = new URL(ORIGIN).host;
/** Registrable name, used to match a domain property whatever its form. */
const APEX = HOST.replace(/^www\./, "");
const PROPERTY_ENV = (process.env.GSC_PROPERTY ?? "").trim();
const STATE_PATH = process.env.GSC_STATE ?? ".gsc-check-state.json";
const HISTORY_LIMIT = 26; // ~6 months of weekly runs

/**
 * URL Inspection allows 2000 queries/day per property, so the whole sitemap
 * fits comfortably; the caps exist so a much larger site cannot stall the job
 * past its workflow timeout.
 */
const URL_LIMIT = Number(process.env.GSC_URL_LIMIT ?? 60);
const API_BUDGET_MS = Number(process.env.GSC_API_BUDGET_MS ?? 240_000);
const PACE_MS = Number(process.env.GSC_PACE_MS ?? 400);
const MAX_RETRIES = 2;

const SKIP_IF_UNCONFIGURED = process.argv.includes("--skip-if-unconfigured");
const KEY_RAW = (process.env.GSC_SERVICE_ACCOUNT_JSON ?? "").trim();

const log = (message) => console.log(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base64url = (value) => Buffer.from(value).toString("base64url");

/** `YYYY-MM-DD` for N days ago, UTC. */
function shiftDate(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Search Console finalises data 2–3 days behind today; asking for yesterday
 * returns a partial day and makes every comparison look like a drop.
 */
const CURRENT = { startDate: shiftDate(30), endDate: shiftDate(3) };
const PREVIOUS = { startDate: shiftDate(58), endDate: shiftDate(31) };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Accepts the service-account JSON either raw or base64-encoded. GitHub secrets
 * preserve newlines, but base64 is what most people end up with after copying a
 * key out of a JSON file, so both are supported rather than rejected.
 */
function parseCredentials(raw) {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("GSC_SERVICE_ACCOUNT_JSON is neither JSON nor base64-encoded JSON");
  }
  if (!json.client_email || !json.private_key) {
    throw new Error("service account JSON is missing client_email or private_key");
  }
  return { email: json.client_email, key: json.private_key, project: json.project_id ?? "(unknown)" };
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: credentials.email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64url(
    createSign("RSA-SHA256").update(`${header}.${claims}`).sign(credentials.key),
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    const reason = data?.error_description ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(`token exchange failed: ${reason}`);
  }
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Google API plumbing
// ---------------------------------------------------------------------------

async function googleFetch(url, token, { method = "GET", body } = {}) {
  const headers = { authorization: `Bearer ${token}` };
  if (body) headers["content-type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data ?? {};
}

/**
 * Resolves which property to query. A domain property (`sc-domain:example.com`)
 * and a URL-prefix property (`https://www.example.com/`) hold different data and
 * the API rejects URLs outside the one you name, so the choice has to come from
 * what the account can actually see rather than a hard-coded default.
 */
function pickProperty(sites) {
  const candidates = [
    PROPERTY_ENV,
    `sc-domain:${APEX}`,
    `https://${HOST}/`,
    `http://${HOST}/`,
    `https://${APEX}/`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const match = sites.find((site) => site.siteUrl === candidate);
    if (match) return match;
  }
  return sites.find((site) => site.siteUrl.includes(APEX)) ?? null;
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

const locPattern = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

async function fetchSitemapUrls() {
  const seen = new Set();
  const queue = [`${ORIGIN}/sitemap.xml`];

  while (queue.length > 0 && seen.size < 2000) {
    const url = queue.shift();
    let body = "";
    try {
      const response = await fetch(url, {
        headers: { "user-agent": `${APEX} index reporter`, accept: "application/xml,text/xml,*/*" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return { urls: [], error: `sitemap HTTP ${response.status}` };
      body = await response.text();
    } catch (error) {
      return { urls: [], error: error instanceof Error ? error.message : String(error) };
    }

    const locs = [...body.matchAll(locPattern)].map((match) => match[1]);
    // A sitemap index lists child sitemaps instead of pages; follow them one
    // level deep, which covers every layout this site (and most sites) use.
    const isIndex = /<sitemapindex[\s>]/i.test(body);
    if (isIndex) {
      queue.push(...locs.slice(0, 20));
      continue;
    }
    for (const loc of locs) seen.add(loc);
  }

  return { urls: [...seen], error: null };
}

// ---------------------------------------------------------------------------
// URL Inspection
// ---------------------------------------------------------------------------

const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/**
 * Google returns `coverageState` prose rather than a stable enum, so the verdict
 * (PASS/PARTIAL/FAIL/NEUTRAL) drives the counts and the prose is kept for the
 * breakdown. Verdict semantics: PASS = indexed, PARTIAL = indexed with an issue,
 * FAIL = known to Google but excluded, NEUTRAL = no information ("unknown to
 * Google" is NEUTRAL, not FAIL).
 */
async function inspectUrls(token, property, urls) {
  const started = Date.now();
  const byVerdict = { PASS: [], PARTIAL: [], FAIL: [], NEUTRAL: [] };
  const coverage = new Map();
  const rows = [];
  let unchecked = 0;
  let stoppedEarly = null;
  let firstError = null;

  for (const [index, url] of urls.entries()) {
    if (index >= URL_LIMIT) {
      stoppedEarly = `stopped after ${URL_LIMIT} URLs (GSC_URL_LIMIT)`;
      break;
    }
    if (Date.now() - started > API_BUDGET_MS) {
      stoppedEarly = `stopped after ${index} URLs (time budget)`;
      break;
    }
    if (index > 0) await sleep(PACE_MS);

    let attempt = 0;
    for (;;) {
      try {
        const data = await googleFetch(INSPECT_ENDPOINT, token, {
          method: "POST",
          body: { inspectionUrl: url, siteUrl: property, languageCode: "en-US" },
        });
        const result = data?.inspectionResult?.indexStatusResult ?? {};
        const verdict = result.verdict ?? "NEUTRAL";
        const state = result.coverageState ?? "Unknown";
        byVerdict[verdict] = byVerdict[verdict] ?? [];
        byVerdict[verdict].push(url);
        coverage.set(state, (coverage.get(state) ?? 0) + 1);
        rows.push({ url, verdict, state, lastCrawl: result.lastCrawlTime ?? null });
        break;
      } catch (error) {
        const retryable = error.status === 429 || error.status === 403 || error.status >= 500;
        if (retryable && attempt < MAX_RETRIES) {
          attempt += 1;
          await sleep(2_000 * attempt);
          continue;
        }
        // A single page the API refuses is unknown, not missing; only a run of
        // failures is worth aborting over.
        firstError ??= error.message;
        unchecked += 1;
        break;
      }
    }
  }

  return {
    property,
    checked: rows.length,
    total: urls.length,
    byVerdict,
    coverage,
    rows,
    unchecked,
    stoppedEarly,
    firstError,
  };
}

// ---------------------------------------------------------------------------
// Search Analytics
// ---------------------------------------------------------------------------

const ANALYTICS_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";

async function searchAnalytics(token, property, range, dimensions, rowLimit) {
  const url = `${ANALYTICS_ENDPOINT}/${encodeURIComponent(property)}/searchAnalytics/query`;
  const data = await googleFetch(url, token, {
    method: "POST",
    body: { ...range, dimensions, rowLimit, dataState: "final" },
  });
  return data.rows ?? [];
}

/** A totals query is the same call with no dimensions — one aggregate row. */
async function trafficTotals(token, property, range) {
  const rows = await searchAnalytics(token, property, range, [], 1);
  const row = rows[0] ?? {};
  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? null,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function delta(next, previous, { percent = false } = {}) {
  if (previous === null || previous === undefined || next === null || next === undefined) return "—";
  const diff = next - previous;
  if (!percent) return diff === 0 ? "no change" : `${diff > 0 ? "+" : ""}${diff}`;
  if (previous === 0) return diff === 0 ? "no change" : "new";
  return `${diff > 0 ? "+" : ""}${((diff / previous) * 100).toFixed(0)}%`;
}

const formatInt = (value) => (value === null || value === undefined ? "—" : value.toLocaleString("en-US"));

function buildSummary({ property, coverage, traffic, pages, previous, skipped, error }) {
  const lines = ["", "### Google Search Console", ""];

  if (skipped) {
    lines.push(
      "> [!NOTE]",
      `> ${skipped}`,
      "> Set the `GSC_SERVICE_ACCOUNT_JSON` secret to enable it; see `docs/google-search-console-setup.md`.",
      "",
    );
    return lines.join("\n");
  }

  if (error) {
    lines.push("> [!WARNING]", `> Google Search Console was configured but failed: ${error}`, "");
    if (!coverage) return lines.join("\n");
  }

  if (coverage) {
    const pass = coverage.byVerdict.PASS?.length ?? 0;
    const partial = coverage.byVerdict.PARTIAL?.length ?? 0;
    const fail = coverage.byVerdict.FAIL?.length ?? 0;
    const neutral = coverage.byVerdict.NEUTRAL?.length ?? 0;

    lines.push(
      `Property \`${property}\` — inspected **${coverage.checked}** of ${coverage.total} sitemap URLs.`,
      "",
      "| Verdict | URLs | Change |",
      "| --- | --- | --- |",
      `| Indexed (\`PASS\`) | **${pass}** | ${delta(pass, previous?.pass)} |`,
      `| Indexed with issues (\`PARTIAL\`) | ${partial} | ${delta(partial, previous?.partial)} |`,
      `| Known but excluded (\`FAIL\`) | ${fail} | ${delta(fail, previous?.fail)} |`,
      `| No information (\`NEUTRAL\`) | ${neutral} | ${delta(neutral, previous?.neutral)} |`,
      `| Not inspected | ${coverage.unchecked} | — |`,
      "",
    );

    if (coverage.coverage.size > 0) {
      lines.push("| Coverage state | URLs |", "| --- | --- |");
      for (const [state, count] of [...coverage.coverage].sort((a, b) => b[1] - a[1])) {
        lines.push(`| ${state} | ${count} |`);
      }
      lines.push("");
    }

    const excluded = [
      ...(coverage.byVerdict.FAIL ?? []),
      ...(coverage.byVerdict.NEUTRAL ?? []),
    ];
    if (excluded.length > 0) {
      lines.push(
        `<details><summary>${excluded.length} URL(s) Google has not indexed</summary>`,
        "",
      );
      for (const row of coverage.rows) {
        if (row.verdict === "PASS" || row.verdict === "PARTIAL") continue;
        const crawled = row.lastCrawl ? `last crawl ${row.lastCrawl.slice(0, 10)}` : "never crawled";
        lines.push(`- \`${row.verdict}\` — ${row.url} — ${row.state} (${crawled})`);
      }
      lines.push("", "</details>", "");
    }

    if (coverage.stoppedEarly) lines.push(`> Partial result: ${coverage.stoppedEarly}.`, "");
    if (coverage.unchecked > 0) {
      lines.push(
        "> [!NOTE]",
        `> ${coverage.unchecked} inspection(s) failed and are excluded from every count above —`,
        `> they are unknown, not missing.${coverage.firstError ? ` First error: ${coverage.firstError}` : ""}`,
        "",
      );
    }
  }

  if (traffic) {
    lines.push(
      "#### Search performance",
      "",
      `\`${CURRENT.startDate}\` → \`${CURRENT.endDate}\` vs the 28 days before.`,
      "",
      "| Metric | Last 28 days | Previous 28 | Change |",
      "| --- | --- | --- | --- |",
      `| Clicks | **${formatInt(traffic.current.clicks)}** | ${formatInt(traffic.previous.clicks)} | ${delta(traffic.current.clicks, traffic.previous.clicks, { percent: true })} |`,
      `| Impressions | ${formatInt(traffic.current.impressions)} | ${formatInt(traffic.previous.impressions)} | ${delta(traffic.current.impressions, traffic.previous.impressions, { percent: true })} |`,
      `| CTR | ${(traffic.current.ctr * 100).toFixed(2)}% | ${(traffic.previous.ctr * 100).toFixed(2)}% | ${delta(traffic.current.ctr * 100, traffic.previous.ctr * 100)}pt |`,
      `| Average position | ${traffic.current.position === null ? "—" : traffic.current.position.toFixed(1)} | ${traffic.previous.position === null ? "—" : traffic.previous.position.toFixed(1)} | — |`,
      "",
    );

    if (traffic.current.clicks === 0) {
      lines.push(
        "> [!IMPORTANT]",
        "> Zero clicks is coverage, not ranking: pages Google has not indexed cannot earn an impression.",
        "> The coverage table above is the lever until `PASS` covers most of the sitemap.",
        "",
      );
    }

    if (pages.length > 0) {
      lines.push(
        `<details><summary>${pages.length} page(s) with impressions</summary>`,
        "",
        "| Clicks | Impressions | Position | Page |",
        "| --- | --- | --- | --- |",
        ...pages.map(
          (page) =>
            `| ${formatInt(page.clicks)} | ${formatInt(page.impressions)} | ${(page.position ?? 0).toFixed(1)} | ${page.keys?.[0] ?? "—"} |`,
        ),
        "",
        "</details>",
        "",
      );
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function loadState(raw) {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.runs) ? parsed : { runs: [] };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log(`Google Search Console report for ${ORIGIN}`);

  if (!KEY_RAW) {
    const skipped =
      "Google Search Console is not configured — no `GSC_SERVICE_ACCOUNT_JSON` secret.";
    log(`${skipped}${SKIP_IF_UNCONFIGURED ? " Skipping." : ""}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `${buildSummary({ skipped })}\n`);
    }
    return;
  }

  const credentials = parseCredentials(KEY_RAW);
  log(`service account ${credentials.email} (project ${credentials.project})`);
  const token = await getAccessToken(credentials);

  let state = { runs: [] };
  try {
    state = loadState(await readFile(STATE_PATH, "utf8"));
  } catch {
    log("(no previous state — this run is the baseline)");
  }
  const previous = state.runs.at(-1) ?? null;

  const sites = (await googleFetch(`${ANALYTICS_ENDPOINT}?max-results=100`, token)).siteEntry ?? [];
  const property = pickProperty(sites);
  if (!property) {
    throw new Error(
      `the service account has access to no ${APEX} property ` +
        `(it can see ${sites.length === 0 ? "none" : sites.map((site) => site.siteUrl).join(", ")}); ` +
        `add ${credentials.email} as a user on the property in Search Console → Settings → Users and permissions`,
    );
  }
  log(`property     ${property.siteUrl} (${property.permissionLevel})`);

  const sitemap = await fetchSitemapUrls();
  if (sitemap.error) throw new Error(`could not read the sitemap: ${sitemap.error}`);
  log(`sitemap      ${sitemap.urls.length} URL(s)`);

  const coverage = await inspectUrls(token, property.siteUrl, sitemap.urls);
  log(
    `inspected    ${coverage.checked}/${coverage.total} — ` +
      `pass ${coverage.byVerdict.PASS?.length ?? 0}, partial ${coverage.byVerdict.PARTIAL?.length ?? 0}, ` +
      `fail ${coverage.byVerdict.FAIL?.length ?? 0}, neutral ${coverage.byVerdict.NEUTRAL?.length ?? 0}` +
      (coverage.unchecked > 0 ? `, ${coverage.unchecked} failed` : ""),
  );

  let traffic = null;
  let pages = [];
  let trafficError = null;
  try {
    const [current, before, topPages] = await Promise.all([
      trafficTotals(token, property.siteUrl, CURRENT),
      trafficTotals(token, property.siteUrl, PREVIOUS),
      searchAnalytics(token, property.siteUrl, CURRENT, ["page"], 25),
    ]);
    traffic = { current, previous: before };
    pages = topPages;
    log(
      `clicks       ${current.clicks} (previous 28d ${before.clicks}), ` +
        `impressions ${current.impressions}, position ${current.position?.toFixed(1) ?? "—"}`,
    );
  } catch (error) {
    trafficError = error instanceof Error ? error.message : String(error);
    log(`Search Analytics failed: ${trafficError}`);
  }

  const summary = buildSummary({
    property: property.siteUrl,
    coverage,
    traffic,
    pages,
    previous,
    error: trafficError && !traffic ? trafficError : null,
  });
  log(`\n${summary}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }

  state.runs = [
    ...state.runs,
    {
      at: new Date().toISOString(),
      property: property.siteUrl,
      // A partial sweep is a lower bound; storing it would make next week's
      // delta look like growth that did not happen.
      pass: coverage.unchecked === 0 && !coverage.stoppedEarly ? coverage.byVerdict.PASS?.length ?? 0 : null,
      partial: coverage.byVerdict.PARTIAL?.length ?? 0,
      fail: coverage.byVerdict.FAIL?.length ?? 0,
      neutral: coverage.byVerdict.NEUTRAL?.length ?? 0,
      clicks: traffic?.current.clicks ?? null,
      impressions: traffic?.current.impressions ?? null,
    },
  ].slice(-HISTORY_LIMIT);
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { buildSummary, pickProperty, parseCredentials, shiftDate };
