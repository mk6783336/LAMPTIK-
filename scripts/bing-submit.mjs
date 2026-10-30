#!/usr/bin/env node
/**
 * Push sitemap URLs into Bing's crawl queue via `SubmitUrlBatch`.
 *
 * Why this exists: the index check found 40 URLs "discovered but never
 * crawled" — Bing had read the sitemap and recorded the URLs, but had fetched
 * none of them. A sitemap is a passive signal; an explicit submission is the
 * API's way of saying "these are live, fetch them now".
 *
 * WHY IT IS SELECTIVE BY DEFAULT
 * ------------------------------
 * Bing allows 100 submissions/day and 200/month for this site. Re-submitting
 * all 51 URLs every week would spend 204 a month — exhausting the quota and
 * turning a useful signal into noise Bing learns to ignore. So the weekly run
 * uses `--new-only`, which submits only URLs that have never been submitted
 * (plus optionally ones that have gone stale), and records what it sent in
 * `.bing-submit-state.json`.
 *
 * Anyone can still push everything with a bare `node scripts/bing-submit.mjs`.
 *
 * It is rate-limit aware in both directions:
 *   - Bing throttles per host (`ErrorCode 5 / ThrottleHost`), so throttled
 *     calls back off and retry rather than being counted as failures.
 *   - Bing caps submissions, so the quota is read *first* and the run aborts
 *     with the remaining allowance rather than half submitting a batch.
 *
 * Env:
 *   BING_WEBMASTER_API_KEY  required unless --skip-if-unconfigured
 *   INDEX_CHECK_ORIGIN      default https://www.lamptik.online
 *   BING_SUBMIT_STATE       default .bing-submit-state.json
 *   BING_SUBMIT_DRY         "1" = resolve everything, submit nothing
 *
 * Flags:
 *   --new-only                 submit only URLs absent from the state file
 *   --stale-after-days N       (with --new-only) also re-push URLs last sent
 *                              more than N days ago
 *   --skip-if-unconfigured     exit 0 with a notice when no key is set
 *
 * Exit codes: 0 = submitted, nothing to do, or intentionally skipped;
 * 1 = failure.
 */

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const KEY = (process.env.BING_WEBMASTER_API_KEY ?? "").trim();
const DRY = process.env.BING_SUBMIT_DRY === "1";
const STATE_PATH = process.env.BING_SUBMIT_STATE ?? ".bing-submit-state.json";
const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Headroom left unused so a retry or a manual submission cannot hit the cap. */
const QUOTA_MARGIN = Number(process.env.BING_SUBMIT_MARGIN ?? 5);

const argv = process.argv.slice(2);
const NEW_ONLY = argv.includes("--new-only");
const SKIP_IF_UNCONFIGURED = argv.includes("--skip-if-unconfigured");
const staleIndex = argv.indexOf("--stale-after-days");
const STALE_DAYS = staleIndex >= 0 ? Number(argv[staleIndex + 1]) : 0;

const { readFile, writeFile } = await import("node:fs/promises");

/** Compare site URLs ignoring scheme, `www.` and a trailing slash. */
function siteKeyOf(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.host.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return String(value).toLowerCase();
  }
}

async function api(method, params = {}, { post = false } = {}) {
  const url = new URL(`${BASE}/${method}`);
  url.searchParams.set("apikey", KEY);
  const init = { signal: AbortSignal.timeout(30_000) };
  if (post) {
    init.method = "POST";
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(params);
  } else {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }

  const response = await fetch(url, init);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON gateway page */
  }
  return {
    status: response.status,
    json,
    error: json?.ErrorCode ? `API error ${json.ErrorCode}: ${json.Message ?? "unknown"}` : null,
  };
}

/** Retry while Bing says the host (not the request) is being throttled. */
async function apiWithRetry(method, params, options) {
  let result = await api(method, params, options);
  for (let attempt = 1; attempt <= MAX_RETRIES && /ThrottleHost/i.test(result.error ?? ""); attempt += 1) {
    const wait = 3_000 * attempt;
    console.log(`throttled — waiting ${wait / 1000}s (retry ${attempt}/${MAX_RETRIES})`);
    await sleep(wait);
    result = await api(method, params, options);
  }
  return result;
}

async function sitemapUrls() {
  const response = await fetch(`${ORIGIN}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`sitemap HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);
}

