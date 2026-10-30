#!/usr/bin/env node
/**
 * Weekly indexing health report for Bing and DuckDuckGo.
 *
 * Three tiers, in order of trust:
 *
 *   1. **Bing Webmaster API** — used whenever `BING_WEBMASTER_API_KEY` is set.
 *      This is the only authoritative source. It checks every URL in our own
 *      sitemap against Bing's index records, so the report says exactly which
 *      pages Bing knows about rather than guessing from a search page.
 *   2. **Validated scrape** — no key configured. A `site:` query is only
 *      trusted after a control query proves the engine still answers honestly.
 *   3. **Unmeasurable** — reported as such, never as zero.
 *
 * Why tier 2 exists at all: Bing serves unrelated filler to automated clients
 * (a `site:wikipedia.org` query returns Reddit and microsoft.com links), and
 * DuckDuckGo answers 202 with an anti-automation page. A naive scraper reads
 * "the engine refused to answer" as "0 indexed", which is a false diagnosis this
 * project already made once. The control check prevents a repeat.
 *
 * Why per-URL and not a total: the Webmaster API has **no aggregate indexed-page
 * count**. `GetUrlInfo` returns an index record (`HttpStatus`, `LastCrawledDate`,
 * `IsPage`) for a URL, or `null` if Bing does not know it. Counting the non-null
 * answers across our 51 sitemap URLs is therefore a real, reproducible number —
 * and a more useful one than a total, because it names the missing pages.
 *
 * Always measured, with or without a key: sitemap size, robots.txt admission of
 * Bingbot, and whether Bing verification is configured.
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

/** The public API key from Bing Webmaster Tools → Settings → API access. */
const BING_API_KEY = (process.env.BING_WEBMASTER_API_KEY ?? "").trim();
const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

/**
 * Upper bound on per-URL lookups, and a wall-clock budget so a throttled API
 * cannot stretch a scheduled run past its workflow timeout. A partial answer
 * with an explicit count of how many URLs were checked is still useful; a
 * killed job produces nothing.
 */
const URL_LIMIT = Number(process.env.INDEX_CHECK_URL_LIMIT ?? 60);
const API_BUDGET_MS = Number(process.env.INDEX_CHECK_API_BUDGET_MS ?? 300_000);

/**
 * Bing throttles per host aggressively (`ErrorCode: 5, "ERROR!!! ThrottleHost"`)
 * and starts rejecting after roughly ten rapid calls. Spacing requests is what
 * keeps a 51-URL sweep inside the limit; the retry handles the remainder.
 */
const PACE_MS = Number(process.env.INDEX_CHECK_PACE_MS ?? 1_400);
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bing serialises dates as `/Date(-62135596800000)/` — .NET's `DateTime.MinValue`
 * (0001-01-01). Every field of an uncrawled URL is that sentinel, so treating a
 * non-empty string as a real date reports pages as "crawled" when they have
 * never been fetched.
 */
function isRealDate(value) {
  const match = /\/Date\((-?\d+)\)\//.exec(String(value ?? ""));
  return Boolean(match) && Number(match[1]) > 0;
}

/** A domain with an enormous, unquestionably-indexed page set. */
const CONTROL_HOST = "wikipedia.org";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const log = (message) => console.log(message);

async function fetchText(url, { cookie, timeout = 30_000, accept = "text/html,application/xhtml+xml" } = {}) {
  const headers = { "user-agent": UA, accept, "accept-language": "en-US,en;q=0.9" };
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

// ---------------------------------------------------------------------------
// Tier 1 — Bing Webmaster API
// ---------------------------------------------------------------------------

/**
 * The API is a JSON GET: `/{method}?apikey=…&param=…`. It answers HTTP 200 for
 * application-level errors too, putting the failure in the body, so callers must
 * check `d` rather than trust the status code.
 */
async function bingApi(method, params = {}) {
  const url = new URL(`${BING_API_BASE}/${method}`);
  url.searchParams.set("apikey", BING_API_KEY);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const { status, body, error } = await fetchText(url.toString(), {
    accept: "application/json",
    timeout: 30_000,
  });
  if (error) return { status, error, data: null };

  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* non-JSON: a gateway error page, reported below with a body excerpt */
  }
  // An invalid key answers HTTP 400 with `{"ErrorCode":3,"Message":"ERROR!!!
  // InvalidApiKey"}`. Checked before the status code so the report says why the
  // key was rejected instead of just "HTTP 400".
  if (json?.ErrorCode) {
    return { status, error: `API error ${json.ErrorCode}: ${json.Message ?? "unknown"}`.trim(), data: null };
  }
  if (status !== 200) return { status, error: `HTTP ${status}`, data: null };
  if (json === null) return { status, error: `non-JSON response: ${body.slice(0, 80)}`, data: null };
  return { status, error: null, data: json.d ?? null };
}

