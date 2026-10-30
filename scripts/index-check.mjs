#!/usr/bin/env node
/**
 * Weekly indexing health report for Bing and DuckDuckGo.
 *
 * Why this exists: the site has 51 sitemap URLs and the question "is it in
 * Bing yet?" could only be answered by running `site:` queries by hand.
 *
 * WHAT THIS SCRIPT WILL NOT DO
 * ----------------------------
 * It will not report a number it cannot verify. Bing and DuckDuckGo both serve
 * *degraded* pages to automated clients: a `site:` query from a datacenter IP
 * comes back with unrelated filler results (a `site:wikipedia.org` query returns
 * Reddit and microsoft.com links). Reading that as "0 indexed" is how you talk
 * yourself into a false diagnosis — it happened once during this project, which
 * is why the control check below exists.
 *
 * So every `site:` measurement is validated against a **control domain** that is
 * certainly indexed. Only if the control returns its own results is the target
 * number trusted; otherwise the engine is reported as `unmeasurable` and nothing
 * is written to the history, so a blocked scrape can never look like a drop.
 *
 * WHAT IT ALWAYS MEASURES
 * -----------------------
 * Signals that are reliable without any account:
 *   - sitemap HTTP status and URL count
 *   - whether Bing Webmaster verification is configured (meta tag / XML file)
 *   - whether robots.txt admits Bingbot and advertises the sitemap
 *   - the indexed-page counts, when the control check passes
 *
 * The authoritative number for Bing can only come from the Webmaster API with a
 * verified property and an API key; see `docs/bing-webmaster-setup.md`.
 *
 * State lives in `.index-check-state.json` (git-ignored), restored between runs
 * by actions/cache.
 *
 * Exit codes: 0 = report produced (even if some signals are unmeasurable),
 * 1 = the script itself failed.
 */

import { appendFile, readFile, writeFile } from "node:fs/promises";

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const HOST = new URL(ORIGIN).host;
const STATE_PATH = process.env.INDEX_CHECK_STATE ?? ".index-check-state.json";
const HISTORY_LIMIT = 26; // ~6 months of weekly runs

/** A domain with an enormous, unquestionably-indexed page set. */
const CONTROL_HOST = "wikipedia.org";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const log = (message) => console.log(message);

async function fetchText(url, { cookie, timeout = 30_000 } = {}) {
  const headers = {
    "user-agent": UA,
    accept: "text/html,application/xhtml+xml",
    "accept-language": "en-US,en;q=0.9",
  };
  if (cookie) headers.cookie = cookie;
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeout), redirect: "follow" });
    return {
      status: response.status,
      body: await response.text(),
      cookies: response.headers.getSetCookie?.() ?? [],
    };
  } catch (error) {
    return { status: 0, body: "", cookies: [], error: error instanceof Error ? error.message : String(error) };
  }
}

