#!/usr/bin/env node
/**
 * Claim audit: what the pages promise, checked against what the resolvers do.
 *
 * The site's copy is written by hand in `lib/content/` — often months after the
 * resolver that backs it. When a parser stops accepting a URL shape, or a page
 * for an unimplemented feature is revived for its search volume, nothing in the
 * build notices: the page renders, the schema validates, and the promise is
 * false. This script moves that failure into the commit.
 *
 * Three layers, cheapest first:
 *
 *   1. Capability evidence — every capability below names the source token
 *      that proves it (or the pattern that proves it is absent). If the code
 *      changes, the table is reported *stale* instead of silently drifting.
 *   2. Promise phrases — sentences in page copy that assert an unsupported
 *      capability ("save TikTok stories"). Refusals are skipped: a sentence
 *      that says a thing is impossible is the honest form, not a violation.
 *   3. Retired pages — a route or content entry for a capability no resolver
 *      backs is a doorway page by definition, so its existence fails the run.
 *
 * `--live` adds the fourth layer: it POSTs real URL shapes to the deployed API
 * and asserts the accepted/rejected answer each page depends on. Offline mode
 * (the default, and the one wired into `npm run verify`) touches no network.
 *
 * Exit codes: 0 = claims match capabilities, 1 = at least one does not,
 * 2 = --live ran but the target was unreachable (inconclusive, not a pass).
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const liveMode = args.includes("--live");
const baseArg = args.find((arg) => arg.startsWith("--base="));
const baseUrl = (baseArg ? baseArg.slice("--base=".length) : "https://www.lamptik.online").replace(
  /\/+$/,
  "",
);

const rel = (absolute) => path.relative(root, absolute).split(path.sep).join("/");

/* ------------------------------------------------------------------ *
 * Capabilities: what the resolvers can actually do.
 *
 * `evidence` is what makes this table checkable rather than aspirational.
 * `contains` tokens must appear in the named file; `absent` patterns must
 * not. Either mismatch means the resolver moved and the table below (plus
 * the copy that relies on it) needs a decision, not a silent pass.
 * ------------------------------------------------------------------ */
const CAPABILITIES = {
  "tiktok.video": {
    supported: true,
    label: "TikTok video posts (/@user/video/<id>, vm/vt short links)",
    evidence: [{ file: "lib/tiktok/parse.ts", contains: ["video", "SHORT_HOSTS"] }],
  },
  "tiktok.photo": {
    supported: true,
    label: "TikTok photo-mode posts (/@user/photo/<id>)",
    evidence: [{ file: "lib/tiktok/parse.ts", contains: ["photo"] }],
    route: "app/api/tiktok/photo/route.ts",
  },
  "tiktok.story": {
    supported: false,
    label: "TikTok Stories (app-only, no web URL shape)",
    // If the parser ever learns /story/, this table is stale in the good
    // direction: the copy may then make the claim, and this check must be
    // updated deliberately rather than failing on a page that is now right.
    evidence: [{ file: "lib/tiktok/parse.ts", absent: [/\bstory\b/i] }],
    retiredSlug: "tiktok-story-downloader",
  },
  "tiktok.mp3": {
    supported: true,
    label: "TikTok original audio as MP3/M4A",
    evidence: [{ file: "lib/tiktok/parse.ts", contains: ["video"] }],
  },
  "instagram.video": {
    supported: true,
    label: "Instagram reels, video posts and IGTV (/reel/, /p/, /tv/, /share/)",
    evidence: [{ file: "lib/instagram.ts", contains: ["reels?", "/share/"] }],
  },
  "instagram.story": {
    supported: false,
    label: "Instagram Stories and highlights (no resolver, no web stream)",
    evidence: [{ file: "lib/instagram.ts", absent: [/\bstories\b/i] }],
    retiredSlug: "instagram-story-downloader",
  },
  "instagram.carousel": {
    supported: false,
    label: "Instagram photo carousels (no video stream; refused by the resolver)",
    evidence: [{ file: "lib/instagram.ts", contains: ["carousel"] }],
  },
  "facebook.video": {
    supported: true,
    label: "Facebook videos, reels, watch links and fb.watch shares",
    evidence: [{ file: "lib/facebook.ts", contains: ["fb.watch", "story.php"] }],
  },
  "facebook.private": {
    supported: false,
    label: "Private Facebook videos and closed-group reels (need a session)",
    evidence: [{ file: "lib/facebook.ts", contains: ["FACEBOOK_HOST_SUFFIXES"] }],
  },
  "youtube.video": {
    supported: true,
    label: "YouTube watch, shorts and live links",
    evidence: [{ file: "lib/youtube-ytdlp.ts", contains: ["no-playlist"] }],
  },
  "youtube.playlist": {
    supported: true,
    label: "YouTube playlists (listing endpoint)",
    evidence: [{ file: "app/api/youtube/playlist/route.ts", exists: true }],
  },
  "youtube.subtitles": {
    supported: false,
    label: "YouTube captions and transcripts",
    // Measured 2026-11: every Innertube client answers LOGIN_REQUIRED from the
    // deployment IP, so the feature was built and reverted. A caption route
    // appearing here means the block lifted — update this table on purpose.
    evidence: [{ file: "app/api/youtube/route.ts", absent: [/\bcaptions?\b/i] }],
    retiredSlug: "youtube-transcript-downloader",
  },
  "twitter.video": {
    supported: true,
    label: "X/Twitter post videos and GIFs",
    evidence: [{ file: "lib/twitter.ts", contains: ["STATUS_PATH"] }],
  },
  "twitter.spaces": {
    supported: false,
    label: "X Spaces audio (no extractor)",
    evidence: [{ file: "lib/twitter.ts", absent: [/\bspaces?\b/i] }],
    retiredSlug: "twitter-spaces-downloader",
  },
};

