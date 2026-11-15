#!/usr/bin/env node
/**
 * Automated backlinks & crawler discovery.
 *
 * Run:  npm run seo:backlinks
 *
 * Three steps, each independently reported so one rate-limited service cannot
 * hide the result of the others:
 *
 *   1. Wayback Machine — one public capture of the homepage and the twelve
 *      pages that carry commercial or guide intent, paced at 3s so archive.org
 *      does not answer 429 for the rest of the run.
 *   2. IndexNow — every URL from all three sitemaps, posted to the IndexNow
 *      hub, Bing and Yandex so partner engines recrawl on their next pass.
 *   3. Google Search Console — each sitemap submitted through the official
 *      Sitemaps API (scripts/gsc-sitemaps.mjs). Google retired the old
 *      /ping?sitemap= endpoint in 2023, so an anonymous ping is reported as
 *      unavailable rather than treated as a successful re-crawl request.
 *
 * Exit codes: 0 = IndexNow accepted at least one endpoint and every GSC
 * submission that could run succeeded; 1 = nothing was accepted, or a GSC
 * submission failed. Wayback is best-effort: archive.org throttles by design
 * and a 429 there does not undo the other two steps.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ORIGIN = (process.env.BACKLINKS_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const HOST = new URL(ORIGIN).host;
/** Public by design: IndexNow requires it to be readable at `${ORIGIN}/${KEY}.txt`. */
const KEY = process.env.INDEXNOW_KEY ?? "c86ddae551e849899111899822e395ff";
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const SITEMAPS = ["/sitemap.xml", "/sitemap-priority.xml", "/sitemap-en-core.xml"];
const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PACING_MS = Number(process.env.BACKLINKS_PACING_MS ?? 3_000);
/** Re-verify captures made earlier in the same maintenance window. */
const SINCE_MS = Number(process.env.BACKLINKS_SINCE_MS ?? 0);
const DRY_RUN = process.argv.includes("--dry");
const SKIP_WAYBACK = process.argv.includes("--no-wayback");
const SKIP_GSC = process.argv.includes("--no-gsc");
/** Archive.org throttles hard; run the critical submissions first, captures after. */
const WAYBACK_ONLY = process.argv.includes("--wayback-only");

/** Homepage plus the twelve pages worth a public capture, in fetch order. */
const CORE_PATHS = [
  "/",
  "/facebook-video-downloader",
  "/pt/facebook-video-downloader",
  "/twitter-video-downloader",
  "/tiktok-photo-downloader",
  "/instagram-reels-downloader",
  "/youtube-downloader",
  "/youtube-shorts-downloader",
  "/tools",
  "/guides",
  "/guides/measured-video-files-vs-1080p-labels",
  "/apps",
  "/tiktok-mp3-downloader",
];

const log = (...parts) => console.log("[backlinks]", ...parts);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, accept: "*/*", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(45_000),
  });
  return { status: response.status, ok: response.ok, body: await response.text() };
}

