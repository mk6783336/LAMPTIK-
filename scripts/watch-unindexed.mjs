#!/usr/bin/env node
/**
 * The locale pages Google has not indexed — watched until the verdict moves.
 *
 * `scripts/gsc-check.mjs` already inspects every sitemap URL every Monday, so
 * why a second script? Because it reports counts over 96 URLs. Five pages
 * leaving `NEUTRAL` moves `PASS` from 91 to 96 — a number nobody finds by
 * reading a table — and the per-URL detail sits collapsed in a `<details>`
 * block with no memory of what it said last week. A page that has been stuck
 * for a month looks exactly like a page that was never mentioned, and a page
 * that slipped from `NEUTRAL` to `FAIL` (de-indexed, canonical gone) looks like
 * nothing at all.
 *
 * This inspects only the URLs in `docs/unindexed-watch.json`: 5 calls instead
 * of 96, a diff against the previous run, and a GitHub issue that stays open
 * exactly as long as the list is non-empty.
 *
 * What the repository can and cannot do about it, verified 2026-11-11 on all
 * five pages:
 *   - 200, `index, follow`, self-canonical, no `X-Robots-Tag`
 *   - listed in `sitemap.xml` (96 `<loc>`) and linked from their locale root
 *   - a complete 13-member hreflang cluster (`hrefLang` in the served HTML)
 * Nothing in the codebase is holding these back, and no Google API can ask for
 * a re-crawl: `urlInspection/index:inspect` only reads. Requesting indexing is
 * a click on "Request indexing" in Search Console's URL Inspection box, one
 * URL at a time (~10/day) — `docs/google-search-console-setup.md` walks it
 * through. The only remaining question is "did the verdict change?", and that
 * is what this answers on a schedule.
 *
 * Verdict semantics (Google's, not ours): PASS = indexed, PARTIAL = indexed
 * with an issue, FAIL = known to Google but excluded, NEUTRAL = no information
 * ("URL is unknown to Google" is NEUTRAL). A watched page that becomes FAIL is
 * a regression — something that was crawlable stopped being crawlable — and it
 * fails the run so GitHub tells the owner. Pages that stay NEUTRAL do not fail
 * the run: that is the expected, already-known state, and a permanently red
 * badge is a signal nobody can act on.
 *
 * Auth is the same service account as `scripts/gsc-check.mjs`: `GSC_SERVICE_ACCOUNT_JSON`
 * (raw or base64) with `GA4_SERVICE_ACCOUNT_JSON` as the fallback, then the
 * local git-ignored key file, so the report runs by hand without pasting a key.
 *
 * Run:  npm run watch:index
 *       node scripts/watch-unindexed.mjs --skip-if-unconfigured
 *       node scripts/watch-unindexed.mjs --self-test
 * Exit: 0 = measured (whatever the verdicts) or skipped as unconfigured,
 *       1 = the measurement failed, or a watched page regressed to FAIL.
 */

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { createSign } from "node:crypto";

const WATCH_PATH = process.env.WATCH_PATH ?? "docs/unindexed-watch.json";
/** Run history. Cached by the workflow, never committed — same as `.gsc-check-state.json`. */
const STATE_PATH = process.env.WATCH_STATE ?? ".unindexed-watch-state.json";
const REPORT_PATH = process.env.WATCH_REPORT_PATH ?? "";
const KEY_FILE = process.env.GSC_KEY_FILE ?? ".scratch/ga4-key.json";
const SKIP_IF_UNCONFIGURED = process.argv.includes("--skip-if-unconfigured");
const SELF_TEST = process.argv.includes("--self-test");
const PACE_MS = Number(process.env.WATCH_PACE_MS ?? 400);
const HISTORY_LIMIT = 40;
const MAX_RETRIES = 2;

const WATCH = JSON.parse(readFileSync(WATCH_PATH, "utf8"));
const ORIGIN = (WATCH.origin ?? "https://www.lamptik.online").replace(/\/+$/, "");
const APEX = new URL(ORIGIN).host.replace(/^www\./, "");