/**
 * A promise is a verb followed by its object, not a keyword on a page.
 * `download IGTV videos, photo posts and carousels` is a question heading and
 * `saves under the post's caption` is about the button's position; neither is
 * a claim, and a 40-character keyword window caught both. The gap is capped at
 * two words so "save TikTok stories" matches while a different noun three
 * words later does not.
 */
const promise = (verbs, nouns) =>
  new RegExp(`\\b(?:${verbs})\\b(?:\\s+[\\w'’-]+){0,2}\\s+(?:${nouns})\\b`, "i");

const CLAIM_RULES = [
  {
    capability: "tiktok.story",
    patterns: [
      promise("save|download|get|grab|fetch|paste|copy", "stor(?:y|ies)"),
      /\bstory (?:link|saver|downloader)\b/i,
    ],
    platforms: ["tiktok"],
  },
  {
    capability: "instagram.story",
    patterns: [
      promise(
        "save|download|get|grab|fetch|paste|copy",
        "stor(?:y|ies)|highlights?",
      ),
    ],
    platforms: ["instagram"],
  },
  {
    capability: "instagram.carousel",
    patterns: [promise("save|download|get|grab", "carousels?")],
    platforms: ["instagram"],
  },
  {
    capability: "facebook.private",
    // The adjective sits inside the object, so this one cannot use `promise`.
    patterns: [
      /\b(?:save|download|get|grab)\b[^.!?\n]{0,30}\bprivate (?:videos?|reels?|posts?|groups?)\b/i,
    ],
    platforms: ["facebook"],
  },
  {
    capability: "youtube.subtitles",
    patterns: [promise("save|download|get|grab|extract", "captions?|subtitles?|transcripts?")],
    platforms: ["youtube"],
  },
  {
    capability: "twitter.spaces",
    patterns: [promise("save|download|get|grab|record", "spaces?")],
    platforms: ["twitter"],
  },
];

