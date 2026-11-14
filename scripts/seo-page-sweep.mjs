#!/usr/bin/env node
/**
 * Recurring page audit — claude-seo's `page_checks.py` over every URL the live
 * sitemap publishes.
 *
 * Run:  npm run seo:audit                     (~2-3 minutes, 87 URLs)
 *       npm run seo:audit -- --only=es         (subset, cheaper while working;
 *                                              no leading slash — Git Bash on
 *                                              Windows rewrites `/es` into a
 *                                              Windows path before node sees it)
 *       npm run seo:audit -- --limit=10       (first N URLs only)
 *
 * Why this exists: on 2026-11-14 a one-off sweep of all 87 sitemap URLs found
 * 16 Medium findings — six titles outside 30-60 characters and ten
 * descriptions over 160 — on pages no build gate looks at. The sitemap is the
 * list of pages the site asks search engines to index, so it is also the list
 * to audit; discovering URLs from it each run means a newly added page is
 * checked the first time the job runs after it ships, with no list to update.
 *
 * Where the tool comes from: claude-seo is NOT vendored in this repository.
 * Point CLAUDE_SEO_HOME at a checkout that contains scripts/page_checks.py
 * (the weekly workflow downloads a pinned release into the runner temp dir;
 * locally it is the copy inside ~/.claude/skills or /tmp/claude-seo). Missing
 * tooling exits 2 and names the variable — a broken install must never look
 * like a clean audit.
 *
 * Severity contract, same as the tool's own: Critical/High/Medium fail the
 * run, Low is informational. Exit 1 = findings above Low, 2 = the sweep could
 * not measure (sitemap unreachable, tool missing, page fetch failed), 0 =
 * measured and clean down to Low.
 *
 * Outputs: `docs/seo-page-audit.md` (committed, human-readable; `--no-write`
 * skips it), `.scratch/seo-page-audit.json` (machine-readable, git-ignored,
 * also the baseline the next run compares against for "new since last
 * sweep"), and, inside GitHub Actions, the run's Summary tab.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/* --------------------------------- config --------------------------------- */

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(`--${name}`);
}

function option(name, fallback) {
  const hit = args.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const ORIGIN = option("origin", "https://www.lamptik.online").replace(/\/+$/, "");
const SITEMAP = option("sitemap", `${ORIGIN}/sitemap.xml`);
const ONLY = option("only", "");
const LIMIT = Number(option("limit", "0")) || 0;
const CONCURRENCY = Math.max(1, Number(option("concurrency", "3")) || 3);
const PACE_MS = Math.max(0, Number(option("pace-ms", "150")) || 0);
const NO_WRITE = flag("no-write");
const REPORT_PATH = option("out", "docs/seo-page-audit.md");
const JSON_PATH = option("json", ".scratch/seo-page-audit.json");

const FAILING = new Set(["Critical", "High", "Medium"]);
const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];

/* -------------------------------- tooling --------------------------------- */

/**
 * The python interpreter. `python3` on Linux/macOS and CI, `py -3` on the
 * Windows machine this is developed on, where bare `python` is 2.7 and cannot
 * parse the tool.
 */
function pythonCommand() {
  const configured = process.env.PYTHON;
  if (configured) return configured.split(/\s+/);
  return process.platform === "win32" ? ["py", "-3"] : ["python3"];
}