/** Canonical form so `/tools` and `/tools/` count once. */
function normalize(raw, host) {
  try {
    const url = new URL(raw);
    if (url.host.toLowerCase() !== host.toLowerCase()) return null;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.protocol}//${url.host.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

/**
 * Bing does not link results directly: every result href is
 * `bing.com/ck/a?...&u=a1<base64url of the real URL>`. Plain URL matching finds
 * nothing, so the wrapper has to be unwrapped before anything can be counted.
 */
function decodeBingUrl(payload) {
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    return /^https?:\/\//.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function extractBingResults(html, host) {
  const found = new Set();
  for (const match of html.matchAll(/u=a1([A-Za-z0-9_-]+)/g)) {
    const decoded = decodeBingUrl(match[1]);
    const normalized = decoded ? normalize(decoded, host) : null;
    if (normalized) found.add(normalized);
  }
  return found;
}

function extractDdgResults(html, host) {
  const found = new Set();
  for (const match of html.matchAll(/[?&]uddg=([^"&]+)/g)) {
    const decoded = (() => {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return null;
      }
    })();
    const normalized = decoded ? normalize(decoded, host) : null;
    if (normalized) found.add(normalized);
  }
  return found;
}

async function bingQuery(host, cookie) {
  const { status, body } = await fetchText(
    `https://www.bing.com/search?q=site%3A${encodeURIComponent(host)}&count=50&first=1`,
    { cookie },
  );
  if (status !== 200) return { status, urls: [], error: `HTTP ${status}` };
  return { status, urls: [...extractBingResults(body, host)], error: null };
}

async function ddgQuery(host) {
  const { status, body } = await fetchText(
    `https://html.duckduckgo.com/html/?q=site%3A${encodeURIComponent(host)}`,
  );
  // 202 is DDG's anti-automation response, not an empty result set.
  if (status !== 200) return { status, urls: [], error: `HTTP ${status}` };
  return { status, urls: [...extractDdgResults(body, host)], error: null };
}

/**
 * Runs the target query only when the control query proved the engine still
 * answers honestly. Returns `count: null` when it did not — never `0`.
 */
async function measureEngine({ name, query, cookie }) {
  const control = await query(CONTROL_HOST, cookie);
  if (control.error) return { name, count: null, urls: [], reason: `control query failed (${control.error})` };
  if (control.urls.length === 0) {
    return {
      name,
      count: null,
      urls: [],
      reason: `control domain returned no results for site:${CONTROL_HOST} — the engine is serving a degraded page to automated clients`,
    };
  }

  const target = await query(HOST, cookie);
  if (target.error) return { name, count: null, urls: [], reason: `target query failed (${target.error})` };
  return { name, count: target.urls.length, urls: target.urls, reason: null };
}

async function checkSitemap() {
  const { status, body } = await fetchText(`${ORIGIN}/sitemap.xml`);
  const count = status === 200 ? (body.match(/<loc>/g) ?? []).length : null;
  return { status, count };
}

async function checkVerification() {
  const xml = await fetchText(`${ORIGIN}/BingSiteAuth.xml`);
  const home = await fetchText(ORIGIN);
  return {
    metaTag: /name="msvalidate\.01"/.test(home.body),
    xmlFile: xml.status === 200 && /<user>/.test(xml.body),
  };
}

async function checkRobots() {
  const { status, body } = await fetchText(`${ORIGIN}/robots.txt`);
  if (status !== 200) return { status, allowsBingbot: false, sitemap: false };
  // A `*` group or an explicit `Bingbot` group both admit it; an explicit
  // Disallow under a Bingbot heading would override the wildcard.
  const bingGroup = body.split(/user-agent:/i).find((part) => /^\s*bingbot/i.test(part));
  const allowsBingbot = bingGroup ? !/disallow:\s*\/\s*($|\n)/i.test(bingGroup) : /allow:\s*\//i.test(body);
  return { status, allowsBingbot, sitemap: /sitemap:/i.test(body) };
}

function loadState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.runs)) return parsed;
  } catch {
    /* first run, or a corrupt cache — start clean rather than crash */
  }
  return { runs: [] };
}

function delta(current, previous) {
  if (current === null || current === undefined) return "—";
  if (previous === null || previous === undefined) return "—";
  const change = current - previous;
  if (change === 0) return "no change";
  return `${change > 0 ? "+" : ""}${change}`;
}

