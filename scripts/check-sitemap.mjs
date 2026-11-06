#!/usr/bin/env node
/**
 * Nothing in the sitemap may redirect or 404.
 *
 * The sitemap is the one place where the site makes a promise about its own
 * URLs. A `<loc>` that redirects is a wasted crawl hop that Ahrefs reports as a
 * 3XX warning forever; a `<loc>` that 404s is a lie, and Google counts it
 * against the sitemap's quality. Both happen the same way: a page is renamed or
 * folded into another, the route is updated, and the sitemap entry survives
 * because it is generated from a registry that nobody re-read.
 *
 * `check-content-links.mjs` already proves the sitemap and the routes on disk
 * agree. This proves the deployed site agrees with both — which is the only
 * check that catches a stale build, a host change, or an edge rule that
 * rewrites a path.
 *
 * Live by design, so it is NOT part of `npm run verify`: that gate must work
 * offline. It runs in the weekly Index Check workflow and by hand:
 *
 *   npm run check:sitemap
 *   INDEX_CHECK_ORIGIN=http://localhost:3100 npm run check:sitemap
 *   SITEMAP_URL=http://localhost:3210/sitemap.xml npm run check:sitemap
 *
 * Exit codes: 0 = every `<loc>` answers 200 on the canonical origin,
 * 1 = at least one redirects, is broken, or is off-origin.
 */

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const SITEMAP_URL = process.env.SITEMAP_URL ?? `${ORIGIN}/sitemap.xml`;
const CONCURRENCY = Math.max(1, Number(process.env.SITEMAP_CONCURRENCY ?? 6));
const TIMEOUT_MS = Number(process.env.SITEMAP_TIMEOUT_MS ?? 20_000);
const SHOW_LIMIT = Number(process.env.SITEMAP_SHOW ?? 40);

const canonicalHost = new URL(ORIGIN).host;
// Compared against the origin's own protocol rather than a hardcoded `https:`,
// so the same sweep runs against a local build (http://localhost:3100) and
// still refuses an `http:` <loc> in production.
const canonicalProtocol = new URL(ORIGIN).protocol;
const failures = [];

async function request(url, redirect) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect,
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LampTikSitemapCheck/1.0)",
        accept: "application/xml,text/xml,text/html;q=0.9,*/*;q=0.8",
      },
    });
    const body = await response.text();
    return { status: response.status, location: response.headers.get("location"), body };
  } catch (error) {
    return { status: 0, location: null, body: "", error: String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

const sitemap = await request(SITEMAP_URL, "manual");

if (sitemap.status !== 200) {
  console.error(
    `check-sitemap: ${SITEMAP_URL} answered ${sitemap.status || sitemap.error || "no response"}, expected 200`,
  );
  process.exit(1);
}

const locs = [...sitemap.body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);
if (locs.length === 0) {
  console.error(`check-sitemap: ${SITEMAP_URL} contains no <loc> — a crawler would see an empty sitemap`);
  process.exit(1);
}

/**
 * Off-origin `<loc>` values are checked here rather than fetched: an `http://`
 * or apex URL is a redirect by definition, and requesting it would only confirm
 * that the server normalises it.
 */
const checks = [];
for (const loc of locs) {
  let parsed;
  try {
    parsed = new URL(loc);
  } catch {
    failures.push(`${loc} — not an absolute URL`);
    continue;
  }
  if (parsed.host !== canonicalHost || parsed.protocol !== canonicalProtocol) {
    failures.push(`${loc} — not the canonical ${ORIGIN} origin, so it redirects`);
    continue;
  }
  checks.push(loc);
}

const results = [];
let cursor = 0;

async function worker() {
  while (cursor < checks.length) {
    const loc = checks[cursor++];
    const response = await request(loc, "manual");
    results.push({
      loc,
      status: response.status,
      location: response.location,
    });
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, checks.length) }, worker));

for (const result of results) {
  const path = result.loc.replace(ORIGIN, "") || "/";
  if (result.status >= 300 && result.status < 400) {
    const target = result.location ? result.location.replace(ORIGIN, "") || "/" : "—";
    failures.push(`${path} — redirects (${result.status}) to ${target}; list the destination instead`);
  } else if (result.status !== 200) {
    failures.push(`${path} — answered ${result.status || "no response"}, expected 200`);
  }
}

const redirects = results.filter((result) => result.status >= 300 && result.status < 400).length;
const broken = results.filter((result) => result.status !== 200 && !(result.status >= 300 && result.status < 400)).length;

if (failures.length > 0) {
  console.error(`\ncheck-sitemap: ${failures.length} problem(s) in ${SITEMAP_URL}\n`);
  for (const failure of failures.slice(0, SHOW_LIMIT)) console.error(`  ${failure}`);
  if (failures.length > SHOW_LIMIT) {
    console.error(`  … and ${failures.length - SHOW_LIMIT} more (raise SITEMAP_SHOW to see them)`);
  }
  console.error(
    "\nEvery <loc> is a promise about a final URL. Point it at the page that answers," +
      "\nor drop it — a sitemap entry that redirects or 404s teaches the crawler to trust it less.\n",
  );
  process.exit(1);
}

console.log(`Sitemap ${SITEMAP_URL}`);
console.log(
  `check-sitemap: ${locs.length} <loc> — ${results.length} checked, ` +
    `${results.length - redirects - broken} answered 200, ${redirects} redirect(s), ${broken} broken`,
);