function pageChecksPath() {
  const home = process.env.CLAUDE_SEO_HOME;
  const candidates = [
    home ? path.join(home, "scripts", "page_checks.py") : "",
    path.join(process.cwd(), "node_modules", "claude-seo", "scripts", "page_checks.py"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

/**
 * The tool's own version, read from the checkout rather than duplicated here:
 * a second copy of the number would go stale the first time the workflow's
 * pinned tag is bumped, and the report is the only place it matters.
 */
function toolVersion(tool) {
  try {
    const manifest = path.join(path.dirname(tool), "..", ".claude-plugin", "plugin.json");
    return JSON.parse(fs.readFileSync(manifest, "utf8")).version || "unknown";
  } catch {
    return "unknown";
  }
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      windowsHide: true,
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => resolve({ code: -1, stdout, stderr: error.message }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/* -------------------------------- sitemap --------------------------------- */

async function fetchText(url, timeoutMs = 30000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "lamptik-seo-audit/1.0 (+https://www.lamptik.online)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);
}

/**
 * Sitemap index support: a `<loc>` that ends in `.xml` is a child sitemap and
 * its URLs belong in the same sweep, otherwise a site that splits its sitemap
 * would silently audit only the index file.
 */
async function sitemapUrls() {
  const seen = new Set();
  const queue = [SITEMAP];

  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);

    const entries = locs(await fetchText(current));
    for (const entry of entries) {
      if (/\.xml(\?|$)/i.test(entry)) queue.push(entry);
    }
  }

  const urls = [];
  for (const sitemap of seen) {
    for (const entry of locs(await fetchText(sitemap))) {
      if (!/\.xml(\?|$)/i.test(entry)) urls.push(entry);
    }
  }
  return [...new Set(urls)];
}

/* --------------------------------- sweep ---------------------------------- */

/**
 * One page, with two retries. A weekly job that writes an issue because one
 * request out of 87 met a cold Vercel instance would be noise, and the tool
 * exits non-zero both for "could not fetch" and for a page it could read but
 * which tripped an internal guard — so a parseable payload always wins.
 */
async function checkPage(python, tool, url) {
  let last = "no attempt";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await run(python[0], [...python.slice(1), tool, "--url", url, "--json"], {
      timeout: 90000,
    });

    if (result.stdout.trim()) {
      try {
        const parsed = JSON.parse(result.stdout);
        if (parsed.summary) return { url, summary: parsed.summary, findings: parsed.findings || [] };
      } catch {
        last = `unreadable tool output (${result.code})`;
      }
    }

    if (result.code !== 0) {
      last = result.stderr.trim().split("\n").slice(-3).join(" ") || `exit ${result.code}`;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }

  return { url, error: last };
}

function severityOf(findings) {
  let worst = "clean";
  for (const finding of findings) {
    if (worst === "clean" || SEVERITY_ORDER.indexOf(finding.severity) < SEVERITY_ORDER.indexOf(worst)) {
      worst = finding.severity;
    }
  }
  return worst;
}

async function sweep(python, tool, urls) {
  const results = new Array(urls.length);
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const index = cursor;
      cursor += 1;
      const url = urls[index];
      process.stderr.write(`  [${index + 1}/${urls.length}] ${url}\n`);
      results[index] = await checkPage(python, tool, url);
      if (PACE_MS) await new Promise((resolve) => setTimeout(resolve, PACE_MS));
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return results;
}

/* -------------------------------- reporting -------------------------------- */

function aggregate(results) {
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const byCheck = new Map();
  const failing = [];
  const errors = [];

  for (const result of results) {
    if (result.error) {
      errors.push(result);
      continue;
    }
    for (const [severity, count] of Object.entries(result.summary || {})) {
      if (severity in counts && typeof count === "number") counts[severity] += count;
    }
    for (const finding of result.findings) {
      if (!FAILING.has(finding.severity)) continue;
      failing.push({ url: result.url, finding });
      const entry = byCheck.get(finding.id) || { severity: finding.severity, pages: [] };
      entry.pages.push(`${result.url} — ${finding.message}`);
      byCheck.set(finding.id, entry);
    }
  }

  return { counts, byCheck, failing, errors };
}

function section(title, body) {
  return `## ${title}\n\n${body.trim() || "_(none)_"}\n`;
}

function markdown(urls, results, aggregateResult, previous, version) {
  const { counts, byCheck, failing, errors } = aggregateResult;
  const now = new Date().toISOString().slice(0, 10);
  const head = [
    `# SEO page audit — ${urls.length} URLs, ${now}`,
    "",
    `claude-seo page_checks ${version} · sitemap \`${SITEMAP}\``,
    "",
    `**Critical ${counts.Critical} · High ${counts.High} · Medium ${counts.Medium} · Low ${counts.Low}**`,
    "",
    "Severity contract: Critical/High/Medium fail the run; Low is informational",
    "and currently means the wide-DOM heuristic, which counts the inline",
    "`self.__next_f` scripts Next streams into `<body>` (one per ~4 KB of flight",
    "data) as if they were the site's own DOM.",
    "",
  ].join("\n");

  const above = [...byCheck.entries()]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a[1].severity) - SEVERITY_ORDER.indexOf(b[1].severity))
    .map(([id, entry]) => {
      const sample = entry.pages.slice(0, 5).map((line) => `- ${line}`).join("\n");
      const rest = entry.pages.length > 5 ? `\n- …and ${entry.pages.length - 5} more` : "";
      return `### ${entry.severity} · ${id} (${entry.pages.length} page${entry.pages.length === 1 ? "" : "s"})\n\n${sample}${rest}`;
    })
    .join("\n\n");

  const lowIds = new Set();
  for (const result of results) {
    if (result.error) continue;
    for (const finding of result.findings) {
      if (finding.severity === "Low") lowIds.add(finding.id);
    }
  }

  const newTable = (() => {
    if (!previous) return "_(no previous sweep to compare against)_";
    const before = new Set(Object.keys(previous.pages || {}));
    const added = results.filter((result) => !before.has(result.url));
    if (!added.length) return "_(no pages added since the previous sweep)_";
    return [
      "| URL | Result |",
      "|---|---|",
      ...added.map((result) => `| ${result.url} | ${result.error ? "fetch failed" : severityOf(result.findings)} |`),
    ].join("\n");
  })();

  const errorList = errors.length
    ? errors.map((result) => `- ${result.url} — ${result.error}`).join("\n")
    : "_(none)_";

  return [
    head,
    section("Findings above Low", above),
    section("Low, informational", lowIds.size ? [...lowIds].join(", ") : ""),
    section("New since the previous sweep", newTable),
    section("Pages the sweep could not read", errorList),
    failing.length ? "" : "",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";
}

function writeOutputs(urls, results, aggregateResult, version) {
  let previous = null;
  if (fs.existsSync(JSON_PATH)) {
    try {
      previous = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
    } catch {
      previous = null;
    }
  }

  const report = markdown(urls, results, aggregateResult, previous, version);

  if (!NO_WRITE) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, report);
    console.log(`report: ${REPORT_PATH}`);
  }

  // A `--limit`/`--only` run is a working aid, not a sweep: writing it as the
  // baseline would make the next full run label every page "new since the
  // previous sweep".
  if (ONLY || LIMIT) {
    console.log("subset run: baseline not updated");
    return report;
  }

  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  fs.writeFileSync(
    JSON_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sitemap: SITEMAP,
        tool: `page_checks ${version}`,
        counts: aggregateResult.counts,
        pages: Object.fromEntries(
          results.map((result) => [
            result.url,
            {
              severity: result.error ? "error" : severityOf(result.findings),
              findings: result.error ? [] : result.findings.map((finding) => `${finding.severity}:${finding.id}`),
              error: result.error || undefined,
            },
          ]),
        ),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`json: ${JSON_PATH}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  }
  return report;
}

/* ---------------------------------- main ---------------------------------- */

async function main() {
  const tool = pageChecksPath();
  if (!tool) {
    console.error(
      [
        "page_checks.py not found.",
        "",
        "Set CLAUDE_SEO_HOME to a checkout of github.com/AgriciDaniel/claude-seo,",
        "for example:",
        "  CLAUDE_SEO_HOME=/tmp/claude-seo npm run seo:audit   (bash)",
        "  $env:CLAUDE_SEO_HOME='C:/Users/you/AppData/Local/Temp/claude-seo'; npm run seo:audit",
        "",
        "The tool is deliberately not vendored in this repository.",
      ].join("\n"),
    );
    process.exit(2);
  }

  const python = pythonCommand();
  const version = toolVersion(tool);
  const probe = await run(python[0], [...python.slice(1), "--version"]);
  if (probe.code !== 0) {
    console.error(`python not usable (${python.join(" ")}): ${probe.stderr.trim()}`);
    process.exit(2);
  }

  let urls;
  try {
    urls = await sitemapUrls();
  } catch (error) {
    console.error(`could not read the sitemap: ${error.message}`);
    process.exit(2);
  }
  if (ONLY) urls = urls.filter((url) => url.includes(ONLY));
  if (LIMIT) urls = urls.slice(0, LIMIT);
  if (!urls.length) {
    console.error("the sitemap produced no URLs to audit");
    process.exit(2);
  }

  console.log(`auditing ${urls.length} URLs with ${path.basename(tool)} (${python.join(" ")})`);
  const results = await sweep(python, tool, urls);
  const aggregateResult = aggregate(results);
  writeOutputs(urls, results, aggregateResult, version);

  const { counts, failing, errors } = aggregateResult;
  console.log(
    `\nCritical ${counts.Critical} · High ${counts.High} · Medium ${counts.Medium} · Low ${counts.Low}` +
      ` · unreadable ${errors.length}`,
  );

  for (const { url, finding } of failing.slice(0, 20)) {
    console.log(`  ${finding.severity} ${finding.id} ${url}`);
  }
  if (failing.length > 20) console.log(`  …and ${failing.length - 20} more`);

  if (errors.length) {
    console.error(`\n${errors.length} page(s) could not be read; the audit did not measure them.`);
    process.exit(2);
  }
  process.exit(failing.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
