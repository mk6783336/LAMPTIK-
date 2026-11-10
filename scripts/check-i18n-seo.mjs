#!/usr/bin/env node
/**
 * Locale pages: keep them indexable — and prove it on every run.
 *
 * Decision, 2026-11-10: the 41 translated URLs stay `index, follow`.
 *
 * The case for de-indexing looked strong from the numbers alone: Search
 * Console showed 95 impressions and 15 clicks in 28 days, five of the ten
 * `site:` results were locale roots, and one Spanish root had 13 impressions
 * and no clicks. The obvious cleanup was to noindex the lot "until unique".
 *
 * The pages were already unique. Each locale is a hand-written landing
 * (`lib/i18n/<code>.ts`, 3.7–9.5 KB of copy in its own language) plus three
 * per-network landings in `lib/i18n/platform/<code>.ts`, each with its own H1,
 * steps, FAQ and keyword set. `/hi` serves `कोई भी वीडियो डाउनलोड करें`, not the
 * English H1 under a Hindi tag. Noindexing 41 real pages to tidy an index that
 * had 95 impressions would have deleted the only presence the site had earned.
 *
 * What the decision needs is not a bulk noindex but a line that cannot be
 * crossed silently. A locale page may stay in the index only while it passes
 * every check below. The moment one stops being a real translation — English
 * copy under a Spanish `hreflang`, a canonical pointing elsewhere, a cluster
 * naming a page that does not exist — this script fails and names it. That is
 * the point where `robots: noindex` becomes the right fix for that one page.
 *
 * Checks, per page:
 *   1. HTTP 200
 *   2. `<html lang>` and `dir` match the language the home page declares for
 *      that path (RTL only for ar/ur/fa/he)
 *   3. self-referencing canonical
 *   4. not noindex
 *   5. the hreflang cluster is exactly the set of pages that actually exist
 *      for that slug — no missing member, no member that 404s
 *   6. title and H1 differ from the English page for the same slug
 *   7. no two locales of the same slug ship the same title or H1
 *
 * Run:  npm run check:i18n        (live site; needs network)
 * Exit: 0 = every page passes, 1 = at least one broke a rule.
 */

import { appendFileSync, writeFileSync } from "node:fs";

const ORIGIN = (process.env.I18N_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const RTL = new Set(["ar", "ur", "fa", "he"]);
/** Where the workflow expects the issue body; nothing is written when unset. */
const REPORT_PATH = (process.env.I18N_REPORT_PATH ?? "").trim();
const SELF_TEST = process.argv.includes("--self-test");

const text = (html, re) => (html.match(re) || [])[1] || "";
const strip = (value) => value.replace(/\/+$/, "");
const normalise = (path) => (path === "" ? "/" : strip(path));

/** Step outputs, so the workflow branches on a count instead of on text. */
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

/** The issue body. Absent when the run passed, so the file cannot be stale. */
function writeReport(markdown) {
  if (!REPORT_PATH) return;
  writeFileSync(REPORT_PATH, `${markdown}\n`, "utf8");
}

/**
 * One row per broken page, naming the page and every rule it broke — the whole
 * point of the issue is that a reader can go straight to that file instead of
 * re-running the check to find out which of 45 pages moved.
 */
function renderFailures(failures, counts) {
  return [
    `## A locale page is no longer a real translation`,
    "",
    `${failures.length} of ${counts.checked} locale pages broke a rule in this run ` +
      `(${counts.roots} locale roots, ${counts.slugs} localized platform page set(s)).`,
    "",
    "| Page | What broke |",
    "| --- | --- |",
    ...failures.map((failure) => `| \`${failure.path}\` | ${failure.problems.join("; ")} |`),
    "",
    "A locale page may stay in the index only while it is 200, self-canonical, tagged with the " +
      "right `lang`/`dir`, indexable, still exactly as wide an hreflang cluster as the pages that " +
      "exist, and translated rather than English.",
    "",
    "Fix the copy or the tags for that page. If it cannot carry real localized content yet, " +
      "`robots: noindex` that one page — the decision this enforces is recorded at the top of " +
      "`scripts/check-i18n-seo.mjs`.",
  ].join("\n");
}

async function fetchPage(path) {
  const response = await fetch(`${ORIGIN}${path}`, { redirect: "manual" });
  const html = await response.text();
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const alternates = links
    .filter((link) => /rel="alternate"/i.test(link) && /hreflang=/i.test(link))
    .map((link) => ({
      lang: text(link, /hreflang="([^"]+)"/i),
      href: normalise(text(link, /href="([^"]+)"/i).replace(ORIGIN, "")),
    }));

  return {
    path,
    status: response.status,
    lang: (html.match(/<html[^>]+lang="([^"]+)"/i) || [])[1] || "",
    dir: (html.match(/<html[^>]+dir="([^"]+)"/i) || [])[1] || "",
    canonical: text(html, /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i) ||
      text(html, /<link\b[^>]*href="([^"]+)"[^>]*rel="canonical"/i),
    robots: text(html, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/i),
    alternates,
    title: text(html, /<title[^>]*>([^<]*)<\/title>/i).replace(/\s+/g, " ").trim(),
    h1: text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

/** Language each path claims, taken from the home page's own cluster. */
function clusterLanguages(home) {
  const map = new Map();
  for (const alternate of home.alternates) {
    if (alternate.lang === "x-default") continue;
    map.set(alternate.href, alternate.lang);
  }
  return map;
}

if (SELF_TEST) {
  const report = renderFailures(
    [
      {
        path: "/es/example-page",
        problems: ["H1 is the English page's — not translated", "cluster missing tr"],
      },
    ],
    { checked: 45, roots: 12, slugs: 3 },
  );
  console.log(report);
  writeReport(report);
  const named =
    report.includes("/es/example-page") &&
    report.includes("not translated") &&
    report.includes("cluster missing tr") &&
    report.includes("1 of 45");
  console.log(named ? "self-test: the report names the page and both reasons" : "self-test: FAILED");
  process.exit(named ? 0 : 1);
}

const home = await fetchPage("/");
if (home.status !== 200 || !home.alternates.length) {
  console.error(`[i18n] home page did not declare a language cluster (HTTP ${home.status})`);
  process.exit(1);
}

const languages = clusterLanguages(home);
const roots = [...languages.keys()].filter((path) => path !== "/");

const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => normalise(match[1].replace(ORIGIN, "")))
  .filter(Boolean);