async function loadState() {
  try {
    const parsed = JSON.parse(await readFile(STATE_PATH, "utf8"));
    if (parsed && typeof parsed.submitted === "object") return parsed;
  } catch {
    /* first run */
  }
  return { submitted: {} };
}

/**
 * A URL is due when it has never been sent, or when it was sent longer ago than
 * the caller's staleness window. Without the window, a page that Bing accepted
 * and then ignored would never be nudged again.
 */
function selectDue(urls, state) {
  const now = Date.now();
  const due = [];
  let skipped = 0;
  for (const url of urls) {
    const last = state.submitted[url];
    if (!last) {
      due.push(url);
      continue;
    }
    const ageDays = (now - Date.parse(last)) / 86_400_000;
    if (STALE_DAYS > 0 && Number.isFinite(ageDays) && ageDays >= STALE_DAYS) {
      due.push(url);
    } else {
      skipped += 1;
    }
  }
  return { due, skipped };
}

async function main() {
  if (!KEY) {
    if (SKIP_IF_UNCONFIGURED) {
      console.log("skipped — BING_WEBMASTER_API_KEY is not configured");
      return;
    }
    console.error("BING_WEBMASTER_API_KEY is not set");
    process.exit(1);
  }

  const allUrls = await sitemapUrls();
  console.log(`sitemap: ${allUrls.length} URL(s) from ${ORIGIN}/sitemap.xml`);

  const state = await loadState();
  const { due, skipped } = NEW_ONLY ? selectDue(allUrls, state) : { due: allUrls, skipped: 0 };
  if (NEW_ONLY) {
    console.log(`new-only: ${due.length} due, ${skipped} already submitted`);
  }
  if (due.length === 0) {
    console.log("nothing new to submit");
    return;
  }

  const sites = await apiWithRetry("GetUserSites");
  if (sites.error) {
    console.error(`GetUserSites failed — ${sites.error}`);
    process.exit(1);
  }
  const site = (sites.json?.d ?? []).find((entry) => siteKeyOf(entry.Url) === siteKeyOf(ORIGIN));
  if (!site) {
    console.error(`site not in account; saw: ${(sites.json?.d ?? []).map((s) => s.Url).join(", ") || "none"}`);
    process.exit(1);
  }
  if (site.IsVerified === false) {
    console.error(`${site.Url} is in the account but not verified`);
    process.exit(1);
  }
  console.log(`site: ${site.Url} (verified)`);

  const quota = await apiWithRetry("GetUrlSubmissionQuota", { siteUrl: site.Url });
  const remaining = quota.json?.d?.DailyQuota;
  console.log(`quota: ${remaining ?? "?"} submission(s) left today`);

  // Send what the quota allows rather than nothing at all. Aborting on a full
  // batch means a first run against a 200-URL sitemap can never make progress;
  // a short batch just leaves the remainder for next week, because only the
  // URLs actually sent are recorded in the state file.
  let batch = due;
  if (typeof remaining === "number") {
    const allowance = Math.max(0, remaining - QUOTA_MARGIN);
    if (allowance === 0) {
      console.log(`no submission quota left today (${remaining}) — leaving all ${due.length} for the next run`);
      return;
    }
    if (due.length > allowance) {
      batch = due.slice(0, allowance);
      console.log(`quota allows ${allowance}; submitting ${batch.length} of ${due.length} (rest next run)`);
    }
  }

  if (DRY) {
    console.log(`dry run — would submit ${batch.length} URL(s), nothing sent`);
    for (const url of batch) console.log(`  ${url}`);
    return;
  }

  const result = await apiWithRetry("SubmitUrlBatch", { siteUrl: site.Url, urlList: batch }, { post: true });
  if (result.error) {
    console.error(`SubmitUrlBatch failed — ${result.error}`);
    process.exit(1);
  }
  if (result.status !== 200) {
    console.error(`SubmitUrlBatch failed — HTTP ${result.status}`);
    process.exit(1);
  }

  console.log(`submitted ${batch.length} URL(s) — HTTP ${result.status}`);

  // Recorded only after Bing accepts the batch, so a failed run does not mark
  // URLs as sent and silently never retry them.
  const stamp = new Date().toISOString();
  for (const url of batch) state.submitted[url] = stamp;
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`state: ${STATE_PATH} now tracks ${Object.keys(state.submitted).length} URL(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
