#!/usr/bin/env node
/**
 * Announce only the pages that actually changed to IndexNow.
 *
 * Why this exists: Ahrefs reported "Changed pages not submitted to IndexNow"
 * after every deploy. The fix is not to blast all 43 URLs at the API on each
 * push (engines treat that as noise), but to submit exactly the pages whose
 * rendered content moved.
 *
 * Two details make that honest:
 *   1. It waits for `/api/version` to report the commit being deployed, so the
 *      new HTML is live before any engine is told to re-crawl. Submitting early
 *      is the classic reason a valid URL gets skipped.
 *   2. It hashes the *content* of each page (title, description and visible
 *      text), never the raw HTML. Next.js embeds a per-build id and hashed
 *      asset paths in every document, so a raw hash would report all 43 pages
 *      changed on every deploy — the same as spamming the endpoint.
 *
 * State lives in `.indexnow-state.json` (git-ignored) and is restored between
 * workflow runs by actions/cache, so a page is submitted once per real change.
 *
 * Exit codes: 0 = submitted or nothing to do, 1 = key file or API failure.
 * A failure here must be visible in Actions; it never blocks a deployment.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ORIGIN = (process.env.INDEXNOW_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
/**
 * Public by design — IndexNow requires this key to be readable at
 * `${ORIGIN}/${KEY}.txt`. The script verifies that file actually serves this
 * value before submitting, so the constant and the deployed key cannot drift.
 */
const KEY = process.env.INDEXNOW_KEY ?? "c86ddae551e849899111899822e395ff";
const STATE_PATH = process.env.INDEXNOW_STATE ?? ".indexnow-state.json";
const TARGET_SHA = (process.env.TARGET_SHA ?? "").trim();
const WAIT_SECONDS = Number(process.env.INDEXNOW_WAIT_SECONDS ?? 480);
const DRY_RUN = process.argv.includes("--dry");
/**
 * Announce every sitemap URL, not just the ones whose hash moved. Used after a
 * layout/schema change that alters all 46 pages at once — the hash diff is
 * still kept, but a sitewide edit should not be silently narrowed to the four
 * routes whose visible copy happens to differ.
 */
const SUBMIT_ALL = process.env.INDEXNOW_ALL === "1" || process.argv.includes("--all");
const ENDPOINT = "https://api.indexnow.org/indexnow";

const HOST = new URL(ORIGIN).host;
const log = (...parts) => console.log("[indexnow]", ...parts);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: { "cache-control": "no-cache", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  return { status: response.status, ok: response.ok, body: await response.text() };
}

/** Wait until production serves the commit that triggered this run. */
async function waitForDeployment() {
  if (!TARGET_SHA) {
    log("no TARGET_SHA supplied — skipping the deployment wait");
    return true;
  }
  const expected = TARGET_SHA.slice(0, 12);
  const deadline = Date.now() + WAIT_SECONDS * 1000;
  let last = "no response";

  while (Date.now() < deadline) {
    try {
      const { status, body } = await fetchText(`${ORIGIN}/api/version`);
      if (status === 200) {
        const payload = JSON.parse(body);
        last = `sha=${payload.sha ?? "null"} env=${payload.environment ?? "?"}`;
        if (typeof payload.sha === "string" && payload.sha.startsWith(expected)) {
          log(`deployment live: ${last}`);
          return true;
        }
      } else {
        last = `HTTP ${status}`;
      }
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    log(`waiting for deploy (${last})`);
    await sleep(10_000);
  }

  log(`deploy did not report ${expected} within ${WAIT_SECONDS}s (${last})`);
  return false;
}

/** The key file proves domain ownership; a mismatch would 403 every URL. */
async function verifyKeyFile() {
  try {
    const { status, body } = await fetchText(`${ORIGIN}/${KEY}.txt`);
    if (status === 200 && body.trim() === KEY) {
      log(`key file verified at ${ORIGIN}/${KEY}.txt`);
      return true;
    }
    log(`key file check failed: HTTP ${status}, body "${body.trim().slice(0, 40)}"`);
    return false;
  } catch (error) {
    log(`key file check failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/** Visible text + title + description: what a reader, not a build, sees. */
function contentFingerprint(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = (
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ?? ""
  ).trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(`${title}\u0000${description}\u0000${text}`).digest("hex");
}

async function readState() {
  try {
    const parsed = JSON.parse(await readFile(STATE_PATH, "utf8"));
    return parsed && typeof parsed.pages === "object" && parsed.pages ? parsed.pages : {};
  } catch {
    return {};
  }
}

async function sitemapUrls() {
  const { status, body } = await fetchText(`${ORIGIN}/sitemap.xml`);
  if (status !== 200) throw new Error(`sitemap returned HTTP ${status}`);
  return [
    ...new Set(
      [...body.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => match[1].trim())
        .filter((url) => {
          try {
            return new URL(url).host === HOST;
          } catch {
            return false;
          }
        }),
    ),
  ];
}

async function main() {
  const deployed = await waitForDeployment();

  if (!(await verifyKeyFile())) {
    log("refusing to submit without a valid key file");
    process.exit(1);
  }

  const urls = await sitemapUrls();
  const previous = await readState();
  const next = {};
  const changed = [];
  let unreadable = 0;

  for (const url of urls) {
    try {
      const { status, ok, body } = await fetchText(url);
      if (!ok) {
        unreadable += 1;
        log(`skipping ${url} (HTTP ${status})`);
        continue;
      }
      const hash = contentFingerprint(body);
      next[url] = hash;
      if (previous[url] !== hash) changed.push(url);
    } catch (error) {
      unreadable += 1;
      log(`skipping ${url} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  log(`${urls.length} sitemap URLs, ${changed.length} changed, ${unreadable} unreadable`);

  if (!deployed) log("WARNING: submitting even though the deployment was not confirmed live");

  // IndexNow accepts up to 10,000 URLs per request; the sitemap is far below
  // that. A blank/partial sitemap is never force-submitted.
  const submission = SUBMIT_ALL && urls.length > 0 && unreadable === 0 ? urls : changed;

  if (submission.length === 0) {
    await writeFile(STATE_PATH, JSON.stringify({ pages: next }, null, 2));
    log("nothing to submit");
    return;
  }

  if (SUBMIT_ALL) log(`all pages requested (${submission.length} URLs)`);
  for (const url of submission) log(`changed: ${url}`);

  if (DRY_RUN) {
    log("--dry: not submitting");
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `${ORIGIN}/${KEY}.txt`,
      urlList: submission,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const responseBody = (await response.text()).slice(0, 400);

  // 200 = accepted, 202 = accepted but key still being validated.
  if (response.status !== 200 && response.status !== 202) {
    log(`IndexNow rejected the submission: HTTP ${response.status} ${responseBody}`);
    process.exit(1);
  }

  await writeFile(STATE_PATH, JSON.stringify({ pages: next }, null, 2));
  log(`submitted ${submission.length} URL(s): HTTP ${response.status} ${responseBody}`.trim());
}

main().catch((error) => {
  log(`failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
