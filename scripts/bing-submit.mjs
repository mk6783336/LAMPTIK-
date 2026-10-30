#!/usr/bin/env node
/**
 * Push every sitemap URL into Bing's crawl queue via `SubmitUrlBatch`.
 *
 * Why this exists: the weekly index check found 40 URLs "discovered but never
 * crawled" — Bing had read the sitemap and recorded the URLs, but had not
 * fetched a single page. A submitted sitemap is a passive signal; an explicit
 * submission is the API's way of saying "these are live, fetch them now".
 *
 * It is rate-limit aware in both directions:
 *   - Bing throttles per host (`ErrorCode 5 / ThrottleHost`), so throttled
 *     calls back off and retry rather than being counted as failures.
 *   - Bing caps submissions per day and per month, so the quota is read *first*
 *     and the run aborts with the remaining allowance rather than half
 *     submitting a batch and burning the rest.
 *
 * Nothing is submitted unless the site is confirmed in the account, which is
 * also what proves the key is valid.
 *
 * Env:
 *   BING_WEBMASTER_API_KEY  required
 *   INDEX_CHECK_ORIGIN      default https://www.lamptik.online
 *   BING_SUBMIT_DRY         "1" = resolve everything, submit nothing
 *
 * Exit codes: 0 = submitted (or nothing to submit), 1 = failure.
 */

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const KEY = (process.env.BING_WEBMASTER_API_KEY ?? "").trim();
const DRY = process.env.BING_SUBMIT_DRY === "1";
const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function main() {
  if (!KEY) {
    console.error("BING_WEBMASTER_API_KEY is not set");
    process.exit(1);
  }

  const urls = await sitemapUrls();
  console.log(`sitemap: ${urls.length} URL(s) from ${ORIGIN}/sitemap.xml`);

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

  if (typeof remaining === "number" && urls.length > remaining) {
    console.error(
      `refusing to submit: ${urls.length} URLs exceeds the ${remaining} left today. Nothing was sent.`,
    );
    process.exit(1);
  }

  if (DRY) {
    console.log(`dry run — would submit ${urls.length} URL(s), nothing sent`);
    return;
  }

  const result = await apiWithRetry("SubmitUrlBatch", { siteUrl: site.Url, urlList: urls }, { post: true });
  if (result.error) {
    console.error(`SubmitUrlBatch failed — ${result.error}`);
    process.exit(1);
  }
  if (result.status !== 200) {
    console.error(`SubmitUrlBatch failed — HTTP ${result.status}`);
    process.exit(1);
  }

  console.log(`submitted ${urls.length} URL(s) — HTTP ${result.status}`);
  for (const url of urls) console.log(`  ${url}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
