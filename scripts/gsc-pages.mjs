#!/usr/bin/env node
/**
 * Per-page Search Console report: impressions and Google's own coverage verdict
 * for the same handful of URLs, in one command.
 *
 * Run:  npm run seo:gsc
 *       npm run seo:gsc -- --days 7
 *       npm run seo:gsc -- --path /twitter-video-downloader --path /facebook-video-downloader
 *
 * Why this exists beside `scripts/gsc-check.mjs`: that one answers "how much of
 * the sitemap is indexed" (96 URLs, two counts and a Summary block for a
 * scheduled job). This one answers "did the page I edited actually start
 * earning impressions, and does Google agree it is indexable" — a page-level
 * question asked while working on a specific URL, not on a Monday morning.
 *
 * The default watch list is the seven pages whose FAQ copy was rewritten for the
 * LOW-KD phrases `npm run seo:radar` measured on 2026-11-09. Two of them were
 * the reason this script was kept: `/facebook-video-downloader` answered
 * "Discovered - currently not indexed" and `/twitter-video-downloader` "URL is
 * unknown to Google" while serving 200 with `index, follow` and a self
 * canonical — a state only a page-level report makes visible.
 *
 * Honesty notes:
 *   - Search performance is finalised 2–3 days behind today, so the window ends
 *     at `today − 3`; asking for yesterday makes every comparison look like a
 *     drop. A copy change deployed today cannot appear in this report yet.
 *   - `NEUTRAL` means Google has no information ("unknown to Google",
 *     "Discovered - currently not indexed"); it is not the same as `FAIL`, which
 *     means Google knows the URL and excluded it.
 *
 * Auth mirrors `scripts/gsc-check.mjs`: a service-account JWT signed with
 * node:crypto (no SDK, no dependency), read from `GSC_SERVICE_ACCOUNT_JSON`,
 * then `GA4_SERVICE_ACCOUNT_JSON`, then the key at `GSC_KEY_FILE`. An optional
 * integration that was never configured reports that and exits 0 rather than
 * turning a manual check into a red job.
 *
 * Exit codes: 0 = report produced (including "not configured"), 1 = the API
 * answered with an error.
 */

import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";

const ARGS = process.argv.slice(2);
const value = (name, fallback) => {
  const index = ARGS.indexOf(`--${name}`);
  return index >= 0 && ARGS[index + 1] ? ARGS[index + 1] : fallback;
};

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const HOST = new URL(ORIGIN).host;
/** Registrable name, used to match a `sc-domain:` property whatever its form. */
const APEX = HOST.replace(/^www\./, "");
const KEY_FILE = process.env.GSC_KEY_FILE ?? ".scratch/ga4-key.json";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ANALYTICS_API = "https://www.googleapis.com/webmasters/v3";
const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

/** The pages this report watches by default. `--path` replaces the list. */
const WATCH = [
  "/facebook-video-downloader",
  "/twitter-video-downloader",
  "/instagram-reels-downloader",
  "/tiktok-safe-zone-checker",
  "/video-thumbnail-downloader",
  "/tiktok-caption-hashtag-extractor",
  "/tiktok-money-calculator",
];

const DAYS = Number(value("days", "28"));
/**
 * Per-request deadline, in milliseconds. URL Inspection occasionally holds a
 * request past 30s; that used to abort the whole table with `The operation was
 * aborted due to timeout`, and every page after the slow one vanished from the
 * report. `GSC_TIMEOUT_MS=60000 npm run seo:gsc` raises it for one run.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.GSC_TIMEOUT_MS ?? 30_000);

/**
 * `--path=/foo` and `--path /foo` both work, and the inline form is the one to
 * prefer on Windows: Git Bash rewrites a bare `/foo` argument into a drive path
 * (`C:/Program Files/Git/foo`) before npm sees it, which silently leaves the
 * default watch list in place. The leading drive prefix is stripped so the
 * mangled form still fails loudly instead of querying a nonsense page.
 */
const paths = [];
for (const [index, arg] of ARGS.entries()) {
  const raw = arg.startsWith("--path=") ? arg.slice("--path=".length) : arg === "--path" ? ARGS[index + 1] ?? "" : "";
  if (!raw) continue;
  const normalized = raw.replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(normalized)) {
    // Git Bash rewrites a bare `/slug` argument into `C:/…/git/slug` before this
    // process starts, and it does the same to `--path=/slug`. The trailing
    // segment is the only part that survives, so that is what is used.
    const slug = normalized.split("/").filter(Boolean).pop() ?? "";
    if (slug) {
      console.warn(`(the shell rewrote --path as ${raw}; using /${slug})`);
      paths.push(`/${slug}`);
    }
    continue;
  }
  if (normalized.startsWith("/")) paths.push(normalized.replace(/\/+$/, "") || "/");
}
if (paths.length > 0) {
  WATCH.length = 0;
  WATCH.push(...paths);
}

const log = (message) => console.log(message);

