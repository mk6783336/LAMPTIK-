#!/usr/bin/env node
/**
 * Build-time integrity check for content cross-links.
 *
 * Every relationship below is resolved with a lookup that returns `null` when
 * the target is missing, and every caller filters those nulls out. That is the
 * right runtime behaviour — a card must not crash a page — but it also means a
 * typo is invisible: the page renders politely with one fewer link, and no
 * build, lint rule or type says a word. This happened once already, with a
 * guide pointing at a guide that never existed.
 *
 * So the failure is moved here, where it is loud and blocks the commit:
 *
 *   guides[].related[]        → must be a guide slug
 *   sub-tools[].related[]     → must be a sub-tool slug
 *   sub-tools[].guides[].slug → must be a guide slug
 *   groups[].slugs[]          → must be a sub-tool slug
 *   sub-tools[].slug          → must have an app/(site)/<slug>/page.tsx
 *   tool-seo links[].href     → must be a route that exists on disk
 *
 * The last one is the invariant the registry comments promise: an entry without
 * a route file would 404 from the sitemap, and a route without an entry would be
 * an orphan no hub links to.
 *
 * Parsing is structural rather than a full TypeScript parse: the content
 * modules are flat data, the arrays are located by bracket matching (which
 * tolerates either one-per-line or inline formatting), and only string
 * literals are read. It is deliberately dependency-free so it can run before
 * the build without a compiler.
 *
 * Exit codes: 0 = every reference resolves, 1 = at least one does not.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const guidesPath = path.join(root, "lib/content/guides.ts");
const subtoolsPath = path.join(root, "lib/content/sub-tools");
const groupsPath = path.join(root, "lib/content/sub-tools/groups.ts");
const toolSeoPath = path.join(root, "lib/content/tool-seo.ts");
const sitePath = path.join(root, "app/(site)");

const rel = (absolute) => path.relative(root, absolute).split(path.sep).join("/");

/** 1-based line number of an offset, for messages you can click. */
function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * Every `key: [...]` body in a source file, with its opening offset.
 * Brackets are counted with string awareness so a `]` inside a description
 * cannot end the array early.
 */
function arrayBodies(source, key) {
  const bodies = [];
  const pattern = new RegExp(`\\b${key}:\\s*\\[`, "g");

  for (const match of source.matchAll(pattern)) {
    let depth = 0;
    let quote = null;
    let index = match.index + match[0].length - 1;

    for (; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === "\\") index += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "[" || char === "{" || char === "(") depth += 1;
      else if (char === "]" || char === "}" || char === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    // `bodyStart` lets a caller report the line of a specific literal inside
    // the array; `start` reports the line of the key itself.
    bodies.push({
      start: match.index,
      bodyStart: match.index + match[0].length,
      body: source.slice(match.index + match[0].length, index),
    });
  }

  return bodies;
}

const literals = (body) => [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

/** Slugs declared as `{ slug: "..." }` objects — the sub-tool guide cards. */
const slugLiterals = (body) => [...body.matchAll(/\bslug:\s*"([^"]+)"/g)].map((match) => match[1]);

const failures = [];
const counts = {
  guideToGuide: 0,
  toolToTool: 0,
  toolToGuide: 0,
  groupToTool: 0,
  routes: 0,
  linkTarget: 0,
};

function fail(file, source, index, message) {
  failures.push({ file, line: index >= 0 ? lineAt(source, index) : null, message });
}

// ---------------------------------------------------------------------------
// Plan the corpus: every slug that exists, from every source of truth.
// ---------------------------------------------------------------------------

const guideSource = await readFile(guidesPath, "utf8");
const guideNodes = [...guideSource.matchAll(/^ {4}slug: "([^"]+)"/gm)].map((match) => ({
  slug: match[1],
  index: match.index,
}));
const guideSlugs = new Set(guideNodes.map((node) => node.slug));

const entries = (await readdir(subtoolsPath))
  .filter((name) => name.endsWith(".ts") && !["index.ts", "groups.ts", "sub-tool-types.ts"].includes(name))
  .sort();

const toolEntries = [];
for (const name of entries) {
  const file = path.join(subtoolsPath, name);
  const source = await readFile(file, "utf8");
  const slugMatch = /\bslug:\s*"([^"]+)"/.exec(source);
  if (!slugMatch) {
    fail(rel(file), source, null, "has no `slug` — it cannot be exported as a sub-tool");
    continue;
  }
  toolEntries.push({ file, source, slug: slugMatch[1], slugIndex: slugMatch.index });
}
const toolSlugs = new Set(toolEntries.map((entry) => entry.slug));

// ---------------------------------------------------------------------------
// Guides: related → guide
// ---------------------------------------------------------------------------

