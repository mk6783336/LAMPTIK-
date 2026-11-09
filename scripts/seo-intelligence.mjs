#!/usr/bin/env node
/**
 * Live SERP & zero-KD radar — the free replacement for "I don't have an Ahrefs
 * key, so I guessed the difficulty".
 *
 * Run:  npm run seo:radar                 (full pass, ~4-6 minutes)
 *       npm run seo:radar -- --quick      (fewer queries, ~60 seconds)
 *       npm run seo:radar -- --serp-only  (skip the autocomplete harvest)
 *
 * What it actually does, and what it deliberately does not:
 *
 *  1. AUTOCOMPLETE HARVEST. Google's suggest endpoint (per-country `gl`) and
 *     Bing's `osjson` endpoint are asked the same question for every tool seed
 *     and every question/qualifier modifier: `how to`, `why won't`, `without
 *     watermark`, `iphone`, `capcut`, `mp3`, `1080p`, `safe zone`, `calculator`.
 *     Both endpoints are public JSON, no key, no scraping.
 *
 *  2. LIVE SERP MEASUREMENT. Each harvested query is put to Bing's HTML SERP
 *     (full results, no key, no headless Chromium download) and the top 10
 *     organic results are parsed for domain + title. Bing wraps each href in
 *     a `bing.com/ck/a?u=a1<base64url>` tracker, so the destination is decoded
 *     before the domain is scored. DuckDuckGo's HTML endpoint is the fallback:
 *     from this network it starts returning 403 after a couple of requests.
 *
 *     Google's own SERP is NOT scraped: a scripted GET gets a consent wall or
 *     a 429 within a handful of requests, and driving around it is exactly the
 *     behaviour that gets an IP banned. Bing-via-DDG is a real, current index
 *     and it is honest about being a proxy — `indexSource` in the output says
 *     so. Treat the verdicts as a *screen* to decide what to hand-write, not as
 *     a ranking guarantee.
 *
 *  3. VERDICTS, by the rules this repo agreed on:
 *       - 2+ forum/UGC/thin results in the top 5 (reddit, quora, github,
 *         medium, tiktok.com/discover) → TRUE ZERO-KD, rank opportunity now;
 *       - snaptik.app + ssstik.io + savefrom.net holding #1-#3 with exact-match
 *         titles → LOCKED HEAD TERM, do not spend a page on it;
 *       - anything else is CONTESTED, with the weak spots printed so the page
 *         can still be aimed at the gap.
 *
 * Output: `docs/live-zero-kd-opportunities.md` (committed, human-readable) and
 * `.scratch/seo-radar.json` (machine-readable, git-ignored).
 *
 * Exit codes: 0 = measured something, 1 = every SERP request failed (a blocked
 * network must never look like "no opportunities exist").
 */

import fs from "node:fs";
import path from "node:path";

/* --------------------------------- config --------------------------------- */

const ARGS = new Set(process.argv.slice(2));
const QUICK = ARGS.has("--quick");
const SERP_ONLY = ARGS.has("--serp-only");

const GEOS = QUICK ? ["us", "gb"] : ["us", "gb", "de", "fr", "ca", "au", "sa"];
const MODIFIERS = [
  "how to",
  "why won't",
  "without watermark",
  "iphone",
  "capcut",
  "mp3",
  "1080p",
  "safe zone",
  "calculator",
  // Problem, device, codec and workflow qualifiers. These are the phrases the
  // head-term downloaders have no page for, which is where the openings are.
  "fix",
  "not working",
  "camera roll",
  "premiere pro",
  "h264",
  "60fps",
  "slideshow",
  "overlay",
  "by country",
];

/**
 * Every tool carries its head term plus the long-tail problem, device, format
 * and creator-workflow seeds that the giant downloaders have no page for. The
 * first seed receives every modifier; the extras are measured as written, so a
 * deliberate phrase like `tiktok safe zone overlay checker 1080x1920` is tested
 * exactly as a person would type it.
 */
