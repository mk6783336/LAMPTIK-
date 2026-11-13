#!/usr/bin/env node
/**
 * The metadata gate for the international cluster.
 *
 * Run:  npm run check:metadata                 (live site)
 *       npm run check:metadata -- --local=http://127.0.0.1:3000
 * Exit: 0 = every page passes, 1 = at least one rule broke.
 *
 * Why this exists as a script and not a unit test: the metadata builder is
 * `generateMetadata` plus `platformLanguageAlternates`, and the only thing that
 * matters is what Next actually renders into `<head>` — a unit test over the
 * object would pass while the emitted document was wrong. This reads the built
 * pages, which is the artefact Google reads.
 *
 * Rules, per page:
 *   1. HTTP 200
 *   2. self-referencing canonical, absolute, no trailing slash
 *   3. hreflang cluster exactly equals the pages that exist for this slug —
 *      every expected language, correct absolute href, no extras
 *   4. `x-default` points at the English page
 *   5. `FAQPage` node with at least four questions
 *   6. English pages: `WebApplication` with applicationCategory
 *      "MultimediaApplication" and an operatingSystem
 *   7. exactly one `<h1>`, and no two locales of one slug share a title
 *
 * The three platform clusters are checked because they are the only pages with
 * real translations; the English-only tool pages are asserted by
 * `check-content-links.mjs` (route ⇔ sitemap) and `check:i18n` (locale roots).
 */

const arg = (name, fallback) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

/** Where the pages are FETCHED from — a local `next start` when testing a build. */
const ORIGIN = arg("local", process.env.META_ORIGIN ?? "https://www.lamptik.online").replace(
  /\/+$/,
  "",
);
/**
 * What the pages must DECLARE. A local build still emits the production
 * canonical, because `siteUrl` is the production origin unless
 * NEXT_PUBLIC_SITE_URL overrides it at build time — comparing a localhost
 * document against localhost hrefs would test nothing.
 */
const CANONICAL_ORIGIN = (process.env.META_CANONICAL_ORIGIN ?? "https://www.lamptik.online").replace(
  /\/+$/,
  "",
);

/** Locale segment per hreflang key. `pt-BR` serves `/pt`, and says so. */
const LOCALES = [
  ["en", ""],
  ["es", "/es"],
  ["ar", "/ar"],
  ["de", "/de"],
  ["fr", "/fr"],
  ["pt-BR", "/pt"],
  ["id", "/id"],
  ["hi", "/hi"],
  ["vi", "/vi"],
  ["th", "/th"],
  ["tl", "/tl"],
  ["ur", "/ur"],
];

const SLUGS = ["facebook-video-downloader", "instagram-reels-downloader", "youtube-downloader"];

const text = (html, re) => (html.match(re) || [])[1] ?? "";

function parseHead(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);

  const alternates = new Map();
  for (const link of links) {
    if (!/rel="alternate"/i.test(link) || !/hreflang=/i.test(link)) continue;
    const lang = text(link, /hreflang="([^"]+)"/i);
    const href = text(link, /href="([^"]+)"/i);
    if (lang && href) alternates.set(lang.toLowerCase(), href);
  }

  const canonical =
    text(html, /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i) ||
    text(html, /<link\b[^>]*href="([^"]+)"[^>]*rel="canonical"/i);

  const graphs = [];
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      graphs.push(parsed);
    } catch {
      /* A broken block is reported by check-content-links; ignore it here. */
    }
  }

  const nodes = [];
  for (const graph of graphs) {
    if (Array.isArray(graph?.["@graph"])) nodes.push(...graph["@graph"]);
    else nodes.push(graph);
  }

  return {
    title: text(html, /<title[^>]*>([\s\S]*?)<\/title>/i).trim(),
    canonical: canonical.replace(/\/+$/, ""),
    alternates,
    h1Count: (html.match(/<h1\b/gi) || []).length,
    nodes,
  };
}