for (const { start, body } of arrayBodies(guideSource, "related")) {
  const owner = [...guideNodes].reverse().find((node) => node.index < start);
  if (!owner) continue;

  for (const target of literals(body)) {
    counts.guideToGuide += 1;
    if (target === owner.slug) {
      fail(rel(guidesPath), guideSource, start, `guide "${owner.slug}" lists itself in \`related\``);
    } else if (!guideSlugs.has(target)) {
      fail(
        rel(guidesPath),
        guideSource,
        start,
        `guide "${owner.slug}" links to "${target}", which is not a guide`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Sub-tools: related → sub-tool, guides → guide, and a route per slug
// ---------------------------------------------------------------------------

for (const { file, source, slug } of toolEntries) {
  for (const { start, body } of arrayBodies(source, "related")) {
    for (const target of literals(body)) {
      counts.toolToTool += 1;
      if (target === slug) {
        fail(rel(file), source, start, `tool "${slug}" lists itself in \`related\``);
      } else if (!toolSlugs.has(target)) {
        fail(rel(file), source, start, `tool "${slug}" links to "${target}", which is not a sub-tool`);
      }
    }
  }

  for (const { start, body } of arrayBodies(source, "guides")) {
    for (const target of slugLiterals(body)) {
      counts.toolToGuide += 1;
      if (!guideSlugs.has(target)) {
        fail(rel(file), source, start, `tool "${slug}" links to guide "${target}", which does not exist`);
      }
    }
  }

  counts.routes += 1;
  const route = path.join(sitePath, slug, "page.tsx");
  try {
    await stat(route);
  } catch {
    fail(rel(file), source, null, `tool "${slug}" has no route at ${rel(route)} — the sitemap would 404`);
  }
}

// ---------------------------------------------------------------------------
// The tools hub: group membership → sub-tool
// ---------------------------------------------------------------------------

const groupsSource = await readFile(groupsPath, "utf8");
const grouped = new Set();
for (const { start, body } of arrayBodies(groupsSource, "slugs")) {
  for (const target of literals(body)) {
    counts.groupToTool += 1;
    if (!toolSlugs.has(target)) {
      fail(rel(groupsPath), groupsSource, start, `a tool group lists "${target}", which is not a sub-tool`);
    } else if (grouped.has(target)) {
      fail(rel(groupsPath), groupsSource, start, `"${target}" appears in more than one tool group`);
    } else {
      grouped.add(target);
    }
  }
}

// ---------------------------------------------------------------------------
// Platform pages: every content link must point at a route that exists
// ---------------------------------------------------------------------------

/**
 * Discovered from the filesystem rather than a hand-kept list, so adding or
 * retiring a page can never leave this asserting yesterday's sitemap.
 */
async function discoverRoutes() {
  const routes = new Set();
  const add = (href) => routes.add(href.length > 1 ? href.replace(/\/+$/, "") : "/");

  try {
    await stat(path.join(sitePath, "page.tsx"));
    add("/");
  } catch {
    // no root page
  }

  for (const entry of await readdir(sitePath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const segment = entry.name;
    // Route groups never appear in a URL, and a dynamic segment's valid values
    // come from content rather than from the directory name.
    if (segment.startsWith("(") || segment.startsWith("[")) continue;
    try {
      await stat(path.join(sitePath, segment, "page.tsx"));
      add(`/${segment}`);
    } catch {
      // a directory without a page is not a route
    }
  }

  try {
    await stat(path.join(sitePath, "guides/[slug]/page.tsx"));
    for (const slug of guideSlugs) add(`/guides/${slug}`);
  } catch {
    // guides are not dynamic in this build
  }

  return routes;
}

const routes = await discoverRoutes();
const toolSeoSource = await readFile(toolSeoPath, "utf8");

for (const { bodyStart, body } of arrayBodies(toolSeoSource, "links")) {
  for (const match of body.matchAll(/\bhref:\s*"([^"]+)"/g)) {
    const href = match[1];
    counts.linkTarget += 1;
    // Absolute URLs are somebody else's uptime; only an internal path can be
    // verified from here without touching the network.
    if (!href.startsWith("/")) continue;

    const target = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (!routes.has(target)) {
      fail(
        rel(toolSeoPath),
        toolSeoSource,
        bodyStart + match.index,
        `a platform page links to "${href}", which matches no route in app/(site)`,
      );
    }
  }
}

const ungrouped = [...toolSlugs].filter((slug) => !grouped.has(slug));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\ncontent links: ${failures.length} broken reference(s)\n`);
  for (const failure of failures) {
    console.error(`  ${failure.file}${failure.line ? `:${failure.line}` : ""}`);
    console.error(`    ${failure.message}`);
  }
  console.error(
    "\nEach of these renders as nothing, or 404s from the sitemap — silently." +
      "\nFix the slug, or add the page it names.\n",
  );
  process.exit(1);
}

if (ungrouped.length > 0) {
  // Not fatal: a new tool may be committed before it is filed. Say so loudly
  // rather than failing, since the hub silently omitting it is the real risk.
  console.warn(
    `\ncontent links: ${ungrouped.length} sub-tool(s) not listed in any tool group — ` +
      `they will be missing from /tools:\n${ungrouped.map((slug) => `  - ${slug}`).join("\n")}\n`,
  );
}

const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
console.log(
  `content links: ${total} reference(s) resolve — ` +
    `${counts.guideToGuide} guide→guide, ${counts.toolToTool} tool→tool, ` +
    `${counts.toolToGuide} tool→guide, ${counts.groupToTool} group→tool, ` +
    `${counts.linkTarget} link target(s), ${counts.routes} tool route(s)`,
);

if (ungrouped.length > 0) process.exit(0);