const log = (message = "") => console.log(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base64url = (value) => Buffer.from(value).toString("base64url");

function setOutput(name, value) {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) return;
  appendFileSync(path, `${name}=${value}\n`);
}

function summary(markdown) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  appendFileSync(path, `${markdown}\n`);
}

function writeReport(markdown) {
  if (!REPORT_PATH) return;
  writeFileSync(REPORT_PATH, `${markdown}\n`, "utf8");
}

function shiftDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Diff — pure, so the self-test can prove it without a network or a key.
// ---------------------------------------------------------------------------

/**
 * Compares this run against the stored previous one.
 *
 * A page is `changed` when its verdict moved, or when Google's own prose
 * changed under a NEUTRAL verdict ("URL is unknown to Google" → "Discovered -
 * currently not indexed" is real progress even though both are NEUTRAL).
 * `regressed` is reserved for FAIL, which means something measurable broke.
 */
function diffRows(previous, rows) {
  const before = new Map((previous ?? []).map((row) => [row.path, row]));
  const changes = [];
  const regressed = [];

  for (const row of rows) {
    const prior = before.get(row.path);
    if (!prior) {
      changes.push({ path: row.path, from: "—", to: row.verdict, kind: "new" });
      continue;
    }
    if (prior.verdict !== row.verdict || prior.coverageState !== row.coverageState) {
      const kind = row.verdict === "FAIL" ? "regressed" : row.verdict === "PASS" ? "indexed" : "moved";
      changes.push({ path: row.path, from: prior.verdict, to: row.verdict, kind });
    }
    if (row.verdict === "FAIL" && prior.verdict !== "FAIL") regressed.push(row.path);
  }

  return { changes, regressed };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function renderReport({ rows, previous, previousAt, changes, regressed }) {
  const indexed = rows.filter((row) => row.verdict === "PASS").length;
  const remaining = rows.length - indexed;
  const today = new Date().toISOString().slice(0, 10);

  if (remaining === 0) {
    return [
      "## Every watched locale page is indexed",
      "",
      `All ${rows.length} pages in \`${WATCH_PATH}\` now answer \`PASS\` to the URL Inspection API.`,
      "",
      "| Page | Verdict | Last crawl |",
      "| --- | --- | --- |",
      ...rows.map((row) => `| \`${row.path}\` | ${row.verdict} | ${row.lastCrawl?.slice(0, 10) ?? "—"} |`),
      "",
      `Remove these pages from \`${WATCH_PATH}\` — or, if the list is the record you want to keep,` +
        " close this issue and leave the file alone; the job now reports zero remaining.",
    ].join("\n");
  }

  const lines = [
    `## ${remaining} locale page(s) Google has not indexed`,
    "",
    `${indexed} of ${rows.length} watched pages are indexed. They are in \`sitemap.xml\`, linked` +
      " from their locale root, and answer 200 with `index, follow` and a self-canonical — so this" +
      " is Google's crawl decision, not a site fault, and no API can force a recrawl.",
    "",
    "| Page | Verdict | Google's state | Watching since | Days |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const watch = WATCH.pages.find((page) => page.path === row.path);
      const since = watch?.firstSeen ?? today;
      const days = Math.max(
        0,
        Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / 86_400_000),
      );
      return `| \`${row.path}\` | \`${row.verdict}\` | ${row.coverageState} | ${since} | ${days} |`;
    }),
    "",
  ];

  if (changes.length > 0) {
    lines.push(
      "### Change since the previous run",
      "",
      ...changes.map((change) => `- \`${change.path}\` — ${change.from} → **${change.to}** (${change.kind})`),
      "",
    );
  } else if (previousAt) {
    lines.push(`No verdict changed since the previous run (\`${previousAt}\`).`, "");
  } else {
    lines.push("This is the first run, so there is nothing to compare against yet.", "");
  }

  if (regressed.length > 0) {
    lines.push(
      "> [!WARNING]",
      `> ${regressed.length} watched page(s) moved to \`FAIL\`. \`NEUTRAL\` means "not fetched";` +
        " `FAIL` means Google knew the URL and excluded it — re-check the canonical, the meta" +
        " robots tag and the response status for those pages.",
      "",
    );
  }

  lines.push(
    "### Asking Google again",
    "",
    "Search Console → URL Inspection → paste the URL → **Request indexing**. There is no API" +
      " for this, it is one URL per click (~10/day), and it is worth doing once per page rather" +
      " than repeatedly: a re-request does not make Google rank a page it has decided to defer.",
    "",
    "This issue stays open until every watched page answers `PASS`; each run comments the table" +
      " above only when a verdict or Google's stated state actually changed.",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Self-test — the diff and the report, without a key or a network.
// ---------------------------------------------------------------------------

if (SELF_TEST) {
  const before = [
    { path: "/hi/youtube-downloader", verdict: "NEUTRAL", coverageState: "URL is unknown to Google" },
    { path: "/tl/youtube-downloader", verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" },
    { path: "/ur/youtube-downloader", verdict: "FAIL", coverageState: "Excluded by robots.txt" },
  ];
  const after = [
    { path: "/hi/youtube-downloader", verdict: "PASS", coverageState: "Submitted and indexed", lastCrawl: "2026-11-12T03:00:00Z" },
    { path: "/tl/youtube-downloader", verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" },
    { path: "/ur/youtube-downloader", verdict: "FAIL", coverageState: "Excluded by robots.txt" },
  ];

  const unchanged = diffRows(before, before);
  const moved = diffRows(before, after);
  const regressed = diffRows(
    [{ path: "/ur/youtube-downloader", verdict: "NEUTRAL", coverageState: "Discovered" }],
    [{ path: "/ur/youtube-downloader", verdict: "FAIL", coverageState: "Excluded by robots.txt" }],
  );
  const report = renderReport({ rows: after, previous: before, previousAt: "2026-11-11T06:40:00Z", changes: moved.changes, regressed: moved.regressed });

  const checks = [
    ["no change detected on identical input", unchanged.changes.length === 0],
    ["NEUTRAL -> PASS is one change", moved.changes.length === 1 && moved.changes[0].kind === "indexed"],
    ["a NEUTRAL -> PASS run is not a regression", moved.regressed.length === 0],
    ["NEUTRAL -> FAIL is a regression", regressed.regressed.length === 1],
    ["the report names the page and the transition", report.includes("/hi/youtube-downloader") && report.includes("NEUTRAL → **PASS**")],
    ["the report keeps the count honest", report.includes("2 locale page(s)")],
    ["an all-PASS run says so", renderReport({ rows: after.map((row) => ({ ...row, verdict: "PASS" })), previous: after, previousAt: null, changes: [], regressed: [] }).includes("Every watched locale page is indexed")],
  ];

  let failed = 0;
  for (const [name, ok] of checks) {
    log(`${ok ? "ok  " : "FAIL"}  ${name}`);
    if (!ok) failed += 1;
  }
  log(failed === 0 ? `self-test: ${checks.length}/${checks.length} pass` : `self-test: ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Auth — same shape as scripts/gsc-check.mjs
// ---------------------------------------------------------------------------

const base64urlSign = (value) => Buffer.from(value).toString("base64url");

function parseCredentials(raw) {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("the service-account key is neither JSON nor base64-encoded JSON");
  }
  if (!json.client_email || !json.private_key) {
    throw new Error("the service-account JSON is missing client_email or private_key");
  }
  return { email: json.client_email, key: json.private_key, project: json.project_id ?? "(unknown)" };
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlSign(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64urlSign(
    JSON.stringify({
      iss: credentials.email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64urlSign(
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

function pickProperty(sites, preferred) {
  const candidates = [preferred, `sc-domain:${APEX}`, `https://${new URL(ORIGIN).host}/`].filter(Boolean);
  for (const candidate of candidates) {
    const match = sites.find((site) => site.siteUrl === candidate);
    if (match) return match;
  }
  return sites.find((site) => site.siteUrl.includes(APEX)) ?? null;
}

async function inspectOne(token, property, path) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const data = await googleFetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", token, {
        method: "POST",
        body: { inspectionUrl: `${ORIGIN}${path}`, siteUrl: property, languageCode: "en-US" },
      });
      const result = data?.inspectionResult?.indexStatusResult ?? {};
      return {
        path,
        verdict: result.verdict ?? "NEUTRAL",
        coverageState: result.coverageState ?? "Unknown",
        lastCrawl: result.lastCrawlTime ?? null,
      };
    } catch (error) {
      const retryable = error.status === 429 || error.status === 403 || error.status >= 500;
      if (retryable && attempt < MAX_RETRIES) {
        await sleep(2_000 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log(`Unindexed locale watch for ${WATCH.pages.length} page(s) on ${ORIGIN}`);

  let keyRaw = (process.env.GSC_SERVICE_ACCOUNT_JSON ?? process.env.GA4_SERVICE_ACCOUNT_JSON ?? "").trim();
  if (!keyRaw) {
    try {
      keyRaw = readFileSync(KEY_FILE, "utf8").trim();
      if (keyRaw) log(`using the service-account key at ${KEY_FILE}`);
    } catch {
      // No key anywhere: report "not configured" and exit 0.
    }
  }

  if (!keyRaw) {
    const skipped =
      `Not configured — no \`GSC_SERVICE_ACCOUNT_JSON\` and no key at \`${KEY_FILE}\`, so the ` +
      `${WATCH.pages.length} watched URLs were NOT inspected.`;
    log(skipped);
    setOutput("measured", "false");
    setOutput("remaining", "");
    setOutput("regressed", "false");
    summary(`### Unindexed locale watch: not configured\n\n${skipped}`);
    if (!SKIP_IF_UNCONFIGURED) process.exitCode = 1;
    return;
  }

  const credentials = parseCredentials(keyRaw);
  log(`service account ${credentials.email} (project ${credentials.project})`);
  const token = await getAccessToken(credentials);

  let state = { runs: [] };
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    if (Array.isArray(parsed.runs)) state = parsed;
  } catch {
    log("(no previous state — this run is the baseline)");
  }

  const sites = (await googleFetch("https://www.googleapis.com/webmasters/v3/sites", token)).siteEntry ?? [];
  const property = pickProperty(sites, (process.env.WATCH_PROPERTY ?? "").trim());
  if (!property) {
    throw new Error(
      `the service account sees no ${APEX} property (it can see ` +
        `${sites.length === 0 ? "none" : sites.map((site) => site.siteUrl).join(", ")})`,
    );
  }
  log(`property    ${property.siteUrl} (${property.permissionLevel})`);

  const rows = [];
  for (const [index, page] of WATCH.pages.entries()) {
    if (index > 0) await sleep(PACE_MS);
    const row = await inspectOne(token, property.siteUrl, page.path);
    log(`${row.path.padEnd(34)} ${row.verdict.padEnd(8)} ${row.coverageState}`);
    rows.push(row);
  }

  const previousRun = state.runs.at(-1) ?? null;
  const { changes, regressed } = diffRows(previousRun?.pages, rows);
  const indexed = rows.filter((row) => row.verdict === "PASS").length;
  const remaining = rows.length - indexed;

  const report = renderReport({
    rows,
    previous: previousRun?.pages ?? null,
    previousAt: previousRun?.at ?? null,
    changes,
    regressed,
  });
  log("");
  log(`indexed ${indexed}/${rows.length} · changes ${changes.length} · regressed ${regressed.length}`);
  log("");
  log(report);

  setOutput("measured", "true");
  setOutput("remaining", String(remaining));
  setOutput("regressed", String(regressed.length > 0));
  summary(report);
  // The issue body is written only while pages remain: an issue that closed
  // last week must not be reopened with a stale table from that run.
  if (remaining > 0) writeReport(report);

  state.runs = [
    ...state.runs,
    { at: new Date().toISOString(), property: property.siteUrl, pages: rows },
  ].slice(-HISTORY_LIMIT);
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);

  // A regression is the only verdict that is news: NEUTRAL is the known state
  // this job exists to wait out, and failing every run for it would make the
  // badge meaningless.
  if (regressed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`unindexed watch failed: ${message}`);
  summary(`### Unindexed locale watch: measurement failed\n\n\`${message}\``);
  setOutput("measured", "false");
  process.exit(1);
});