/** Compare sites ignoring scheme, `www.` and a trailing slash. */
function siteKey(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.host.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return String(value).toLowerCase();
  }
}

async function measureBingApi(sitemapUrls) {
  const sites = await bingApi("GetUserSites");
  if (sites.error) return { error: `GetUserSites failed — ${sites.error}` };
  if (!Array.isArray(sites.data)) return { error: "GetUserSites returned no site list" };

  const match = sites.data.find((site) => siteKey(site.Url ?? "") === siteKey(HOST));
  if (!match) {
    return {
      error: `site not in the account (verified sites: ${sites.data.map((s) => s.Url).join(", ") || "none"}) — verify ${HOST} first`,
    };
  }
  if (match.IsVerified === false) return { error: `${match.Url} is in the account but not verified` };

  const startedAt = Date.now();
  const indexed = [];
  const discovered = [];
  const notKnown = [];
  const statuses = new Map();
  let checked = 0;
  let unchecked = 0;
  let stoppedEarly = null;

  for (const url of sitemapUrls.slice(0, URL_LIMIT)) {
    if (Date.now() - startedAt > API_BUDGET_MS) {
      stoppedEarly = "time budget reached";
      break;
    }

    let result = await bingApi("GetUrlInfo", { siteUrl: match.Url, url });
    // Throttling is a "did not ask", never a "not in the index". Back off and
    // retry; anything still failing is counted as unchecked, not as missing.
    for (let attempt = 1; result.error && /ThrottleHost|HTTP 429/i.test(result.error) && attempt <= MAX_RETRIES; attempt += 1) {
      await sleep(2_500 * attempt);
      result = await bingApi("GetUrlInfo", { siteUrl: match.Url, url });
    }

    checked += 1;
    if (result.status === 429 || /ThrottleHost/i.test(result.error ?? "")) {
      unchecked += 1;
      continue;
    }
    if (result.error) {
      unchecked += 1;
      continue;
    }

    if (!result.data) {
      notKnown.push(url);
      continue;
    }

    const code = Number(result.data.HttpStatus ?? 0);
    // Bing returns a skeleton record (HttpStatus 0, zero-size, MinValue dates)
    // for a URL it has discovered but never fetched. That is not an index entry.
    if (isRealDate(result.data.LastCrawledDate) && code >= 200 && code < 400) {
      indexed.push(url);
      statuses.set(String(code), (statuses.get(String(code)) ?? 0) + 1);
    } else {
      discovered.push(url);
    }

    await sleep(PACE_MS);
  }

  return {
    error: null,
    siteUrl: match.Url,
    indexed,
    discovered,
    notKnown,
    statuses: Object.fromEntries([...statuses.entries()].sort()),
    checked,
    unchecked,
    total: sitemapUrls.length,
    stoppedEarly,
  };
}

// ---------------------------------------------------------------------------
// Tier 2 — validated scrape (no key)
// ---------------------------------------------------------------------------

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
 * Bing does not link results directly: every href is
 * `bing.com/ck/a?...&u=a1<base64url of the real URL>`, so the wrapper has to be
 * unwrapped before anything can be counted.
 */
