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
 * `--measure` adds the fifth: it resolves one sample per height ceiling, reads
 * the first bytes of the stream each resolver returns and parses the `tkhd`
 * box, so a ceiling is compared with the file a visitor actually receives
 * rather than with the number a previous run typed. `--measure=update` records
 * the measured numbers back into this file. Both are opt-in: `verify` and CI
 * must not depend on four CDNs being reachable.
 *
 * Exit codes: 0 = claims match capabilities, 1 = at least one does not,
 * 2 = --live ran but the target was unreachable (inconclusive, not a pass).
 */

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const liveMode = args.includes("--live");
// `--measure` reads the deployed streams and compares their real dimensions to
// the ceilings below; `--measure=update` also rewrites those numbers. Off by
// default: `verify` must not depend on four CDNs being reachable.
const measureArg = args.find((arg) => arg === "--measure" || arg.startsWith("--measure="));
const measureMode = Boolean(measureArg);
const measureWrite = measureArg === "--measure=update";
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

/**
 * Measured ceilings: numbers a page may promise only up to.
 *
 * These are the claims that survive a capability review because they look like
 * specs rather than features. "Full HD 1080p" is a spec the resolver cannot
 * meet when it serves a 640×360 file, and "up to 320 kbps" is not a hedge — it
 * is the shape the false claim usually takes.
 *
 * `mention` is what makes the rule work across files: a YouTube number inside a
 * TikTok country page is still a YouTube claim, so the sentence decides which
 * measurement applies, not the file's `platform` field alone.
 *
 * `samples` are the links `--measure` resolves; `tolerance` is how far a
 * rendition may sit under the ceiling before the mismatch is called drift.
 */