const TOOLS = [
  {
    slug: "tiktok",
    page: "/",
    seeds: [
      "tiktok video downloader",
      "download tiktok to iphone camera roll without app",
      "tiktok h264 mp4 downloader for premiere pro",
      "download 1080p 60fps tiktok without watermark",
      "tiktok slideshow photo downloader hd",
    ],
  },
  {
    slug: "instagram",
    page: "/instagram-reels-downloader",
    seeds: [
      "instagram reels downloader",
      "save instagram reel audio to iphone files",
      "instagram reels audio mp3 extractor",
      "download instagram reel hd without login",
    ],
  },
  {
    slug: "youtube",
    page: "/youtube-downloader",
    seeds: [
      "youtube video downloader",
      "youtube to mp3 320kbps",
      "youtube shorts downloader hd",
      "youtube 1080p 60fps download edit upload workflow",
    ],
  },
  {
    slug: "facebook",
    page: "/facebook-video-downloader",
    seeds: [
      "facebook video downloader",
      "facebook video downloader iphone safari",
      "save facebook video to iphone camera roll",
      "fb watch video download hd 1080p",
    ],
  },
  {
    slug: "twitter",
    page: "/twitter-video-downloader",
    seeds: [
      "twitter video downloader",
      "twitter gif to mp4 converter online",
      "x video download mp4 hd",
    ],
  },
  {
    slug: "thumbnail",
    page: "/video-thumbnail-downloader",
    seeds: [
      "youtube thumbnail downloader",
      "video thumbnail extractor hd",
      "tiktok thumbnail downloader",
    ],
  },
  {
    slug: "caption",
    page: "/tiktok-caption-hashtag-extractor",
    seeds: [
      "tiktok hashtag generator",
      "tiktok caption extractor from link",
      "extract hashtags from tiktok video link",
    ],
  },
  {
    slug: "safe-zone",
    page: "/tiktok-safe-zone-checker",
    seeds: [
      "tiktok safe zone",
      "tiktok safe zone overlay checker 1080x1920",
      "instagram reels safe zone template",
    ],
  },
  {
    slug: "money",
    page: "/tiktok-money-calculator",
    seeds: [
      "tiktok money calculator",
      "tiktok creator rewards rpm calculator by country",
      "tiktok rpm calculator 2026",
    ],
  },
];

/** Domains that signal an open SERP rather than a defended one. */
const WEAK_DOMAINS = [
  "reddit.com",
  "quora.com",
  "github.com",
  "medium.com",
  "tiktok.com/discover",
  "pinterest.",
  "facebook.com/groups",
  "youtube.com/watch",
];
/** The three incumbents that own the head terms in this niche. */
const BRAND_DOMAINS = ["snaptik.app", "ssstik.io", "savefrom.net"];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const OUT_DOC = path.join(process.cwd(), "docs/live-zero-kd-opportunities.md");
const OUT_JSON = path.join(process.cwd(), ".scratch/seo-radar.json");
const SERP_LIMIT = QUICK ? 12 : 70;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...parts) => console.log(...parts);

/**
 * A verdict is only useful as a delta: "this phrase is a LOW-KD GAP today" say
 * nothing about whether the page we wrote for it moved three weeks later. Each
 * run appends one compact line here, in git, so `npm run seo:radar:diff` can
 * compare this sweep with the last one instead of asking anyone to remember it.
 * The raw SERP evidence stays in the git-ignored `.scratch/seo-radar.json`.
 */
const HISTORY_JSONL = path.join(process.cwd(), "docs/seo-radar-history.jsonl");