function extractBingResults(html, host) {
  const found = new Set();
  for (const match of html.matchAll(/u=a1([A-Za-z0-9_-]+)/g)) {
    try {
      const decoded = Buffer.from(match[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      if (!/^https?:\/\//.test(decoded)) continue;
      const normalized = normalize(decoded, host);
      if (normalized) found.add(normalized);
    } catch {
      /* malformed payload — skip */
    }
  }
  return found;
}

function extractDdgResults(html, host) {
  const found = new Set();
  for (const match of html.matchAll(/[?&]uddg=([^"&]+)/g)) {
    try {
      const normalized = normalize(decodeURIComponent(match[1]), host);
      if (normalized) found.add(normalized);
    } catch {
      /* malformed payload — skip */
    }
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
  // 202 is DuckDuckGo's anti-automation response, not an empty result set.
  if (status !== 200) return { status, urls: [], error: `HTTP ${status}` };
  return { status, urls: [...extractDdgResults(body, host)], error: null };
}

/**
 * Runs the target query only when the control query proved the engine still
 * answers honestly. Returns `count: null` when it did not — never `0`.
 */
async function measureEnterpriseScrape({ name, key, query, cookie }) {
  const control = await query(CONTROL_HOST, cookie);
  if (control.error) return { name, key, count: null, urls: [], reason: `control query failed (${control.error})` };
  if (control.urls.length === 0) {
    return {
      name,
      key,
      count: null,
      urls: [],
      reason: `control domain returned no results for site:${CONTROL_HOST} — the engine is serving a degraded page to automated clients`,
    };
  }

  const target = await query(HOST, cookie);
  if (target.error) return { name, key, count: null, urls: [], reason: `target query failed (${target.error})` };
  return { name, key, count: target.urls.length, urls: target.urls, reason: null };
}

// ---------------------------------------------------------------------------
// Always-measurable signals
// ---------------------------------------------------------------------------

async function checkSitemap() {
  const { status, body } = await fetchText(`${ORIGIN}/sitemap.xml`);
  if (status !== 200) return { status, count: null, urls: [] };
  const urls = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);
  return { status, count: urls.length, urls };
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
  const bingGroup = body.split(/user-agent:/i).find((part) => /^\s*bingbot/i.test(part));
  const allowsBingbot = bingGroup ? !/disallow:\s*\/\s*($|\n)/i.test(bingGroup) : /allow:\s*\//i.test(body);
  return { status, allowsBingbot, sitemap: /sitemap:/i.test(body) };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

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

function buildSummary({ bing, bingApi, ddg, sitemap, verification, robots, previous, newUrls }) {
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

  if (bingApi && !bingApi.error) {
    lines.push(
      `| Bing — indexed (crawled, 2xx/3xx) | **${bingApi.indexed.length}** | ${delta(bingApi.indexed.length, prev.bing)} |`,
      `| Bing — discovered, never crawled | ${bingApi.discovered.length} | — |`,
      `| Bing — not known at all | ${bingApi.notKnown.length} | — |`,
      `| Bing — unchecked (throttled) | ${bingApi.unchecked} | — |`,
    );
  } else {
    lines.push(`| Bing | ${bing.count === null ? "unmeasurable" : bing.count} | ${delta(bing.count, prev.bing)} |`);
  }
  lines.push(`| DuckDuckGo | ${ddg.count === null ? "unmeasurable" : ddg.count} | ${delta(ddg.count, prev.ddg)} |`, "");

  if (bingApi && !bingApi.error) {
    const codes = Object.entries(bingApi.statuses)
      .map(([code, count]) => `${code}: ${count}`)
      .join(", ");
    lines.push(
      `Of the ${bingApi.checked} sitemap URLs checked` +
        (bingApi.total > bingApi.checked ? ` (of ${bingApi.total})` : "") +
        `, **${bingApi.indexed.length}** are indexed, **${bingApi.discovered.length}** are discovered but never crawled, ` +
        `and **${bingApi.notKnown.length}** are unknown to Bing.`,
      "",
    );
    if (codes) lines.push(`HTTP status of indexed URLs — ${codes}`, "");
    if (bingApi.stoppedEarly) lines.push(`> Partial result: ${bingApi.stoppedEarly}.`, "");
    if (bingApi.unchecked > 0) {
      lines.push(
        `> [!NOTE]`,
        `> ${bingApi.unchecked} lookup(s) were throttled by Bing and are excluded from every count above —`,
        `> they are unknown, not missing. The totals are a lower bound.`,
        "",
      );
    }
    if (bingApi.discovered.length > 0) {
      lines.push(
        `<details><summary>${bingApi.discovered.length} URL(s) discovered but never crawled</summary>`,
        "",
        ...bingApi.discovered.map((url) => `- ${url}`),
        "",
        "</details>",
        "",
      );
    }
    if (bingApi.notKnown.length > 0) {
      lines.push(
        `<details><summary>${bingApi.notKnown.length} URL(s) Bing does not know yet</summary>`,
        "",
        ...bingApi.notKnown.map((url) => `- ${url}`),
        "",
        "</details>",
        "",
      );
    }
  } else if (bingApi?.error) {
    lines.push(
      `> [!WARNING]`,
      `> Bing Webmaster API was configured but failed: ${bingApi.error}`,
      `> Falling back to the validated scrape below, which cannot measure a bot-facing search endpoint.`,
      "",
    );
  }

  for (const engine of [bing, ddg]) {
    if (engine.reason) lines.push(`- **${engine.name} unmeasurable** — ${engine.reason}.`);
  }
  if (bing.reason || ddg.reason) {
    lines.push(
      "",
      "> [!IMPORTANT]",
      "> `unmeasurable` says nothing about whether the site is indexed — it means the engine refused to answer a bot.",
      ...(BING_API_KEY
        ? []
        : ["> Set the `BING_WEBMASTER_API_KEY` secret for an authoritative Bing count; see `docs/bing-webmaster-setup.md`."]),
      "",
    );
  }

  // The meta tag and XML file are only two of Bing's verification methods; a
  // site verified by DNS or imported from Search Console leaves neither on the
  // page. The API answering for the property is proof enough, so the warning
  // is only honest when the API did not confirm it.
  const apiConfirmsVerification = Boolean(bingApi && !bingApi.error);
  if (!verification.metaTag && !verification.xmlFile && !apiConfirmsVerification) {
    lines.push(
      "> [!WARNING]",
      "> Bing Webmaster Tools verification is **not configured**. Until it is, Bing has no sitemap attached and no crawl priority.",
      "> Importing the property from Google Search Console needs no token.",
      "",
    );
  }

  if (newUrls.length > 0) {
    lines.push(`<details><summary>${newUrls.length} newly seen URL(s)</summary>`, "");
    lines.push(...newUrls.map((url) => `- ${url}`));
    lines.push("", "</details>", "");
  }

  lines.push("_Bing's index lags its crawl by days; treat one week as noise and four as the trend._");
  return lines.join("\n");
}

async function main() {
  log(`Indexing health for ${ORIGIN}`);

  const [sitemap, verification, robots] = await Promise.all([
    checkSitemap(),
    checkVerification(),
    checkRobots(),
  ]);

  let bingApi = null;
  if (BING_API_KEY) {
    log("Bing: using Webmaster API");
    bingApi = await measureBingApi(sitemap.urls);
    if (bingApi.error) log(`Bing API error: ${bingApi.error}`);
  } else {
    log("Bing: no BING_WEBMASTER_API_KEY — falling back to a validated scrape");
  }

  let bing;
  if (bingApi && !bingApi.error) {
    bing = { name: "Bing", key: "bing", count: bingApi.indexed.length, urls: bingApi.indexed, reason: null };
  } else {
    // Scrape whenever the API did not produce an answer — no key at all, or a
    // key that was rejected. A cookie from the Bing front page is what a
    // browser would have; without it the endpoint answers with more filler.
    const home = await fetchText("https://www.bing.com/?cc=US");
    const cookie = home.cookies.map((entry) => entry.split(";")[0]).join("; ");
    const scrape = await measureEnterpriseScrape({ name: "Bing", key: "bing", query: bingQuery, cookie });
    bing = bingApi?.error
      ? { ...scrape, reason: scrape.reason ? `${scrape.reason}; API also failed (${bingApi.error})` : scrape.reason }
      : scrape;
  }

  const ddg = await measureEnterpriseScrape({ name: "DuckDuckGo", key: "ddg", query: ddgQuery });

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
  if (bingApi && !bingApi.error) {
    log(
      `bing         ${bingApi.indexed.length} indexed, ${bingApi.discovered.length} discovered-not-crawled, ` +
        `${bingApi.notKnown.length} unknown, ${bingApi.unchecked} unchecked`,
    );
  } else {
    log(`bing         ${bing.count === null ? `unmeasurable (${bing.reason})` : `${bing.count} page(s)`}`);
  }
  log(`ddg          ${ddg.count === null ? `unmeasurable (${ddg.reason})` : `${ddg.count} page(s)`}`);

  const summary = buildSummary({ bing, bingApi, ddg, sitemap, verification, robots, previous, newUrls });
  log(`\n${summary}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }

  state.runs = [
    ...state.runs,
    {
      at: new Date().toISOString(),
      sitemap: sitemap.count,
      // A throttled sweep is a lower bound; storing it would make next week's
      // delta look like a drop that did not happen.
      bing: bingApi && !bingApi.error && bingApi.unchecked > 0 ? null : bing.count,
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