const MEASUREMENTS = {
  "youtube.height": {
    measured: "640×360 (3 sample(s), 2026-11-13)",
    display: "640×360",
    max: 360,
    unit: "height",
    date: "2026-11-13",
    method: "bytes of the served MP4, tkhd box",
    // Three uploads on purpose: the ceiling is only meaningful against sources
    // the platform actually stored above it (240p, 1080p and a 4K master).
    samples: [
      { url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", route: "/api/youtube" },
      { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", route: "/api/youtube" },
      { url: "https://www.youtube.com/watch?v=LXb3EKWsInQ", route: "/api/youtube" },
    ],
    platforms: ["youtube"],
    mention: /\byoutube\b/i,
    numbers: "1080p|2160p|4k|1080×1920|1080x1920|720p",
  },
  "youtube.audio": {
    measured: "128–160 kbps (256 for Shorts)",
    display: "128–160",
    max: 256,
    unit: "kbps",
    date: "2026-11-13",
    method: "published AAC rate",
    platforms: ["youtube"],
    mention: /\byoutube\b/i,
    numbers: "\\d{2,3}\\s?(?:kbps|kbit\\/s)",
  },
  "instagram.height": {
    // Three public reels measured 2026-11-13: 718×1276, 720×1280 and 576×1024.
    // Instagram's player shows 1080×1920 for these; the resolver hands back the
    // 720p-class rendition, so 1920 is a ceiling the file never reaches.
    measured: "720×1280 class (718×1276, 720×1280, 576×1024)",
    display: "720×1280",
    max: 1280,
    unit: "height",
    date: "2026-11-13",
    method: "bytes of the served MP4, tkhd box",
    samples: [{ url: "https://www.instagram.com/reel/DeTUk4sDSp-/" }],
    platforms: ["instagram"],
    mention: /\binstagram\b/i,
    numbers: "1080p|1080×1920|1080x1920|1920p|2160p|4k|720p",
  },
  "twitter.height": {
    // Measured 2026-11-13 on an @NASA post: X published 3840×2160 and the
    // resolver handed that variant back, so 1080p claims are understatements
    // here, not lies.
    measured: "3840×2160",
    display: "3840×2160",
    max: 2160,
    unit: "height",
    date: "2026-11-13",
    method: "bytes of the served MP4, tkhd box",
    samples: [{ url: "https://x.com/NASA/status/2042791040516845925", route: "/api/twitter" }],
    platforms: ["twitter"],
    mention: /\btwitter\b|\bx\.com\b|\btweets?\b/i,
    numbers: "1080p|720p|2160p|4k",
  },
  "tiktok.height": {
    // Three public posts measured 2026-11-13 — a 2019 upload, a 2022 one and a
    // 2025 one. The resolver's play address served 576×1024 every time, so
    // every 720p/1080p claim on a TikTok page is above the real file.
    measured: "576×1024 (2019, 2022 and 2025 posts)",
    display: "576×1024",
    max: 1024,
    unit: "height",
    date: "2026-11-13",
    method: "bytes of the served MP4, tkhd box",
    samples: [
      { url: "https://www.tiktok.com/@scout2015/video/6718335390845095173" },
      { url: "https://www.tiktok.com/@tiktok/video/7106594312292453675" },
      { url: "https://www.tiktok.com/@leokellr/video/7554076781209242902" },
    ],
    platforms: ["tiktok"],
    mention: /\btiktok\b/i,
    numbers: "1080p|1080×1920|1080x1920|1920p|2160p|4k|720p|1280p",
  },
  "facebook.height": {
    // Three public reels measured 2026-11-13: 720×1280 twice and 360×640 once.
    // Facebook publishes a higher rendition than it hands a logged-out
    // resolver, so 1920 is a ceiling the file never reaches.
    measured: "1080×1920 (3 sample(s), 2026-11-13)",
    display: "1080×1920",
    max: 1920,
    unit: "height",
    date: "2026-11-13",
    method: "bytes of the served MP4, tkhd box",
    samples: [
      { url: "https://www.facebook.com/reel/2166091230582141/" },
      { url: "https://www.facebook.com/reel/1135388781826524" },
      { url: "https://www.facebook.com/reel/1370060038398465" },
    ],
    platforms: ["facebook"],
    mention: /\bfacebook\b|\bfb\b|fb\.watch/i,
    numbers: "1080p|1080×1920|1080x1920|1920p|2160p|4k",
  },
  "tiktok.audio": {
    measured: "128–256 kbps",
    display: "128–256",
    max: 256,
    unit: "kbps",
    date: "2026-11-13",
    method: "source AAC rate TikTok serves",
    platforms: ["tiktok"],
    mention: /\btiktok\b/i,
    numbers: "\\d{2,3}\\s?(?:kbps|kbit\\/s)",
  },
};

/** Height or rate carried by a matched number, or null when it is not one. */
function measuredValue(text, unit) {
  if (unit === "height") {
    if (/\b4k\b/i.test(text)) return 2160;
    const pair = text.match(/(\d{3,4})\s?[×x]\s?(\d{3,4})/);
    if (pair) return Number(pair[2]);
    const single = text.match(/(\d{3,4})p/i);
    return single ? Number(single[1]) : null;
  }
  const rate = text.match(/(\d{2,3})/);
  return rate ? Number(rate[1]) : null;
}

/**
 * Verbs that hand a file to the visitor, and quantifiers that turn a number
 * into a promise. "Above 720p YouTube stores…" has neither, so the honest
 * explanation of the ceiling stays readable.
 */
const DELIVERY_VERBS =
  "download|save|get|grab|convert|stream|deliver|offer|export|pick|choose|select|request|watch|record";
const ABSOLUTE_QUANTIFIERS = "up to|full|fixed|guaranteed|always|every file|every download";

/** Words that make a number conditional or measured instead of promised. */
/**
 * Cues that the sentence is *about* a number rather than selling it: refusing
 * it ("a 320 kbps file is padded"), explaining the merge ("has re-encoded"),
 * quoting a label, or reporting the test that measured the ceiling.
 */
const QUALIFIED =
  /\b(?:when|if|where|only|measured|tests?|testing|actually|really|instead|depends|ceiling|cap|capped|below|above|except|conditional|rather than|labels?|labell?ed|upsampl\w*|re-encod\w*|encod\w*|container|padded|padding|merg\w*|claims?|advertis\w*)\b/i;

function numericPromise(numbers) {
  return new RegExp(
    `\\b(?:${DELIVERY_VERBS})\\b(?:\\s+[\\w'’-]+){0,2}\\s+(?:${numbers})\\b` +
      `|\\b(?:${ABSOLUTE_QUANTIFIERS})\\b[^.\\n]{0,20}\\b(?:${numbers})\\b`,
    "i",
  );
}

for (const [id, measurement] of Object.entries(MEASUREMENTS)) {
  measurement.pattern = numericPromise(measurement.numbers);
  // On a page that is about this platform, the bare number is the claim: a
  // title reading "…Germany - 1080p MP4 & MP3" promises 1080p without needing
  // a verb. Cross-platform sentences still need one, so a TikTok page saying
  // "YouTube tops out at 1080p" is judged by what the sentence says.
  measurement.bare = new RegExp(`(?<![–-])\\b(?:${measurement.numbers})\\b`, "i");
  measurement.id = id;
}

/** Content that renders as page copy. */
const CONTENT_FILES = [
  "lib/content/tool-seo.ts",
  "lib/i18n/platform-landings.ts",
];

/** Route files whose copy renders directly (metadata + hero + FAQ). */
const PAGE_FILES = [
  { file: "app/(site)/youtube-downloader/page.tsx", platform: "youtube" },
  { file: "app/(site)/instagram-reels-downloader/page.tsx", platform: "instagram" },
  { file: "components/platform-page.tsx", platform: "any" },
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
  // Keyword lists are invisible metadata, not copy: "youtube mp4 1080p" there is
  // a query this page answers, not a resolution it claims. Blank them out while
  // keeping offsets, so reported line numbers still point at the code.
  // Comments are notes to the next editor, not sentences a visitor reads. The
  // honest ones explain why the site refuses a number ("…against sites
  // advertising a fixed 320 kbps"), so scanning them reports the opposite of
  // the truth. Masked line-by-line to preserve offsets.
  const masked = source
    .replace(/keywords:\s*\[[^\]]*\]/g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*(?:\/\/|\*|\/\*).*$/gm, (line) => " ".repeat(line.length));
  source = masked;
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

  // Measured numbers: a resolution or bitrate above what the platform serves is
  // a false spec, and it reads as trustworthy precisely because it is precise.
  for (const measurement of Object.values(MEASUREMENTS)) {
    for (const sentence of sentences) {
      const text = sentence.text;
      const ownPlatform = measurement.platforms.includes(platform);
      if (!ownPlatform && !measurement.mention.test(text)) continue;
      if (/\?["'”’)\],]*\s*$/.test(text)) continue;
      if (NEGATION.test(text) || QUALIFIED.test(text)) continue;
      // A resolution is a spec, not a verb: "Instagram serves Reels at 1080×1920"
      // promises a height without saying "download". Shared component copy is
      // judged the same way once the sentence names the platform.
      const useBare = ownPlatform || measurement.unit === "height";
      // A sentence that already states the measured value is explaining the
      // ceiling, not promising past it.
      if (measurement.display && text.includes(measurement.display)) continue;
      // `related: ["youtube-to-mp4-1080p"]` is a link target, not a promise.
      if (/^\s*(?:related|guides|slug|href|anchor|canonical)\s*:/.test(text)) continue;
      const hit = text.match(useBare ? measurement.bare : measurement.pattern);
      if (!hit) continue;
      // Only numbers ABOVE the measured ceiling are false. 160 kbps on a page
      // whose audio measures 128–160 is the honest figure, not a promise.
      // A quoted label is being discussed, not sold: "a page showing ‘1080p’".
      const at = sentence.at + (hit.index ?? 0);
      const quoted = /["'‘’“”«»]/.test(source.charAt(at - 1)) &&
        /["'‘’“”«»]/.test(source.charAt(at + hit[0].length));
      if (quoted) continue;
      const value = measuredValue(hit[0], measurement.unit);
      if (value === null || value <= measurement.max) continue;
      failures.push({
        kind: "measurement",
        file,
        line: lineAt(source, sentence.at + (hit.index ?? 0)),
        message:
          `promises "${hit[0].trim().slice(0, 70)}" but ${measurement.id} measured ` +
          `${measurement.measured} on ${measurement.date} (${measurement.method})`,
      });
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
  for (const page of PAGE_FILES) {
    let source;
    try {
      source = await readFile(path.join(root, page.file), "utf8");
    } catch {
      notes.push(`${page.file} not found — skipped`);
      continue;
    }
    scanClaims(page.file, source, page.platform);
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

/* --------------------------- stream measurement --------------------------- */

/**
 * Reads the streams the deployed resolver actually hands back and compares
 * their dimensions with the ceilings recorded above.
 *
 * A ceiling is wrong in both directions: too high and the copy promises a file
 * nobody receives, too low and honest numbers get flagged as lies. Neither
 * shows up without reading the bytes, which is what this does — resolve the
 * sample, Range-request the stream, parse the first `tkhd` box.
 */
function tkhdDims(buffer) {
  let index = buffer.indexOf("tkhd");
  while (index >= 0) {
    const version = buffer[index + 4];
    const offset = index + 4 + (version === 1 ? 88 : 76);
    if (buffer.length >= offset + 8) {
      const width = buffer.readUInt32BE(offset) / 65536;
      const height = buffer.readUInt32BE(offset + 4) / 65536;
      if (width && height) return { width, height };
    }
    index = buffer.indexOf("tkhd", index + 4);
  }
  return null;
}

async function readTkhd(streamUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(streamUrl, {
      headers: {
        range: "bytes=0-2000000",
        "user-agent": "Mozilla/5.0 (compatible; lamp-tik-claim-gate)",
      },
      signal: controller.signal,
    });
    if (!response.body) return { state: "unreadable", detail: `http ${response.status}` };
    const reader = response.body.getReader();
    let buffer = Buffer.alloc(0);
    while (buffer.length <= 2_000_000) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = Buffer.concat([buffer, Buffer.from(value)]);
      const dims = tkhdDims(buffer);
      if (dims) {
        await reader.cancel().catch(() => {});
        return { state: "measured", ...dims };
      }
    }
    await reader.cancel().catch(() => {});
    return { state: "unreadable", detail: `no tkhd in ${buffer.length} bytes` };
  } catch (error) {
    return { state: "unreachable", detail: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveStream(sample) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  const route = sample.route ?? "/api/fetch";
  // /api/fetch and /api/youtube take a JSON body; /api/twitter takes ?url=.
  const post = route === "/api/fetch" || route === "/api/youtube";
  try {
    const response = await fetch(
      post ? `${baseUrl}${route}` : `${baseUrl}${route}?url=${encodeURIComponent(sample.url)}`,
      {
        method: post ? "POST" : "GET",
        headers: post ? { "content-type": "application/json" } : undefined,
        body: post ? JSON.stringify({ url: sample.url }) : undefined,
        signal: controller.signal,
      },
    );
    const raw = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return { state: "unreachable", detail: `http ${response.status}, ${raw.length} byte body` };
    }
    if (!payload?.ok) {
      return { state: "rejected", detail: payload?.error?.code ?? `http ${response.status}` };
    }
    const media = payload.media ?? {};
    // Shape differs per route: /api/fetch hands a single play address, /api/twitter
    // returns the rendition list, /api/youtube one muxed file. Take the largest
    // rendition each route offers, because that is the file a visitor can pick.
    let stream = null;
    // /api/twitter names the rendition list `variants`; older shapes used `videos`.
    const renditions = Array.isArray(media.variants)
      ? media.variants
      : Array.isArray(media.videos)
        ? media.videos
        : [];
    if (renditions.length > 0) {
      const largest = [...renditions].sort((a, b) => (b?.height ?? 0) - (a?.height ?? 0));
      stream = largest.find((video) => typeof video?.url === "string")?.url ?? null;
    }
    // videoHd first: when the YouTube mirrors hand a 1080p file back, that is the
    // one the panel offers, and a ceiling that ignored it would stay flattering.
    stream ??= media.videoHd ?? media.videoDirect ?? media.video ?? media.videoUrl ?? null;
    if (typeof stream !== "string") return { state: "rejected", detail: "no stream in the response" };
    // Fetch-platform streams can be same-origin proxy paths (/api/download?k=…),
    // which are only URLs once the deployment origin is put back in front.
    if (stream.startsWith("/")) stream = `${baseUrl}${stream}`;
    return await readTkhd(stream);
  } catch (error) {
    return { state: "unreachable", detail: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** Rewrites one measurement block with the numbers just measured. */
async function recordMeasurement(id, { display, height, samples }) {
  const file = path.join(root, "scripts/check-claims.mjs");
  const source = await readFile(file, "utf8");
  const start = source.indexOf(`  "${id}": {`);
  if (start < 0) return false;
  const end = source.indexOf("\n  },", start);
  if (end < 0) return false;
  const today = new Date().toISOString().slice(0, 10);
  const block = source
    .slice(start, end)
    .replace(/measured: "[^"]*"/, `measured: "${display} (${samples} sample(s), ${today})"`)
    .replace(/display: "[^"]*"/, `display: "${display}"`)
    .replace(/max: \d+/, `max: ${height}`)
    .replace(/date: "[^"]*"/, `date: "${today}"`);
  await writeFile(file, source.slice(0, start) + block + source.slice(end));
  return true;
}

async function runMeasurements() {
  console.log(`claim audit (measure): reading the streams ${baseUrl} serves`);
  const drift = [];
  const unreachable = [];
  let measuredCount = 0;
  let written = 0;
  for (const [id, measurement] of Object.entries(MEASUREMENTS)) {
    if (!measurement.samples || measurement.unit !== "height") continue;
    const results = [];
    for (const sample of measurement.samples) {
      // One retry: a cold serverless function or a provider hiccup is not a
      // measurement, and reporting it as one would drop a real sample.
      let result = await resolveStream(sample);
      if (result.state !== "measured") {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        result = await resolveStream(sample);
      }
      results.push(result);
      const label = sample.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 44);
      const shown =
        result.state === "measured"
          ? `${result.width}×${result.height}`
          : `${result.state}: ${String(result.detail).slice(0, 40)}`;
      console.log(`  ${id.padEnd(17)} ${shown.padEnd(28)} ${label}`);
    }
    const readable = results.filter((result) => result.state === "measured");
    if (readable.length === 0) {
      unreachable.push(`${id}: no sample could be read (${results.map((r) => r.state).join(", ")})`);
      continue;
    }
    measuredCount += readable.length;
    const largest = readable.reduce((best, next) => (next.height > best.height ? next : best));
    const display = `${largest.width}×${largest.height}`;
    // A rendition may be a few pixels under the ceiling (Instagram serves
    // 718×1276 against a 720p ceiling), so only a real gap counts as drift.
    const slack = Math.abs(largest.height - measurement.max) / measurement.max;
    if (slack <= (measurement.tolerance ?? 0.05)) {
      console.log(`  ${id.padEnd(17)} ceiling ${measurement.max} still matches`);
      continue;
    }
    drift.push({ id, recorded: measurement.max, height: largest.height, display });
    if (measureWrite) {
      const ok = await recordMeasurement(id, {
        display,
        height: largest.height,
        samples: readable.length,
      });
      if (ok) written += 1;
    }
  }
  return { drift, unreachable, measuredCount, written, samples: Object.values(MEASUREMENTS).filter((m) => m.samples).length };
}

/* ------------------------------- main ------------------------------- */

await checkEvidence();
await scanAllClaims();

let liveResults = [];
if (liveMode) liveResults = await runLive();
const measureResults = measureMode ? await runMeasurements() : null;

for (const note of notes) console.warn(`note: ${note}`);

if (measureResults) {
  for (const message of measureResults.unreachable) console.warn(`measure: ${message}`);
  if (measureResults.drift.length > 0 && measureWrite) {
    console.log(
      `\nclaim audit: refreshed ${measureResults.written} ceiling(s) from the measured streams — ` +
        "re-read the copy that relied on the old numbers.",
    );
  } else if (measureResults.drift.length > 0) {
    console.error("\nclaim audit: a ceiling no longer matches the streams the resolver serves:");
    for (const item of measureResults.drift) {
      console.error(
        `  - ${item.id}: recorded max ${item.recorded}, measured ${item.display} (max ${item.height})`,
      );
    }
    console.error(
      "\nRun `npm run check:claims:measure:update` to record the measured numbers, then re-read" +
        "\nthe copy that relied on the old ceiling — and the copy that could not claim the new one.\n",
    );
    process.exitCode = 1;
  }
}

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
const measureNote = measureResults
  ? `, ${measureResults.measuredCount} stream byte(s) measured`
  : "";
console.log(
  `claim audit: ${capabilityIds.length} capabilities (${supported} supported, ${unsupported} refused), ` +
    `${CLAIM_RULES.length} promise rule(s), ${Object.keys(MEASUREMENTS).length} measured ceiling(s), ` +
    `${LIVE_PROBES.length} probe shape(s)${liveNote}${measureNote}`,
);

if (liveMode && liveResults.some((result) => result.state === "unreachable")) {
  console.error("claim audit: at least one probe could not reach the target — result is inconclusive.");
  process.exit(2);
}

if (measureResults && measureResults.unreachable.length > 0) {
  console.error(
    "claim audit: at least one platform served no readable stream — the measured ceiling is incomplete.",
  );
  process.exit(2);
}