function recordSnapshot(measured) {
  const snapshot = {
    ranAt: new Date().toISOString(),
    measured: measured.map((row) => ({
      query: row.query,
      verdict: row.verdict,
      difficulty: row.difficulty,
      page: row.page ?? null,
    })),
  };
  fs.appendFileSync(HISTORY_JSONL, `${JSON.stringify(snapshot)}\n`);
  log(`history: snapshot appended (${snapshot.measured.length} queries) → docs/seo-radar-history.jsonl`);
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json,*/*" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // Bing's osjson is valid JSON but occasionally served as text/javascript.
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("non-JSON body");
    return JSON.parse(match[0]);
  }
}

/* ------------------------------ 1. autocomplete --------------------------- */

async function googleSuggest(query, geo) {
  const url =
    "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=" +
    `${geo}&q=${encodeURIComponent(query)}`;
  const body = await getJson(url);
  return Array.isArray(body?.[1]) ? body[1].filter((entry) => typeof entry === "string") : [];
}

async function bingSuggest(query) {
  const body = await getJson(`https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`);
  return Array.isArray(body?.[1]) ? body[1].filter((entry) => typeof entry === "string") : [];
}

/**
 * A suggestion is only worth measuring when it is (a) about one of our tools,
 * (b) a real phrase rather than a navigational variant, and (c) not simply the
 * seed we started from.
 */
function usableSuggestion(text) {
  const value = text.trim().toLowerCase();
  if (value.length < 12 || value.length > 70) return false;
  if (value.split(/\s+/).length < 3) return false;
  return true;
}

async function harvest() {
  const found = new Map(); // query -> { hits, geos:Set, tool }
  const stats = { googleCalls: 0, googleFails: 0, bingCalls: 0, bingFails: 0 };

  const jobs = [];
  for (const tool of TOOLS) {
    const [primary, ...extras] = tool.seeds;
    for (const modifier of MODIFIERS) {
      jobs.push({ tool, query: `${modifier} ${primary}` });
    }
    // Extras are measured verbatim: they already read like a real search.
    for (const seed of extras) jobs.push({ tool, query: seed });
  }
  for (const [index, job] of jobs.entries()) job.geo = GEOS[index % GEOS.length];

  for (let index = 0; index < jobs.length; index += 4) {
    const batch = jobs.slice(index, index + 4);
    await Promise.all(
      batch.map(async ({ tool, query, geo }) => {
        stats.googleCalls += 1;
        try {
          const suggestions = await googleSuggest(query, geo);
          for (const suggestion of suggestions) {
            if (!usableSuggestion(suggestion)) continue;
            const key = suggestion.toLowerCase();
            const entry = found.get(key) ?? { hits: 0, geos: new Set(), tool: tool.slug, page: tool.page };
            entry.hits += 1;
            entry.geos.add(geo);
            found.set(key, entry);
          }
        } catch {
          stats.googleFails += 1;
        }
      }),
    );
    await sleep(120);
  }

  for (const tool of TOOLS) {
    stats.bingCalls += 1;
    try {
      const suggestions = [];
      for (const seed of tool.seeds) suggestions.push(...(await bingSuggest(seed)));
      for (const suggestion of suggestions) {
        if (!usableSuggestion(suggestion)) continue;
        const key = suggestion.toLowerCase();
        const entry = found.get(key) ?? { hits: 0, geos: new Set(), tool: tool.slug, page: tool.page };
        entry.hits += 1;
        entry.geos.add("bing");
        found.set(key, entry);
      }
    } catch {
      stats.bingFails += 1;
    }
    await sleep(120);
  }

  const ranked = [...found.entries()]
    .map(([query, entry]) => ({ query, hits: entry.hits, geos: [...entry.geos], tool: entry.tool, page: entry.page }))
    .sort((a, b) => b.hits - a.hits || b.geos.length - a.geos.length);

  log(
    `autocomplete: ${stats.googleCalls} Google calls (${stats.googleFails} failed), ` +
      `${stats.bingCalls} Bing calls (${stats.bingFails} failed) → ${ranked.length} unique phrases`,
  );
  return ranked;
}

/* ---------------------------------- 2. SERP ------------------------------- */

/** DuckDuckGo wraps every result in `//duckduckgo.com/l/?uddg=<target>`. */
function decodeResultUrl(href) {
  const raw = href.startsWith("//") ? `https:${href}` : href;
  try {
    const url = new URL(raw, "https://duckduckgo.com");
    const target = url.searchParams.get("uddg");
    return (target ? decodeURIComponent(target) : url.href).replace(/^https?:\/\//, "");
  } catch {
    return raw.replace(/^https?:\/\//, "");
  }
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function duckduckgo(query) {
  const response = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "user-agent": UA,
      "content-type": "application/x-www-form-urlencoded",
      accept: "text/html",
    },
    body: new URLSearchParams({ q: query, kl: "us-en" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const results = [];
  const block = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(block)) {
    const url = decodeResultUrl(match[1]);
    const title = stripTags(match[2]);
    if (!url || !title) continue;
    results.push({ url, domain: url.split("/")[0].replace(/^www\./, ""), title });
    if (results.length >= 10) break;
  }
  if (results.length === 0) throw new Error("no organic results parsed");
  return results;
}

/**
 * Bing wraps every organic href in a click-tracker:
 * `https://www.bing.com/ck/a?...&u=a1<base64url of the real URL>`. Reading the
 * href without decoding `u` yields ten bing.com links and a parser that looks
 * broken — which is exactly what the first version of this script did.
 */
function decodeBingHref(href) {
  const raw = href.replace(/&amp;/g, "&");
  if (!/bing\.com\/ck\/a/.test(raw)) return raw;
  try {
    const target = new URL(raw).searchParams.get("u");
    if (!target) return raw;
    // `a1` is Bing's version prefix; the rest is base64url of the destination.
    const encoded = target.startsWith("a1") ? target.slice(2) : target;
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return raw;
  }
}

/** Bing's live HTML SERP — the primary source, because it does not block. */
async function bingHtml(query) {
  const response = await fetch(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10&setlang=en`,
    {
      headers: { "user-agent": UA, accept: "text/html", "accept-language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const results = [];
  const block = /(<li class="b_algo"[\s\S]{0,4000}?)<h2><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(block)) {
    const url = decodeBingHref(match[2]).replace(/^https?:\/\//, "");
    const title = stripTags(match[3]);
    if (!url || !title || /bing\.com|microsoft\.com/.test(url)) continue;
    results.push({ url, domain: url.split("/")[0].replace(/^www\./, ""), title });
    if (results.length >= 10) break;
  }
  if (results.length === 0) throw new Error("no organic results parsed");
  return results;
}

const SIGNIFICANT = new Set([
  "the", "a", "an", "to", "for", "of", "and", "in", "on", "how", "what", "is", "are",
  "do", "does", "i", "my", "with", "without", "won't", "not", "how", "why", "best",
]);

/** Exact-match title: every significant query term appears in the title. */
function exactMatchTitles(query, results) {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2 && !SIGNIFICANT.has(term));
  if (terms.length === 0) return 0;
  return results.filter((result) => {
    const title = result.title.toLowerCase();
    return terms.every((term) => title.includes(term));
  }).length;
}

function score(query, results) {
  const top = results.slice(0, 10);
  const top5 = top.slice(0, 5);

  /**
   * TOPICALITY GUARD. A SERP that never mentions the query is not an open
   * niche, it is a bad page: Bing answers some low-volume queries with an
   * unrelated "popular" block, and one run returned four Reddit short-form
   * video threads and six localized YouTube Shorts help pages for the query
   * `best iphone facebook video downloader`. Scoring that as zero-KD would
   * have put a fabricated opportunity in the report and then in a page title,
   * so a SERP that fails this check is discarded instead of scored.
   */
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2 && !SIGNIFICANT.has(term));
  const onTopic = top.filter((result) =>
    terms.some(
      (term) =>
        result.title.toLowerCase().includes(term) || result.url.toLowerCase().includes(term),
    ),
  ).length;
  if (top.length < 5 || onTopic < 2 || terms.length === 0) {
    return {
      verdict: "UNVERIFIED",
      difficulty: null,
      weakTop5: [],
      brandsTop3: [],
      exactTitlesTop5: 0,
      note: `off-topic SERP (${onTopic}/${top.length} results mention the query)`,
      top,
    };
  }
  const weakTop5 = top5.filter((result) =>
    WEAK_DOMAINS.some((domain) => result.domain.includes(domain) || result.url.includes(domain)),
  );
  const brandsTop3 = top.slice(0, 3).filter((result) =>
    BRAND_DOMAINS.some((domain) => result.domain.includes(domain)),
  );
  const exact = exactMatchTitles(query, top);
  const exactTop5 = exactMatchTitles(query, top5);

  let verdict = "CONTESTED";
  if (weakTop5.length >= 2) verdict = "TRUE ZERO-KD";
  else if (brandsTop3.length === 3 && exactTop5 >= 2) verdict = "LOCKED HEAD TERM";
  // LOW-KD GAP: the query is winnable on relevance rather than authority —
  // fewer than three of the ten ranking pages bothered to match the phrase in
  // their title, so someone can out-answer them without out-branding them.
  else if (exact < 3) verdict = "LOW-KD GAP";

  // 0 = wide open, 10 = three incumbents with exact-match titles.
  const difficulty = Math.min(
    10,
    Math.max(
      0,
      brandsTop3.length * 2.5 +
        Math.max(0, 3 - weakTop5.length) * 1.2 +
        exactTop5 * 1.5 -
        weakTop5.length,
    ),
  );

  return {
    verdict,
    difficulty: Math.round(difficulty * 10) / 10,
    weakTop5: weakTop5.map((result) => `${result.domain} (#${top.indexOf(result) + 1})`),
    brandsTop3: brandsTop3.map((result) => `${result.domain} (#${top.indexOf(result) + 1})`),
    exactTitlesTop5: exactTop5,
    top,
  };
}

async function measure(queries) {
  const measured = [];
  let failures = 0;
  // Bing first: it serves full HTML to a plain fetch. DuckDuckGo answers 403
  // from this network after a couple of requests, so it is the fallback only.
  let indexSource = "bing.com live HTML SERP";

  for (const [index, entry] of queries.entries()) {
    let results = null;
    try {
      results = await bingHtml(entry.query);
    } catch (error) {
      try {
        results = await duckduckgo(entry.query);
        indexSource = "duckduckgo-html (Bing blocked this query)";
      } catch (fallbackError) {
        failures += 1;
        log(`  ${entry.query} → both SERPs failed (${error.message} / ${fallbackError.message})`);
      }
    }
    if (results) {
      measured.push({ ...entry, ...score(entry.query, results) });
      const marker = measured[measured.length - 1].verdict;
      const row = measured[measured.length - 1];
      // A discarded SERP has no difficulty; printing one would imply a score.
      const weakness = row.difficulty === null ? "   —" : row.difficulty.toString().padStart(4);
      log(`  [${String(index + 1).padStart(2)}/${queries.length}] ${marker.padEnd(14)} ${weakness} · ${entry.query}`);
    }
    // Politeness: a human-paced SERP fetch is what keeps both sources willing;
    // at one request a second DuckDuckGo started answering 403.
    await sleep(1_500);
  }

  return { measured, failures, indexSource };
}

/* -------------------------------- 3. output ------------------------------- */

function tableFor(rows) {
  if (rows.length === 0) return "_Nothing measured in this run._\n";
  const header =
    "| # | Query | Verdict | Weakness | Weak spots in the top 5 | Incumbents in the top 3 | Exact-match titles (top 5) | Our page |\n" +
    "| --- | --- | --- | --- | --- | --- | --- | --- |\n";
  const body = rows
    .map(
      (row, index) =>
        `| ${index + 1} | \`${row.query}\` | ${row.verdict} | ` +
        `${row.difficulty === null || row.difficulty === undefined ? "—" : `${row.difficulty}/10`} | ` +
        `${row.weakTop5.join(", ") || "—"} | ${row.brandsTop3.join(", ") || "—"} | ` +
        `${row.exactTitlesTop5} | \`${row.page}\` |`,
    )
    .join("\n");
  return header + body + "\n";
}

function serpListFor(row) {
  return row.top
    .slice(0, 10)
    .map((result, index) => `${index + 1}. [${result.title}](https://${result.url}) — \`${result.domain}\``)
    .join("\n");
}

async function writeDocs(payload) {
  const { measured, harvested, stats, indexSource } = payload;
  const byDifficulty = (a, b) => (a.difficulty ?? 99) - (b.difficulty ?? 99);
  const zero = measured.filter((row) => row.verdict === "TRUE ZERO-KD").sort(byDifficulty);
  const gaps = measured.filter((row) => row.verdict === "LOW-KD GAP").sort(byDifficulty);
  const contested = measured.filter((row) => row.verdict === "CONTESTED").sort(byDifficulty);
  const locked = measured.filter((row) => row.verdict === "LOCKED HEAD TERM");
  const unverified = measured.filter((row) => row.verdict === "UNVERIFIED");

  const now = new Date().toISOString();
  const lines = [
    "# Live zero-KD opportunities",
    "",
    `Measured ${now.slice(0, 16).replace("T", " ")} UTC by \`npm run seo:radar\`. ` +
      `${measured.length} queries scored against live SERPs; ${harvested.length} phrases harvested from ` +
      `Google Suggest (${GEOS.join(", ")}) and Bing autocomplete.`,
    "",
    "**Source honesty.** The SERP column is read from " +
      `\`${indexSource}\`. Google's own HTML is not scraped — it consent-walls or 429s a scripted client within ` +
      "a few requests, and working around that is what gets an IP banned. Bing's index is current and public; " +
      "treat these verdicts as a screen for which page deserves hand-written depth, not as a ranking promise.",
    "",
    "**Verdict rules.** 2+ forum/UGC results (reddit, quora, github, medium, tiktok.com/discover) in the top 5 " +
      "→ `TRUE ZERO-KD`. snaptik.app + ssstik.io + savefrom.net in the top 3 with exact-match titles → " +
      "`LOCKED HEAD TERM`. Everything else → `CONTESTED`.",
    "",
    "## TRUE ZERO-KD — write the page now",
    "",
    tableFor(zero),
    "## LOW-KD GAP — winnable on relevance",
    "",
    "Fewer than three of the top ten match the phrase in their title, so a page that answers it properly does not need authority to outrank them.",
    "",
    tableFor(gaps.slice(0, 25)),
    "## CONTESTED — open but defended",
    "",
    tableFor(contested.slice(0, 15)),
    "## LOCKED HEAD TERM — do not fight it",
    "",
    tableFor(locked),
    "## DISCARDED — the SERP did not answer this query",
    "",
    unverified.length === 0
      ? "_Every measured SERP was on-topic._\n"
      : unverified
          .map((row) => `- \`${row.query}\` — ${row.note ?? "off-topic SERP"}; not scored, no verdict.`)
          .join("\n") + "\n",
  ];

  const e2e = zero.slice(0, 3);
  if (e2e.length > 0) {
    lines.push("## Evidence — the actual top 10 for the top three", "");
    for (const row of e2e) {
      lines.push(`### \`${row.query}\` — ${row.verdict}, ${row.difficulty}/10`, "", serpListFor(row), "");
    }
  }

  lines.push(
    "## How to use this file",
    "",
    "1. Pick a `TRUE ZERO-KD` row whose `Our page` is a page we already have — that is the cheapest win.",
    "2. Put the exact query in the page's `<title>` or its first `<h2>`, and add the question to that page's FAQ " +
      "array (the FAQ JSON-LD is generated from the same array, so schema and copy cannot drift).",
    "3. Re-run `npm run seo:radar` after a deploy: a phrase that leaves the zero-KD set was won or lost, and the " +
      "file records which.",
    "",
    `Raw data: \`.scratch/seo-radar.json\` (${stats.totalRequests} HTTP requests, ${stats.failures} SERP failures).`,
    "",
  );

  fs.mkdirSync(path.dirname(OUT_DOC), { recursive: true });
  fs.writeFileSync(OUT_DOC, lines.join("\n"));
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));
  log(`\nwrote ${path.relative(process.cwd(), OUT_DOC)} and .scratch/seo-radar.json`);
}

/* ---------------------------------- main ---------------------------------- */

async function main() {
  log(`SEO radar — ${SERP_ONLY ? "SERP only" : QUICK ? "quick" : "full"} pass`);
  const started = Date.now();

  let harvested = [];
  if (!SERP_ONLY && fs.existsSync(OUT_JSON)) {
    try {
      const previous = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
      if (Array.isArray(previous.harvested) && previous.harvested.length > 0) {
        harvested = previous.harvested;
        log(`autocomplete: reusing ${harvested.length} phrases from the last run (--serp-only)`);
      }
    } catch {
      harvested = [];
    }
  }
  if (harvested.length === 0) harvested = await harvest();

  /**
   * Diversify by tool before truncating. The harvest is dominated by TikTok
   * because that is the head term, so a plain `slice(0, 40)` measured forty
   * TikTok variants and no Instagram, YouTube or calculator query at all — a
   * radar that only sees one ninth of the site.
   */
  const perTool = new Map();
  const candidates = [];
  for (const entry of harvested) {
    const used = perTool.get(entry.tool) ?? 0;
    if (used >= 5) continue;
    perTool.set(entry.tool, used + 1);
    candidates.push(entry);
    if (candidates.length >= SERP_LIMIT) break;
  }

  if (candidates.length === 0) {
    log("No queries harvested — Google and Bing autocomplete both returned nothing.");
    process.exitCode = 1;
    return;
  }

  log(`\nmeasuring ${candidates.length} live SERPs:`);
  const { measured, failures, indexSource } = await measure(candidates);

  const stats = {
    totalRequests: candidates.length + (SERP_ONLY ? 0 : GEOS.length * TOOLS.length * MODIFIERS.length),
    failures,
    seconds: Math.round((Date.now() - started) / 1000),
  };

  if (measured.length === 0) {
    log("\nEvery SERP request failed — nothing was measured, so no verdict is reported.");
    process.exitCode = 1;
    return;
  }

  await writeDocs({ measured, harvested, stats, indexSource });
  recordSnapshot(measured);

  const zero = measured.filter((row) => row.verdict === "TRUE ZERO-KD");
  const locked = measured.filter((row) => row.verdict === "LOCKED HEAD TERM");
  log(
    `\n${measured.length} measured · ${zero.length} TRUE ZERO-KD · ${locked.length} locked head terms · ` +
      `${failures} failures · ${stats.seconds}s`,
  );
  for (const row of zero.slice(0, 10)) log(`  ZERO-KD ${row.difficulty}/10  ${row.query}  → ${row.page}`);
}

main().catch((error) => {
  console.error(`seo-radar failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
