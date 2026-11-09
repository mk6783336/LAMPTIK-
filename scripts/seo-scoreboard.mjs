#!/usr/bin/env node
/**
 * Weekly scoreboard: one JSON line per week in `docs/seo-scoreboard.jsonl`, so
 * growth is a row you can compare instead of a memory of last Monday.
 *
 * Four numbers, each taken from the source that actually owns it:
 *
 *   1. **Clicks and impressions** — Search Analytics over the last 28 finalised
 *      days. The API's own total row is used, not the sum of page rows: the
 *      page dimension lists `http://lamptik.online/` and
 *      `https://www.lamptik.online/` separately, so summing rows over-counts
 *      (86 vs 55 on 2026-11-09, both "final").
 *   2. **Pages with impressions** — how many distinct URLs earned at least one,
 *      which moves before clicks do and is the first sign a new page exists.
 *   3. **Indexed pages** — the last complete `PASS` count from the Monday sweep
 *      in `.gsc-check-state.json`. URL Inspection has no "how many" endpoint;
 *      re-inspecting 96 URLs here would duplicate the weekly job's quota and
 *      still disagree with it. A partial sweep stores `pass: null`, and that is
 *      skipped rather than counted as zero.
 *   4. **Seven-page coverage** — URL Inspection on the seven pages the
 *      2026-11-09 copy pass touched. This is the only set that can move within
 *      a week, so it is the one worth re-checking each run.
 *
 * Run:  npm run seo:scoreboard
 *       node scripts/seo-scoreboard.mjs --no-write   (CI: print, do not append)
 *
 * Exit codes: 0 = table printed (including "not configured"), 1 = API error.
 */

import { appendFile, readFile, writeFile } from "node:fs/promises";
import { createSign } from "node:crypto";

const ARGS = process.argv.slice(2);
const NO_WRITE = ARGS.includes("--no-write");
const HISTORY_PATH = process.env.SCOREBOARD_PATH ?? "docs/seo-scoreboard.jsonl";
/** Written by the Monday job; see `.github/workflows/index-check.yml`. */
const SWEEP_STATE = process.env.GSC_STATE ?? ".gsc-check-state.json";

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const HOST = new URL(ORIGIN).host;
const APEX = HOST.replace(/^www\./, "");
const KEY_FILE = process.env.GSC_KEY_FILE ?? ".scratch/ga4-key.json";
const ANALYTICS_API = "https://www.googleapis.com/webmasters/v3";
const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/** Same seven pages as `scripts/gsc-pages.mjs`; kept identical on purpose. */
const WATCH = [
  "/facebook-video-downloader",
  "/twitter-video-downloader",
  "/instagram-reels-downloader",
  "/tiktok-safe-zone-checker",
  "/video-thumbnail-downloader",
  "/tiktok-caption-hashtag-extractor",
  "/tiktok-money-calculator",
];

const log = (message) => console.log(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base64url = (input) => Buffer.from(input).toString("base64url");

function shiftDate(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Search Console finalises 2–3 days behind today, so the window ends there. */
const WINDOW = { startDate: shiftDate(30), endDate: shiftDate(3) };

async function resolveKey() {
  const fromEnv = (process.env.GSC_SERVICE_ACCOUNT_JSON ?? process.env.GA4_SERVICE_ACCOUNT_JSON ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    return (await readFile(KEY_FILE, "utf8")).trim();
  } catch {
    return "";
  }
}

function parseCredentials(raw) {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(text);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("service-account JSON is missing client_email or private_key");
  }
  return { email: parsed.client_email, key: String(parsed.private_key).replace(/\\n/g, "\n") };
}

async function getAccessToken(credentials) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: credentials.email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(credentials.key, "base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`token HTTP ${response.status}: ${body.error_description ?? body.error ?? "unknown"}`);
  }
  return body.access_token;
}