/** A sentence is a refusal when it denies the thing, not when it omits it. */
const NEGATION =
  /\b(?:no|not|never|cannot|can't|doesn't|don't|isn't|aren't|refuse[sd]?|unsupported|impossible|no longer)\b/i;

/** Content that renders as page copy. */
const CONTENT_FILES = [
  "lib/content/tool-seo.ts",
  "lib/i18n/platform-landings.ts",
];

const SUB_TOOL_DIR = "lib/content/sub-tools";

/* ------------------------------------------------------------------ */

const failures = [];
const stale = [];
const notes = [];

async function exists(file) {
  try {
    const info = await stat(path.join(root, file));
    return info.isFile() || info.isDirectory();
  } catch {
    return false;
  }
}

/** 1-based line for an offset in a source string. */
function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/** Platform declared by a sub-tool module, or "any" for shared copy. */
function platformOf(source) {
  const match = source.match(/platform:\s*"([a-z]+)"/);
  return match ? match[1] : "any";
}

/**
 * Walk every sentence in a file and report the ones that assert an
 * unsupported capability. Sentences (not lines) are the unit because the
 * copy wraps mid-thought and a refusal often follows on the same line.
 */
function scanClaims(file, source, platform) {
  const sentences = [];
  // Each line is its own unit as well as each sentence: the registry is one
  // string per line, and a long paragraph that happens to contain "cannot"
  // must not launder an unrelated promise three fields further down.
  // A quoted question ends `?",` — the quote and comma sit between the mark
  // and the whitespace, so the boundary has to step over them or the answer
  // is glued to the question and inherits its promise.
  const boundary = /[.!?]["'”’)\]]?\s|\n/g;
  let start = 0;
  let match;
  while ((match = boundary.exec(source))) {
    sentences.push({ text: source.slice(start, match.index + 1), at: start });
    start = match.index + match[0].length;
  }
  sentences.push({ text: source.slice(start), at: start });

  for (const rule of CLAIM_RULES) {
    const capability = CAPABILITIES[rule.capability];
    if (!capability) {
      stale.push(`claim rule names unknown capability "${rule.capability}"`);
      continue;
    }
    if (capability.supported) continue;
    if (rule.platforms && platform !== "any" && !rule.platforms.includes(platform)) continue;

    for (const sentence of sentences) {
      const text = sentence.text;
      // A question is an answer waiting to happen: "Can I download IGTV …
      // carousels?" is the FAQ heading, and the reply under it is what the
      // visitor acts on. Scan the reply, not the prompt.
      if (/\?["'”’)\],]*\s*$/.test(text)) continue;
      if (NEGATION.test(text)) continue;
      for (const pattern of rule.patterns) {
        const hit = text.match(pattern);
        if (!hit) continue;
        const offset = sentence.at + (hit.index ?? 0);
        failures.push({
          kind: "claim",
          file,
          line: lineAt(source, offset),
          message: `promises "${hit[0].trim().slice(0, 90)}" but capability ${rule.capability} is not supported`,
        });
        break;
      }
    }
  }
}

async function checkEvidence() {
  for (const [id, capability] of Object.entries(CAPABILITIES)) {
    for (const check of capability.evidence ?? []) {
      const absolute = path.join(root, check.file);
      if (check.exists) {
        if (!(await exists(check.file))) {
          stale.push(`${id}: ${check.file} no longer exists — capability ${id} is unproven`);
        }
        continue;
      }
      let source;
      try {
        source = await readFile(absolute, "utf8");
      } catch {
        stale.push(`${id}: cannot read ${check.file} — capability ${id} is unproven`);
        continue;
      }
      for (const token of check.contains ?? []) {
        if (!source.includes(token)) {
          stale.push(
            `${id}: ${check.file} no longer contains "${token}" — update the capability table and the copy that relies on it`,
          );
        }
      }
      for (const pattern of check.absent ?? []) {
        if (pattern.test(source)) {
          stale.push(
            `${id}: ${check.file} now matches ${pattern} — the resolver may have gained this feature; the table and its retired page claim need a deliberate update`,
          );
        }
      }
    }
    if (capability.route && !(await exists(capability.route))) {
      stale.push(`${id}: ${capability.route} is missing — the endpoint the copy names is gone`);
    }
    if (!capability.supported && capability.retiredSlug) {
      const entryFile = `${SUB_TOOL_DIR}/${capability.retiredSlug}.ts`;
      const routeDir = `app/(site)/${capability.retiredSlug}`;
      if (await exists(entryFile)) {
        failures.push({
          kind: "retired",
          file: rel(path.join(root, entryFile)),
          message: `a page exists for ${id}, which no resolver backs — retire the route (301) instead of promising it`,
        });
      }
      if (await exists(routeDir)) {
        failures.push({
          kind: "retired",
          file: rel(path.join(root, routeDir)),
          message: `a route exists for ${id}, which no resolver backs — the 301 is missing or the page came back`,
        });
      }
    }
  }
}

async function scanAllClaims() {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(path.join(root, SUB_TOOL_DIR));
  for (const name of entries.filter((entry) => entry.endsWith(".ts")).sort()) {
    const file = `${SUB_TOOL_DIR}/${name}`;
    const source = await readFile(path.join(root, file), "utf8");
    scanClaims(file, source, platformOf(source));
  }
  for (const file of CONTENT_FILES) {
    let source;
    try {
      source = await readFile(path.join(root, file), "utf8");
    } catch {
      notes.push(`${file} not found — skipped`);
      continue;
    }
    scanClaims(file, source, "any");
  }
}

/* ---------------------------- live probes --------------------------- */

/**
 * Each row is a URL shape a page tells the visitor to paste. "accepted" means
 * the API must not answer INVALID_URL/UNSUPPORTED_URL (a provider error is a
 * different failure and is allowed here); "rejected" means it must.
 */
const LIVE_PROBES = [
  {
    capability: "tiktok.video",
    method: "POST",
    endpoint: "/api/fetch",
    url: "https://www.tiktok.com/@nasa/video/7000000000000000000",
    expect: "accepted",
  },
  {
    capability: "tiktok.story",
    method: "POST",
    endpoint: "/api/fetch",
    url: "https://www.tiktok.com/@nasa/story/7000000000000000000",
    expect: "rejected",
  },
  {
    capability: "tiktok.photo",
    method: "POST",
    endpoint: "/api/tiktok/photo",
    url: "https://www.tiktok.com/@nasa/photo/7000000000000000000",
    expect: "accepted",
  },
  {
    capability: "instagram.video",
    method: "POST",
    endpoint: "/api/fetch",
    url: "https://www.instagram.com/reel/C8QxYzAbCdE/",
    expect: "accepted",
  },
  {
    capability: "instagram.story",
    method: "POST",
    endpoint: "/api/fetch",
    url: "https://www.instagram.com/stories/nasa/3000000000000000000/",
    expect: "rejected",
  },
  {
    capability: "facebook.video",
    method: "POST",
    endpoint: "/api/fetch",
    url: "https://www.facebook.com/watch/?v=1000000000000000",
    expect: "accepted",
  },
  {
    capability: "youtube.video",
    method: "POST",
    endpoint: "/api/youtube",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    expect: "accepted",
  },
  {
    capability: "youtube.playlist",
    method: "GET",
    endpoint:
      "/api/youtube/playlist?url=" +
      encodeURIComponent("https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI"),
    expect: "accepted",
  },
  {
    capability: "twitter.video",
    method: "GET",
    endpoint:
      "/api/twitter?url=" + encodeURIComponent("https://x.com/nasa/status/1000000000000000000"),
    expect: "accepted",
  },
];

const REJECTION_CODES = new Set(["INVALID_URL", "UNSUPPORTED_URL"]);

async function probe(probeSpec) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${baseUrl}${probeSpec.endpoint}`, {
      method: probeSpec.method,
      headers: probeSpec.method === "POST" ? { "content-type": "application/json" } : undefined,
      body: probeSpec.method === "POST" ? JSON.stringify({ url: probeSpec.url }) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return { capability: probeSpec.capability, state: "inconclusive", detail: `non-JSON response (${response.status})` };
    }
    const code = payload?.error?.code ?? null;
    const accepted = !REJECTION_CODES.has(code);
    const wanted = probeSpec.expect === "accepted";
    if (accepted !== wanted) {
      failures.push({
        kind: "live",
        file: probeSpec.endpoint,
        line: 0,
        message:
          `${probeSpec.capability}: ${probeSpec.url} answered ${code ?? "ok"} — the page tells visitors this link works` +
          (wanted ? " but the API rejects the shape" : " but the API accepts a shape no page should promise"),
      });
      return { capability: probeSpec.capability, state: "mismatch", detail: code ?? "ok" };
    }
    return { capability: probeSpec.capability, state: "match", detail: code ?? "ok" };
  } catch (error) {
    return {
      capability: probeSpec.capability,
      state: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runLive() {
  console.log(`claim audit (live): probing ${baseUrl}`);
  // Sequential, deliberately: parallel probes on a cold function would report
  // each other's provider throttling as a capability mismatch.
  const results = [];
  for (const spec of LIVE_PROBES) {
    const result = await probe(spec);
    results.push(result);
    const mark = result.state === "match" ? "ok" : result.state;
    console.log(`  ${mark.padEnd(12)} ${result.capability.padEnd(20)} ${result.detail}`);
  }
  return results;
}

/* ------------------------------- main ------------------------------- */

await checkEvidence();
await scanAllClaims();

let liveResults = [];
if (liveMode) liveResults = await runLive();

for (const note of notes) console.warn(`note: ${note}`);

if (stale.length > 0) {
  console.error("\nclaim audit: the capability table is stale — resolve one side or the other:");
  for (const message of stale) console.error(`  - ${message}`);
  process.exit(1);
}

if (failures.length > 0) {
  console.error("\nclaim audit: page copy promises what the resolvers cannot deliver:");
  for (const failure of failures) {
    console.error(`  ${failure.file}${failure.line ? `:${failure.line}` : ""}`);
    console.error(`    ${failure.message}`);
  }
  console.error(
    "\nEach of these is a false claim on a live page. Retire the route (301), or" +
      "\nmake the sentence a refusal — never soften it into a doorway.\n",
  );
  process.exit(1);
}

const capabilityIds = Object.keys(CAPABILITIES);
const supported = Object.values(CAPABILITIES).filter((capability) => capability.supported).length;
const unsupported = capabilityIds.length - supported;
const liveNote = liveResults.length
  ? `, ${liveResults.filter((result) => result.state === "match").length}/${liveResults.length} live probe(s) matched`
  : "";
console.log(
  `claim audit: ${capabilityIds.length} capabilities (${supported} supported, ${unsupported} refused), ` +
    `${CLAIM_RULES.length} promise rule(s), ${LIVE_PROBES.length} probe shape(s)${liveNote}`,
);

if (liveMode && liveResults.some((result) => result.state === "unreachable")) {
  console.error("claim audit: at least one probe could not reach the target — result is inconclusive.");
  process.exit(2);
}