function faqQuestionCount(nodes) {
  const faq = nodes.find((node) => node?.["@type"] === "FAQPage");
  return Array.isArray(faq?.mainEntity) ? faq.mainEntity.length : 0;
}

function hasMultimediaApp(nodes) {
  return nodes.some(
    (node) =>
      node?.["@type"] === "WebApplication" &&
      node.applicationCategory === "MultimediaApplication" &&
      typeof node.operatingSystem === "string" &&
      node.operatingSystem.length > 0,
  );
}

async function get(path) {
  const response = await fetch(`${ORIGIN}${path}`, {
    headers: { "user-agent": "lamptik-metadata-gate/1.0" },
    redirect: "manual",
  });
  const html = response.status === 200 ? await response.text() : "";
  return { status: response.status, html, page: html ? parseHead(html) : null };
}

function expectedCluster(slug) {
  return LOCALES.map(([lang, segment]) => [lang, `${CANONICAL_ORIGIN}${segment}/${slug}`]);
}

const failures = [];
let checked = 0;

for (const slug of SLUGS) {
  const expected = new Map(expectedCluster(slug));
  const titles = new Map();

  for (const [lang] of LOCALES) {
    const path = new URL(expected.get(lang)).pathname;
    const result = await get(path);
    checked += 1;
    const problems = [];

    if (result.status !== 200) {
      problems.push(`HTTP ${result.status}`);
      failures.push({ path, problems });
      continue;
    }

    const { page } = result;

    // 2. canonical
    if (!page.canonical) problems.push("no canonical");
    else if (page.canonical !== `${CANONICAL_ORIGIN}${path}`) {
      problems.push(`canonical → ${page.canonical}`);
    }

    // 3 + 4. cluster
    for (const [expectedLang, expectedHref] of expected) {
      const actual = page.alternates.get(expectedLang.toLowerCase());
      if (!actual) problems.push(`hreflang ${expectedLang} missing`);
      else if (actual.replace(/\/+$/, "") !== expectedHref.replace(/\/+$/, "")) {
        problems.push(`hreflang ${expectedLang} → ${actual}`);
      }
    }
    for (const actualLang of page.alternates.keys()) {
      const known = LOCALES.some(([key]) => key.toLowerCase() === actualLang);
      if (!known && actualLang !== "x-default") problems.push(`extra hreflang ${actualLang}`);
    }
    const xDefault = page.alternates.get("x-default");
    if (!xDefault) problems.push("x-default missing");
    else if (xDefault.replace(/\/+$/, "") !== `${CANONICAL_ORIGIN}/${slug}`) {
      problems.push(`x-default → ${xDefault}`);
    }

    // 5. FAQ depth
    const questions = faqQuestionCount(page.nodes);
    if (questions < 4) problems.push(`FAQPage has ${questions} questions`);

    // 6. WebApplication, English only (the localized landings carry HowTo +
    //    Article, not a second app node — and a tool page must not be declared
    //    five times as five different applications).
    if (lang === "en" && !hasMultimediaApp(page.nodes)) {
      problems.push("WebApplication missing applicationCategory/operatingSystem");
    }

    // 7. one h1, unique title
    if (page.h1Count !== 1) problems.push(`${page.h1Count} h1`);
    const seen = titles.get(page.title);
    if (seen) problems.push(`title same as ${seen}`);
    else titles.set(page.title, lang);
    if (!page.title) problems.push("no title");

    if (problems.length) failures.push({ path, problems });
  }
}

for (const failure of failures) {
  console.log(`✗ ${failure.path}\n    ${failure.problems.join("\n    ")}`);
}

if (failures.length) {
  console.log(
    `\n${failures.length} of ${checked} pages broke a metadata rule. ` +
      "A localized page may only stay indexable while it is self-canonical, tagged with the right hreflang cluster, and answered with real FAQ depth.",
  );
  process.exit(1);
}

console.log(`✓ ${checked} pages: canonical, hreflang, x-default, FAQ depth, schema and titles all pass.`);