/** Every `<loc>` from the three sitemaps, deduplicated and same-host only. */
async function sitemapUrls() {
  const all = new Map();
  const perFile = [];
  for (const sitemap of SITEMAPS) {
    const url = `${ORIGIN}${sitemap}`;
    try {
      const { status, body } = await fetchText(url);
      const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => match[1].trim())
        .filter((candidate) => {
          try {
            return new URL(candidate).host === HOST;
          } catch {
            return false;
          }
        });
      for (const candidate of urls) all.set(candidate, true);
      perFile.push({ sitemap, status, count: urls.length });
      log(`${sitemap}: HTTP ${status}, ${urls.length} URL(s)`);
    } catch (error) {
      perFile.push({ sitemap, status: 0, count: 0 });
      log(`${sitemap}: failed (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  return { urls: [...all.keys()], perFile };
}

async function verifyKeyFile() {
  try {
    const { status, body } = await fetchText(KEY_LOCATION);
    const valid = status === 200 && body.trim() === KEY;
    log(`key file ${KEY_LOCATION} -> HTTP ${status}${valid ? " (matches)" : " (MISMATCH)"}`);
    return valid;
  } catch (error) {
    log(`key file check failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/** One Save Page Now capture; archive.org answers 302 to the finished snapshot. */
async function captureOnce(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`https://web.archive.org/save/${url}`, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      // Save Page Now often hangs rather than answering 429; a short deadline
      // keeps one stuck URL from consuming the whole run.
      signal: AbortSignal.timeout(25_000),
    });
    const body = await response.text().catch(() => "");
    const snapshot =
      /https?:\/\/web\.archive\.org\/web\/\d+\/[^\s"'<>]+/.exec(body)?.[0] ??
      /https?:\/\/web\.archive\.org\/web\/\d+\/[^\s"'<>]+/.exec(response.url)?.[0] ??
      null;
    return {
      url,
      status: response.status,
      ok: response.ok,
      snapshot,
      seconds: Math.round((Date.now() - startedAt) / 100) / 10,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      snapshot: null,
      error: error instanceof Error ? error.message : String(error),
      seconds: Math.round((Date.now() - startedAt) / 100) / 10,
    };
  }
}

/** Wayback timestamp format used by both APIs: YYYYMMDDhhmmss (UTC). */
const waybackStamp = (ms) => new Date(ms).toISOString().replace(/[-:T]/g, "").slice(0, 14);

/**
 * The save endpoint answers 429 or redirects to the CDX asset of a script tag,
 * so its HTTP status is not proof of anything. The availability API is: it
 * returns the newest snapshot and its timestamp, which must be from this run.
 */
async function availabilitySince(url, sinceMs) {
  try {
    const response = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${waybackStamp(sinceMs)}`,
      { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
    );
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    const closest = body?.archived_snapshots?.closest;
    if (!closest?.available || String(closest.status) !== "200" || !closest.url) return null;
    if (Number(closest.timestamp) < Number(waybackStamp(sinceMs))) return null;
    return String(closest.url).replace(/^http:/, "https:");
  } catch {
    return null;
  }
}

/** One save attempt, then proof from the availability API; one retry on 429. */
async function capture(url) {
  const startedAt = Date.now();
  // Two minutes of clock skew between us and archive.org; an explicit window
  // start lets a retry confirm captures made minutes earlier.
  const since = SINCE_MS || startedAt - 120_000;
  const first = await captureOnce(url);
  let snapshot = await availabilitySince(url, since);
  let last = first;
  let retried = false;
  if (!snapshot && first.status === 429) {
    await sleep(5_000);
    last = await captureOnce(url);
    retried = true;
    snapshot = await availabilitySince(url, since);
  }
  return {
    url,
    status: snapshot ? 200 : last.status,
    ok: Boolean(snapshot),
    snapshot,
    retried,
    error: last.error,
    seconds: Math.round((Date.now() - startedAt) / 100) / 10,
  };
}

async function wayback() {
  if (SKIP_WAYBACK) {
    log("Wayback: skipped (--no-wayback)");
    return [];
  }
  const results = [];
  for (const [index, path] of CORE_PATHS.entries()) {
    const url = `${ORIGIN}${path}`;
    if (DRY_RUN) {
      log(`Wayback: would capture ${url}`);
      results.push({ url, status: 0, ok: true, dry: true });
      continue;
    }
    const result = await capture(url);
    results.push(result);
    log(
      `Wayback ${index + 1}/${CORE_PATHS.length} ${url} -> ${result.ok ? "captured" : `HTTP ${result.status || "none"}`}` +
        `${result.snapshot ? ` ${result.snapshot}` : ""}` +
        `${result.error ? ` (${result.error})` : ""} (${result.seconds}s)`,
    );
    if (index < CORE_PATHS.length - 1) await sleep(PACING_MS);
  }
  return results;
}

async function indexNow(urls) {
  if (!(await verifyKeyFile())) return { accepted: 0, results: [] };
  if (urls.length === 0) {
    log("IndexNow: no URLs to submit");
    return { accepted: 0, results: [] };
  }
  if (DRY_RUN) {
    log(`IndexNow: would submit ${urls.length} URL(s) to ${INDEXNOW_ENDPOINTS.length} endpoint(s)`);
    return { accepted: 0, results: [], dry: true };
  }

  const payload = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  });
  const results = [];
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8", "user-agent": UA },
        body: payload,
        signal: AbortSignal.timeout(30_000),
      });
      const body = (await response.text()).slice(0, 300);
      const ok = response.status === 200 || response.status === 202;
      results.push({ endpoint, status: response.status, ok, body });
      log(`IndexNow POST ${endpoint} -> HTTP ${response.status} ${body}`.trim());
    } catch (error) {
      results.push({
        endpoint,
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      log(
        `IndexNow POST ${endpoint} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return { accepted: results.filter((result) => result.ok).length, results };
}

function credentialPath() {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  for (const candidate of [explicit, ".scratch/ga4-key.json", ".scratch/indexing-key.json"]) {
    if (!candidate) continue;
    if (existsSync(path.resolve(process.cwd(), candidate))) return candidate;
  }
  return null;
}

/**
 * Submit each sitemap through the Search Console API. The existing script owns
 * the JWT flow, permission checks and read-back, so this only runs it once per
 * feed and reports what Google said instead of re-implementing it.
 */
function gscSitemaps() {
  if (SKIP_GSC) {
    log("GSC: skipped (--no-gsc)");
    return [];
  }
  if (!credentialPath()) {
    log("GSC: no service-account key — set GOOGLE_APPLICATION_CREDENTIALS; sitemaps not re-pinged");
    return [];
  }
  if (DRY_RUN) {
    log(`GSC: would submit ${SITEMAPS.join(", ")}`);
    return [];
  }

  const results = [];
  for (const sitemap of SITEMAPS) {
    const feed = `${ORIGIN}${sitemap}`;
    const run = spawnSync(process.execPath, ["scripts/gsc-sitemaps.mjs"], {
      env: { ...process.env, GSC_FEED: feed },
      encoding: "utf8",
      timeout: 90_000,
    });
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
    const http = /PUT sitemap → HTTP (\d+)/.exec(output)?.[1] ?? null;
    const ok = run.status === 0 && (http === "200" || http === "204");
    results.push({ feed, ok, exit: run.status, http, output });
    log(`GSC ${sitemap} -> exit ${run.status}, PUT HTTP ${http ?? "?"}`);
    for (const line of output.split("\n").filter((line) => /lastSubmitted|lastDownloaded|errors|warnings|permission|failed/.test(line))) {
      log(`  ${line.trim()}`);
    }
  }
  return results;
}

async function main() {
  log(`origin ${ORIGIN}`);
  const { urls, perFile } = await sitemapUrls();
  if (urls.length === 0) {
    log("no sitemap URLs — refusing to submit");
    process.exitCode = 1;
    return;
  }
  log(`${urls.length} unique URL(s) across ${perFile.length} sitemap(s)`);

  const snapshots = await wayback();
  const indexNowResult = WAYBACK_ONLY
    ? { accepted: 0, results: [], skipped: true }
    : await indexNow(urls);
  const gscResults = WAYBACK_ONLY ? [] : gscSitemaps();

  const snapOk = snapshots.filter((result) => result.ok).length;
  const gscOk = gscResults.filter((result) => result.ok).length;

  log("summary");
  log(
    DRY_RUN
      ? `  Wayback: ${snapshots.length} capture(s) planned`
      : `  Wayback: ${snapOk}/${snapshots.length} captured`,
  );
  log(
    WAYBACK_ONLY
      ? "  IndexNow: skipped (--wayback-only)"
      : DRY_RUN
        ? `  IndexNow: ${urls.length} URL(s) would go to ${INDEXNOW_ENDPOINTS.length} endpoint(s)`
        : `  IndexNow: ${indexNowResult.accepted}/${INDEXNOW_ENDPOINTS.length} endpoint(s) accepted, ${urls.length} URL(s)`,
  );
  log(
    WAYBACK_ONLY
      ? "  GSC: skipped (--wayback-only)"
      : DRY_RUN
        ? `  GSC: ${SITEMAPS.length} sitemap(s) would be submitted`
        : `  GSC: ${gscOk}/${gscResults.length} sitemap submission(s) accepted`,
  );

  const gscFailed = gscResults.length > 0 && gscOk !== gscResults.length;
  const indexNowFailed = !DRY_RUN && !WAYBACK_ONLY && indexNowResult.accepted === 0;
  if (indexNowFailed || gscFailed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[backlinks] failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