async function googleFetch(url, token, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${method} ${url.split("?")[0]} → HTTP ${response.status}: ${parsed.error?.message ?? response.statusText}`);
  }
  return parsed;
}

async function resolveProperty(token) {
  const configured = (process.env.GSC_PROPERTY ?? "").trim();
  if (configured) return configured;
  const { siteEntry = [] } = await googleFetch(`${ANALYTICS_API}/sites`, token);
  const urls = siteEntry.map((entry) => entry.siteUrl);
  const scoped = urls.find((url) => url === `sc-domain:${APEX}`);
  if (scoped) return scoped;
  const prefix = urls.find((url) => url.startsWith("http") && url.includes(HOST));
  if (prefix) return prefix.replace(/\/+$/, "");
  throw new Error(`no Search Console property for ${APEX} (account can see: ${urls.join(", ") || "none"})`);
}

async function searchAnalytics(token, property, dimensions, rowLimit = 500) {
  const url = `${ANALYTICS_API}/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const data = await googleFetch(url, token, {
    method: "POST",
    body: { ...WINDOW, dimensions, rowLimit, dataState: "final" },
  });
  return data.rows ?? [];
}

async function inspect(token, property, path) {
  const data = await googleFetch(INSPECT_ENDPOINT, token, {
    method: "POST",
    body: { inspectionUrl: `${ORIGIN}${path}`, siteUrl: property, languageCode: "en-US" },
  });
  const result = data?.inspectionResult?.indexStatusResult ?? {};
  return {
    path,
    verdict: result.verdict ?? "NEUTRAL",
    state: result.coverageState ?? "Unknown",
    lastCrawl: result.lastCrawlTime ?? null,
  };
}

const pagePath = (url) => {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
};