/** `/es/youtube-downloader` → `{ locale: "/es", slug: "youtube-downloader" }` */
const localized = sitemapPaths
  .map((path) => {
    const parts = path.split("/").filter(Boolean);
    return parts.length === 2 ? { locale: `/${parts[0]}`, slug: parts[1] } : null;
  })
  .filter((entry) => entry && roots.includes(entry.locale));

const slugs = [...new Set(localized.map((entry) => entry.slug))].sort();
const localesWithSlug = new Map(
  slugs.map((slug) => [
    slug,
    localized.filter((entry) => entry.slug === slug).map((entry) => entry.locale),
  ]),
);

/** Every page that must be checked, with the cluster it is expected to declare. */
const targets = [
  ...roots.map((path) => ({
    path,
    key: "(root)",
    expected: new Set([...languages.values(), "x-default"]),
  })),
  ...localized.map(({ locale, slug }) => ({
    path: `/${locale.split("/")[1]}/${slug}`,
    key: slug,
    expected: new Set([
      languages.get("/"),
      "x-default",
      ...localesWithSlug.get(slug).map((code) => languages.get(code)),
    ]),
  })),
];

const baselinePaths = [...new Set(targets.map((target) => target.key))].map((key) =>
  key === "(root)" ? "/" : `/${key}`,
);
const baseline = new Map();
for (const path of baselinePaths) baseline.set(path, await fetchPage(path));

const failures = [];
const rows = [];
const seen = new Map();

for (const target of targets) {
  const page = await fetchPage(target.path);
  const path = target.path;
  const problems = [];

  if (page.status !== 200) problems.push(`HTTP ${page.status}`);

  const expectedLang = languages.get(`/${path.split("/")[1]}`);
  if (page.lang !== expectedLang) {
    problems.push(`lang="${page.lang}" but the cluster says "${expectedLang}"`);
  }
  const expectedDir = RTL.has((expectedLang || "").split("-")[0]) ? "rtl" : "ltr";
  if (page.dir !== expectedDir) problems.push(`dir="${page.dir}" expected "${expectedDir}"`);

  const self = strip(page.canonical).replace(ORIGIN, "");
  if (!self) problems.push("no canonical");
  else if (self !== strip(path)) problems.push(`canonical points at ${self || "/"}`);

  if (/noindex/i.test(page.robots)) problems.push("noindex while still in the sitemap");

  const declared = new Set(page.alternates.map((alternate) => alternate.lang));
  const missing = [...target.expected].filter((lang) => !declared.has(lang));
  const extra = [...declared].filter((lang) => !target.expected.has(lang));
  if (missing.length) problems.push(`cluster missing ${missing.join(", ")}`);
  if (extra.length) problems.push(`cluster names ${extra.join(", ")} which has no page`);

  const english = baseline.get(target.key === "(root)" ? "/" : `/${target.key}`);
  if (english && english.h1 && page.h1.toLowerCase() === english.h1.toLowerCase()) {
    problems.push("H1 is the English page's — not translated");
  }
  if (english && english.title && page.title.toLowerCase() === english.title.toLowerCase()) {
    problems.push("title is the English page's — not translated");
  }

  for (const field of ["title", "h1"]) {
    const value = page[field].toLowerCase();
    if (!value) continue;
    const id = `${target.key}|${field}|${value}`;
    if (seen.has(id)) problems.push(`${field} duplicates ${seen.get(id)}`);
    else seen.set(id, path);
  }

  rows.push({ path, status: page.status, lang: page.lang, dir: page.dir, alts: declared.size });
  if (problems.length) failures.push({ path, problems });
}

const width = Math.max(...rows.map((row) => row.path.length), 4);
for (const row of rows) {
  console.log(
    `${row.path.padEnd(width)}  ${String(row.status)}  ${row.lang.padEnd(6)} ${row.dir.padEnd(4)} alts=${row.alts}`,
  );
}

console.log("");
console.log(
  `${rows.length} locale page(s) checked · ${roots.length} locale roots · ` +
    `${slugs.length} localized platform page set(s)`,
);

setOutput("checked", String(rows.length));
setOutput("failures", String(failures.length));

if (!failures.length) {
  summary(`### Locale pages: ${rows.length}/${rows.length} pass`);
  summary("");
  summary(
    "Every locale root and localized platform page is 200, self-canonical, tagged with its own " +
      "language, indexable, in a complete hreflang cluster, and translated rather than English.",
  );
  console.log("Every locale page is indexable, self-canonical, correctly tagged and translated.");
  process.exit(0);
}

const report = renderFailures(failures, {
  checked: rows.length,
  roots: roots.length,
  slugs: slugs.length,
});

console.error("");
console.error(`${failures.length} page(s) broke a rule — fix the copy/tags, or noindex that page:`);
for (const failure of failures) {
  console.error(`  ${failure.path}`);
  for (const problem of failure.problems) console.error(`    - ${problem}`);
}

writeReport(report);
summary(report);
process.exit(1);