/** `YYYY-MM-DD` for N days ago, UTC. */
function shiftDate(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const current = { startDate: shiftDate(DAYS + 2), endDate: shiftDate(3) };
const previous = { startDate: shiftDate(DAYS * 2 + 2), endDate: shiftDate(DAYS + 3) };

const base64url = (input) => Buffer.from(input).toString("base64url");

async function resolveKey() {
  const fromEnv = (process.env.GSC_SERVICE_ACCOUNT_JSON ?? process.env.GA4_SERVICE_ACCOUNT_JSON ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    return (await readFile(KEY_FILE, "utf8")).trim();
  } catch {
    return "";
  }
}

/**
 * Accepts the key raw or base64-encoded: GitHub secrets keep newlines, but a key
 * copied out of a JSON file usually arrives base64. Escaped `\n` in private_key
 * is fixed here because a JWT signed with the literal two characters fails with
 * an OpenSSL error that says nothing about the cause.
 */
function parseCredentials(raw) {
  let text = raw;
  if (!text.startsWith("{")) {
    try {
      text = Buffer.from(text, "base64").toString("utf8");
    } catch {
      // Leave it as-is; the JSON.parse below produces the real error message.
    }
  }
  const parsed = JSON.parse(text);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("service-account JSON is missing client_email or private_key");
  }
  return {
    email: parsed.client_email,
    private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
  };
}

async function getAccessToken(credentials) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: credentials.email,
      scope: SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(credentials.private_key, "base64url")}`;

  const response = await fetch(TOKEN_ENDPOINT, {
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = parsed.error?.message ?? response.statusText;
    const error = new Error(`${method} ${url.split("?")[0]} → HTTP ${response.status}: ${message}`);
    error.status = response.status;
    throw error;
  }
  return parsed;
}

/**
 * The property the service account can actually read. A `sc-domain:` property
 * covers both hostnames, so it is preferred; a URL-prefix property is accepted
 * when its host matches. Anything else would query a property the account was
 * never granted, which answers 403 rather than an empty report.
 */
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

async function searchAnalytics(token, property, range, dimensions, rowLimit = 500) {
  const url = `${ANALYTICS_API}/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const rows = await googleFetch(url, token, {
    method: "POST",
    body: { ...range, dimensions, rowLimit, dataState: "final" },
  });
  return rows.rows ?? [];
}

async function inspect(token, property, path) {
  const data = await googleFetch(INSPECT_ENDPOINT, token, {
    method: "POST",
    body: { inspectionUrl: `${ORIGIN}${path}`, siteUrl: property, languageCode: "en-US" },
  });
  const result = data?.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: result.verdict ?? "NEUTRAL",
    state: result.coverageState ?? "Unknown",
    lastCrawl: result.lastCrawlTime ?? null,
    canonical: result.googleCanonical ?? null,
  };
}

const pagePath = (url) => {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
};

const formatInt = (value_) => (value_ ?? 0).toLocaleString("en-US");

async function main() {
  const key = await resolveKey();
  if (!key) {
    log(
      `Search Console is not configured — no GSC_SERVICE_ACCOUNT_JSON / GA4_SERVICE_ACCOUNT_JSON and no key at ${KEY_FILE}.`,
    );
    return;
  }

  const credentials = parseCredentials(key);
  const token = await getAccessToken(credentials);
  const property = await resolveProperty(token);

  log(`property ${property} · watch list ${WATCH.length} page(s)`);
  log(`current ${current.startDate} → ${current.endDate} · previous ${previous.startDate} → ${previous.endDate}`);
  log("");

  const [nowRows, beforeRows, queryRows] = await Promise.all([
    searchAnalytics(token, property, current, ["page"]),
    searchAnalytics(token, property, previous, ["page"]),
    searchAnalytics(token, property, current, ["page", "query"]),
  ]);

  const totals = nowRows.reduce(
    (acc, row) => ({ clicks: acc.clicks + row.clicks, impressions: acc.impressions + row.impressions }),
    { clicks: 0, impressions: 0 },
  );
  log(`site total: ${formatInt(totals.clicks)} clicks · ${formatInt(totals.impressions)} impressions`);

  const pick = (rows, path) => rows.find((row) => pagePath(row.keys[0]) === path);

  log("");
  log(`${"page".padEnd(38)}${"clicks".padStart(7)}${"impr".padStart(8)}${"prev".padStart(8)}  verdict`);
  for (const path of WATCH) {
    const now = pick(nowRows, path);
    const before = pick(beforeRows, path);
    // One slow page must not cost the rest of the table: retry once at the same
    // deadline, then report the row as unmeasured rather than losing the pages
    // that come after it.
    let coverage;
    try {
      coverage = await inspect(token, property, path);
    } catch (firstError) {
      try {
        coverage = await inspect(token, property, path);
      } catch (retryError) {
        coverage = {
          verdict: "UNMEASURED",
          state: retryError?.message ?? String(firstError),
          lastCrawl: null,
          canonical: null,
        };
      }
    }
    const crawled = coverage.lastCrawl ? `last crawl ${coverage.lastCrawl.slice(0, 10)}` : "never crawled";
    const numbers = now
      ? `${String(now.clicks).padStart(7)}${String(now.impressions).padStart(8)}${String(before?.impressions ?? 0).padStart(8)}`
      : `${"—".padStart(7)}${"—".padStart(8)}${String(before?.impressions ?? 0).padStart(8)}`;
    log(`${path.padEnd(38)}${numbers}  ${coverage.verdict} · ${coverage.state} (${crawled})`);

    const queries = queryRows
      .filter((row) => pagePath(row.keys[0]) === path)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
    for (const row of queries) {
      log(`  ${"".padEnd(36)}"${row.keys[1]}" · impr ${formatInt(row.impressions)} · pos ${row.position.toFixed(1)}`);
    }
  }

  log("");
  log("A page with no impressions and a NEUTRAL verdict is a coverage problem, not a ranking problem.");
  log("Performance data is finalised 2–3 days behind today, so a deploy from today cannot appear above.");
}

main().catch((error) => {
  console.error(`seo:gsc failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