/** The newest sweep that finished without gaps; `pass: null` means partial. */
async function lastCompleteSweep() {
  try {
    const state = JSON.parse(await readFile(SWEEP_STATE, "utf8"));
    const runs = Array.isArray(state.runs) ? state.runs : [];
    for (let index = runs.length - 1; index >= 0; index -= 1) {
      if (typeof runs[index].pass === "number") {
        return { pass: runs[index].pass, at: runs[index].at ?? null };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function readHistory() {
  try {
    const raw = await readFile(HISTORY_PATH, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

const formatInt = (value) => (typeof value === "number" ? value.toLocaleString("en-US") : "—");

/** `+2`, `−1`, `0`, or `—` when the baseline is missing. */
function delta(now, before, suffix = "") {
  if (typeof before !== "number" || typeof now !== "number") return "—";
  const diff = now - before;
  if (diff === 0) return `0${suffix}`;
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff)}${suffix}`;
}

function markdown(record, previous) {
  const word = (value) => (typeof value === "number" ? value : "—");
  const row = (label, now, before) => `| ${label} | ${word(now)} | ${word(before)} | ${delta(now, before)} |`;
  const changed = record.pages.filter((page) => {
    const was = previous?.pages?.find((item) => item.path === page.path);
    return was && was.verdict !== page.verdict;
  });

  return [
    "### Weekly scoreboard",
    "",
    `\`${record.window.start}\` → \`${record.window.end}\` (last 28 finalised days).`,
    "",
    "| Metric | This run | Previous run | Change |",
    "| --- | --- | --- | --- |",
    row("Clicks", record.clicks, previous?.clicks),
    row("Impressions", record.impressions, previous?.impressions),
    row("Pages with impressions", record.pagesWithImpressions, previous?.pagesWithImpressions),
    row("Indexed (sitemap sweep)", record.indexed?.pass ?? null, previous?.indexed?.pass ?? null),
    row("Seven-page PASS", record.coverage.pass, previous?.coverage?.pass),
    "",
    `Coverage on the seven watched pages: **${record.coverage.pass} PASS**, ` +
      `${record.coverage.partial} PARTIAL, ${record.coverage.neutral} NEUTRAL, ${record.coverage.fail} FAIL.`,
    ...(changed.length > 0
      ? ["", ...changed.map((page) => `- \`${page.path}\` — now \`${page.verdict}\` (was \`${previous.pages.find((item) => item.path === page.path).verdict}\`)`)]
      : []),
    "",
  ].join("\n");
}

async function main() {
  const key = await resolveKey();
  if (!key) {
    log(`Search Console is not configured — no GSC_SERVICE_ACCOUNT_JSON / GA4_SERVICE_ACCOUNT_JSON and no key at ${KEY_FILE}.`);
    return;
  }

  const token = await getAccessToken(parseCredentials(key));
  const property = await resolveProperty(token);

  const [totalsRows, pageRows] = await Promise.all([
    searchAnalytics(token, property, []),
    searchAnalytics(token, property, ["page"]),
  ]);
  const totals = totalsRows[0] ?? { clicks: 0, impressions: 0 };
  const pagesWithImpressions = pageRows.length;

  const pages = [];
  for (const path of WATCH) {
    pages.push(await inspect(token, property, path));
    await sleep(250);
  }

  const coverage = { pass: 0, partial: 0, fail: 0, neutral: 0 };
  for (const page of pages) {
    if (page.verdict === "PASS") coverage.pass += 1;
    else if (page.verdict === "PARTIAL") coverage.partial += 1;
    else if (page.verdict === "FAIL") coverage.fail += 1;
    else coverage.neutral += 1;
  }

  const indexed = await lastCompleteSweep();
  const history = await readHistory();
  const previous = history.at(-1) ?? null;

  const record = {
    at: new Date().toISOString(),
    window: WINDOW,
    clicks: totals.clicks ?? 0,
    impressions: totals.impressions ?? 0,
    pagesWithImpressions,
    indexed,
    coverage,
    pages,
    topPages: pageRows
      .slice()
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .map((row) => ({ path: pagePath(row.keys[0]), clicks: row.clicks, impressions: row.impressions })),
  };

  log(`LAMP TIK weekly scoreboard · ${record.at.slice(0, 10)}`);
  log(`window ${WINDOW.startDate} → ${WINDOW.endDate} (last 28 finalised days)`);
  log(previous ? `baseline: run at ${String(previous.at).slice(0, 10)}` : "baseline: none — this run is the first row");
  log("");
  log(`${"metric".padEnd(28)}${"now".padStart(10)}${"last run".padStart(10)}${"change".padStart(9)}`);
  const line = (label, now, before) =>
    log(`${label.padEnd(28)}${formatInt(now).padStart(10)}${formatInt(before).padStart(10)}${delta(now, before).padStart(9)}`);
  line("clicks", record.clicks, previous?.clicks);
  line("impressions", record.impressions, previous?.impressions);
  line("pages with impressions", record.pagesWithImpressions, previous?.pagesWithImpressions);
  line("indexed (sitemap sweep)", indexed?.pass ?? null, previous?.indexed?.pass ?? null);
  line("seven-page PASS", coverage.pass, previous?.coverage?.pass);

  log("");
  log(
    indexed
      ? `indexed count is the last complete sweep (${String(indexed.at).slice(0, 10)}); the sweep runs Monday 06:00 UTC.`
      : "indexed count unavailable: the Monday sweep has not completed a full pass yet.",
  );
  log("");
  log(`${"page".padEnd(38)}${"verdict".padEnd(9)}${"was".padEnd(9)}state`);
  for (const page of pages) {
    const was = previous?.pages?.find((item) => item.path === page.path);
    const moved = was && was.verdict !== page.verdict ? ` (was ${was.verdict})` : "";
    const crawled = page.lastCrawl ? ` · last crawl ${page.lastCrawl.slice(0, 10)}` : " · never crawled";
    log(`${page.path.padEnd(38)}${page.verdict.padEnd(9)}${(was?.verdict ?? "—").padEnd(9)}${page.state}${crawled}${moved}`);
  }

  log("");
  log("Top pages by impressions:");
  for (const page of record.topPages) {
    log(`  ${page.path.padEnd(38)} ${formatInt(page.impressions).padStart(4)} impr · ${formatInt(page.clicks)} clicks`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown(record, previous)}\n`);
  }

  if (NO_WRITE) {
    log("");
    log(`--no-write: ${HISTORY_PATH} not touched.`);
    return;
  }

  await writeFile(HISTORY_PATH, `${JSON.stringify(record)}\n`, { flag: "a" });
  log("");
  log(`recorded in ${HISTORY_PATH} (${history.length + 1} run(s)).`);
}

main().catch((error) => {
  console.error(`seo:scoreboard failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