function buildSummary({ bing, ddg, sitemap, verification, robots, previous, newUrls }) {
  const prev = previous ?? {};
  const yesNo = (value) => (value ? "yes" : "**no**");

  const lines = [
    "## Indexing health — Bing / DuckDuckGo",
    "",
    `Target: ${ORIGIN}  `,
    `Checked: ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC`,
    "",
    "### Always measurable",
    "",
    "| Signal | Value | Change |",
    "| --- | --- | --- |",
    `| Sitemap URLs | ${sitemap.count ?? `error (HTTP ${sitemap.status})`} | ${delta(sitemap.count, prev.sitemap)} |`,
    `| robots.txt allows Bingbot | ${yesNo(robots.allowsBingbot)} | — |`,
    `| robots.txt lists sitemap | ${yesNo(robots.sitemap)} | — |`,
    `| Bing verification — meta tag | ${yesNo(verification.metaTag)} | — |`,
    `| Bing verification — XML file | ${yesNo(verification.xmlFile)} | — |`,
    "",
    "### Indexed pages",
    "",
    "| Engine | Indexed pages | Change |",
    "| --- | --- | --- |",
  ];

  for (const engine of [bing, ddg]) {
    const value = engine.count === null ? "unmeasurable" : String(engine.count);
    const change = engine.count === null ? "—" : delta(engine.count, prev[engine.key]);
    lines.push(`| ${engine.name} | ${value} | ${change} |`);
  }
  lines.push("");

  for (const engine of [bing, ddg]) {
    if (engine.reason) {
      lines.push(`- **${engine.name} unmeasurable** — ${engine.reason}.`);
    }
  }
  if (bing.reason || ddg.reason) {
    lines.push(
      "",
      "> [!IMPORTANT]",
      "> An `unmeasurable` result says nothing about whether the site is indexed — it means the engine refused to answer a bot.",
      "> The authoritative count comes from the Bing Webmaster API with a verified property; see `docs/bing-webmaster-setup.md`.",
      "",
    );
  }

  if (!verification.metaTag && !verification.xmlFile) {
    lines.push(
      "> [!WARNING]",
      "> Bing Webmaster Tools verification is **not configured**. Until it is, Bing has no sitemap attached and no crawl priority,",
      "> so indexing progress cannot start. Importing the property from Google Search Console needs no token.",
      "",
    );
  }

  if (newUrls.length > 0) {
    lines.push(`<details><summary>${newUrls.length} newly seen URL(s)</summary>`, "");
    lines.push(...newUrls.map((url) => `- ${url}`));
    lines.push("", "</details>", "");
  }

  lines.push(
    "_Bing's index lags its crawl by days; treat one week as noise and four as the trend._",
  );
  return lines.join("\n");
}

async function main() {
  log(`Indexing health for ${ORIGIN}\n`);

  // A cookie from the Bing front page is what a browser would have; without it
  // the search endpoint answers even more aggressively with filler.
  const home = await fetchText("https://www.bing.com/?cc=US");
  const cookie = home.cookies.map((entry) => entry.split(";")[0]).join("; ");

  const [sitemap, verification, robots] = await Promise.all([
    checkSitemap(),
    checkVerification(),
    checkRobots(),
  ]);

  const bing = await measureEngine({ name: "Bing", query: bingQuery, cookie });
  const ddg = await measureEngine({ name: "DuckDuckGo", query: ddgQuery });
  bing.key = "bing";
  ddg.key = "ddg";

  let state = { runs: [] };
  try {
    state = loadState(await readFile(STATE_PATH, "utf8"));
  } catch {
    log("(no previous state — this run is the baseline)");
  }
  const previous = state.runs.at(-1) ?? null;

  const currentUrls = [...new Set([...bing.urls, ...ddg.urls])];
  const newUrls = currentUrls.filter((url) => !(previous?.urls ?? []).includes(url));

  log(`sitemap      ${sitemap.count ?? "error"} URL(s) (HTTP ${sitemap.status})`);
  log(`robots.txt   bingbot=${robots.allowsBingbot ? "allowed" : "BLOCKED"} sitemap=${robots.sitemap ? "listed" : "missing"}`);
  log(`verification meta=${verification.metaTag ? "yes" : "no"} xml=${verification.xmlFile ? "yes" : "no"}`);
  for (const engine of [bing, ddg]) {
    log(`${engine.name.padEnd(12)} ${engine.count === null ? `unmeasurable (${engine.reason})` : `${engine.count} page(s)`}`);
  }

  const summary = buildSummary({ bing, ddg, sitemap, verification, robots, previous, newUrls });
  log(`\n${summary}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }

  state.runs = [
    ...state.runs,
    {
      at: new Date().toISOString(),
      sitemap: sitemap.count,
      bing: bing.count,
      ddg: ddg.count,
      verified: verification.metaTag || verification.xmlFile,
      urls: currentUrls.sort(),
    },
  ].slice(-HISTORY_LIMIT);
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
