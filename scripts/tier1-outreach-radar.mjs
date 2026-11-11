#!/usr/bin/env node
/**
 * Tier-1 community radar without a single API key.
 *
 * Run:  npm run seo:outreach
 *       npm run seo:outreach -- --limit 15 --days 14
 *
 * The previous version asked reddit.com/search.json directly, which answers 403
 * to unauthenticated clients from this network (and to most datacenter IPs), so
 * it produced an empty report. This version reaches the same conversations
 * through four public endpoints and says exactly which one answered:
 *
 *   1. PullPush, then Arctic Shift — two free mirrors of the Reddit archive
 *      (`api.pullpush.io`, `arctic-shift.photon-reddit.com`), no auth, no key.
 *      PullPush has answered 526 since 2026-11-11, so the second is tried
 *      rather than reporting an empty Reddit column.
 *   2. Bing RSS  — `bing.com/search?format=rss`, which returns machine-readable
 *      results for a `site:reddit.com` query instead of an HTML wall.
 *   3. Stack Exchange — the public `/2.3/search/advanced` API (video, superuser,
 *      stackoverflow), where the CapCut/Premiere/export questions actually live.
 *   4. dev.to — the public articles API, for creator-workflow posts worth a
 *      thoughtful comment.
 *
 * Every row carries the source that produced it, and a source that fails is
 * printed as failed. The report never pads itself with invented URLs.
 *
 * Exit codes: 0 = at least one real URL retrieved, 1 = every source refused.
 */

import fs from "node:fs";
import path from "node:path";

const ARGS = process.argv.slice(2);
const value = (name, fallback) => {
  const index = ARGS.indexOf(`--${name}`);
  return index >= 0 && ARGS[index + 1] ? ARGS[index + 1] : fallback;
};

const LIMIT = Number(value("limit", "15"));
const DAYS = Number(value("days", "7"));
const OUT = path.join(process.cwd(), "docs/live-tier1-threads-today.md");
const ORIGIN = "https://www.lamptik.online";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * One row per problem we can actually answer. `reddit` is the PullPush/Bing
 * query, `se` the Stack Exchange query, `tag` the dev.to tag, `link` the page
 * that solves it, and `reply` the draft — written to answer first, link second.
 */
const TOPICS = [
  {
    key: "watermark",
    reddit: "tiktok watermark",
    se: "tiktok watermark",
    tag: "tiktok",
    link: { path: "/", label: "no-watermark TikTok download" },
    reply:
      "TikTok stores two files per video: the clean `play` master its player streams, and a `wmplay` copy with the logo stamped in, which the share sheet hands out. That is why \"no watermark\" is possible at all — you have to request the first file. Cropping or blurring only eats into your frame.\n\n" +
      `The downloader asks for \`play\` rather than \`wmplay\`: ${ORIGIN}/ — free, no app, no account.`,
  },
  {
    key: "quality",
    reddit: "video quality loss after upload",
    se: "video quality after upload compression",
    tag: "video",
    link: { path: "/guides/why-tiktok-video-quality-drops-after-upload", label: "why quality drops after upload" },
    reply:
      "Almost always a second encode rather than the platform. Export once at delivery settings — 1080×1920, H.264 High, CRF 18–20, AAC 192 kbps — so the platform transcode is the only extra generation. Every re-download-and-re-edit pass adds another.\n\n" +
      `Bitrate numbers by resolution: ${ORIGIN}/guides/why-tiktok-video-quality-drops-after-upload`,
  },
  {
    key: "codec",
    reddit: "capcut mp4 import error",
    se: "mp4 import error premiere capcut",
    tag: "ffmpeg",
    link: { path: "/guides/mp4-wont-import-capcut-premiere-pro", label: "MP4 won't import — the four causes" },
    reply:
      "Three causes cover most `media offline` / `unsupported format` errors: HEVC (H.265) in a container the NLE will not decode, a VP9/AV1 stream pulled out of a DASH manifest, or no audio track at all. Remux before importing:\n\n`ffmpeg -i in.mp4 -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 192k out.mp4`\n\n" +
      `Longer walkthrough with the codec table: ${ORIGIN}/guides/mp4-wont-import-capcut-premiere-pro`,
  },
  {
    key: "iphone",
    reddit: "iphone camera roll download",
    se: "safari download video to photos iphone",
    tag: "ios",
    link: { path: "/guides/iphone-safari-downloads-to-files-and-photos", label: "iPhone: Files → Photos" },
    reply:
      "Safari cannot write into the camera roll from a website — that is an iOS limit, not the tool. The file lands in Files → On My iPhone → Downloads. Open it there, long-press the MP4, Share → Save Video, and it appears in Photos like a recorded clip.\n\n" +
      `Step-by-step with screenshots of each screen: ${ORIGIN}/guides/iphone-safari-downloads-to-files-and-photos`,
  },
  {
    key: "1080p",
    reddit: "1080p 60fps export settings",
    se: "1080p 60fps export settings",
    tag: "youtube",
    link: { path: "/guides/1080p-60fps-download-edit-upload-workflow", label: "1080p60 workflow" },
    reply:
      "60 fps survives only if it is 60 fps the whole way: record at 60, export at 60 with a matching shutter (1/120), and keep the bitrate high enough — roughly 12–16 Mbps for 1080p60 H.264. A 30 fps export re-timed to 60 looks smeared, and that is what people usually blame the platform for.\n\n" +
      `The full record → download → edit → upload chain: ${ORIGIN}/guides/1080p-60fps-download-edit-upload-workflow`,
  },
  {
    key: "safe-zone",
    reddit: "tiktok safe zone",
    se: "tiktok safe zone overlay",
    tag: "design",
    link: { path: "/tiktok-safe-zone-checker", label: "safe-zone checker" },
    reply:
      "The safe area is not one number: TikTok's buttons sit on the right and the caption block covers the bottom-left, and they differ between TikTok and Reels. Keep critical text inside roughly the middle 1080×1420 of a 1080×1920 frame and it survives both.\n\n" +
      `Drag a frame onto the checker and it draws the real overlays: ${ORIGIN}/tiktok-safe-zone-checker`,
  },
  {
    key: "rpm",
    reddit: "tiktok rpm calculator",
    se: "tiktok rpm payout per 1000 views",
    tag: "monetization",
    link: { path: "/tiktok-money-calculator", label: "RPM calculator" },
    reply:
      "“Pays X per view” is a range quoted as a rate. The arithmetic is (views ÷ 1000) × RPM, then subtract the 24% US withholding if you are not a US taxpayer. For You traffic and search traffic pay differently, so any single average is rough.\n\n" +
      `Put your own numbers in and see the split: ${ORIGIN}/tiktok-money-calculator`,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...parts) => console.log("[outreach]", ...parts);

async function statusOf(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12_000),
    });
    return `HTTP ${response.status}`;
  } catch (error) {
    return `unreachable (${error.name === "TimeoutError" ? "timeout" : error.message})`;
  }
}

async function getText(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  return { status: response.status, ok: response.ok, body: await response.text() };
}

/* ------------------------------- 1. PullPush ------------------------------ */

async function pullPush(topic) {
  const url =
    "https://api.pullpush.io/reddit/search/submission/?q=" +
    `${encodeURIComponent(topic.reddit)}&size=15&sort=desc&sort_type=created_utc`;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { status, ok, body } = await getText(url, { headers: { accept: "application/json" } });
      if (!ok) {
        if (attempt === 2) return { rows: [], error: `PullPush HTTP ${status}` };
        await sleep(2_000);
        continue;
      }
      const parsed = JSON.parse(body);
      const rows = (parsed.data ?? []).map((item) => ({
        title: item.title,
        url: `https://www.reddit.com${item.permalink ?? `/r/${item.subreddit}/comments/${item.id}/`}`,
        platform: `reddit · r/${item.subreddit}`,
        created: (item.created_utc ?? 0) * 1000,
        comments: item.num_comments ?? null,
        source: "PullPush (Reddit archive)",
        topic: topic.key,
      }));
      return { rows, error: null };
    } catch (error) {
      if (attempt === 2) return { rows: [], error: `PullPush ${error.message}` };
      await sleep(2_000);
    }
  }
  return { rows: [], error: "PullPush exhausted" };
}

/* ---------------------------- 1b. Arctic Shift ----------------------------- */

/**
 * Subreddits where the questions we can answer actually get asked. The API
 * requires a `subreddit` (a bare `query` is rejected with 400), so the term
 * filter runs here instead of on the server.
 */
const SUBREDDITS = ["TikTokHelp", "Tiktokhelp", "VideoEditing", "CapCut", "premiere", "NewTubers", "Instagram", "socialmedia"];

async function arcticShift(topic) {
  const rows = [];
  let error = null;
  const term = topic.reddit.split(/\s+/)[0].toLowerCase();
  for (const subreddit of SUBREDDITS.slice(0, 5)) {
    const url = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=25&sort=desc`;
    try {
      const { status, ok, body } = await getText(url, { headers: { accept: "application/json" } });
      if (!ok) {
        error = `Arctic Shift HTTP ${status} (r/${subreddit})`;
        continue;
      }
      const parsed = JSON.parse(body);
      for (const item of parsed.data ?? []) {
        if (!String(item.title ?? "").toLowerCase().includes(term)) continue;
        rows.push({
          title: item.title,
          url: `https://www.reddit.com${item.permalink ?? `/comments/${item.id}/`}`,
          platform: `reddit · r/${item.subreddit ?? subreddit}`,
          created: (item.created_utc ?? 0) * 1000,
          comments: item.num_comments ?? null,
          source: "Arctic Shift (Reddit archive)",
          topic: topic.key,
        });
      }
    } catch (caught) {
      error = `Arctic Shift ${caught.message}`;
    }
    await sleep(200);
  }
  return { rows, error: rows.length === 0 ? error ?? "Arctic Shift matched no thread" : null };
}

/* -------------------------------- 2. Bing RSS ----------------------------- */

function parseRss(xml) {
  const items = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const pick = (tag) => {
      const found = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return found ? found[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").trim() : "";
    };
    const link = pick("link");
    const title = pick("title");
    if (!link || !title) continue;
    items.push({ title, url: link, created: Date.parse(pick("pubDate")) || 0 });
  }
  return items;
}

async function bingRss(topic) {
  const query = `site:reddit.com ("${topic.reddit}" OR "${topic.se}")`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
  try {
    const { status, ok, body } = await getText(url);
    if (!ok) return { rows: [], error: `Bing RSS HTTP ${status}` };
    const rows = parseRss(body)
      .filter((item) => /reddit\.com\/r\/[^/]+\/comments\//.test(item.url))
      .map((item) => ({
        title: item.title,
        url: item.url.split("?")[0],
        platform: "reddit (via Bing RSS)",
        created: item.created,
        comments: null,
        source: "Bing Search RSS",
        topic: topic.key,
      }));
    return { rows, error: rows.length === 0 ? "Bing RSS returned no Reddit threads" : null };
  } catch (error) {
    return { rows: [], error: `Bing RSS ${error.message}` };
  }
}

/* ----------------------------- 3. Stack Exchange -------------------------- */

async function stackExchange(topic) {
  const rows = [];
  let error = null;
  for (const site of ["video", "superuser", "stackoverflow"]) {
    const url =
      "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity" +
      `&q=${encodeURIComponent(topic.se)}&site=${site}&pagesize=5`;
    try {
      const { ok, status, body } = await getText(url, { headers: { accept: "application/json" } });
      if (!ok) {
        error = `StackExchange ${site} HTTP ${status}`;
        continue;
      }
      const parsed = JSON.parse(body);
      for (const item of parsed.items ?? []) {
        rows.push({
          title: item.title,
          url: item.link,
          platform: `stackexchange · ${site}`,
          created: (item.creation_date ?? 0) * 1000,
          comments: item.answer_count ?? null,
          source: "Stack Exchange API",
          topic: topic.key,
        });
      }
    } catch (caught) {
      error = `StackExchange ${site} ${caught.message}`;
    }
    await sleep(250);
  }
  return { rows, error: rows.length === 0 ? error ?? "Stack Exchange returned nothing" : null };
}

/* ---------------------------------- 4. dev.to ----------------------------- */

async function devTo(topic) {
  try {
    const { ok, status, body } = await getText(
      `https://dev.to/api/articles?tag=${encodeURIComponent(topic.tag)}&per_page=20`,
      { headers: { accept: "application/json" } },
    );
    if (!ok) return { rows: [], error: `dev.to HTTP ${status}` };
    const articles = JSON.parse(body);
    /**
     * Platform names are useless as matchers: every `tag=tiktok` article
     * contains "tiktok", so the first version pulled in Japanese AB-testing
     * posts and avatar-model launches. Only the distinctive words of the
     * problem survive this filter, which is what makes a row worth replying to.
     */
    const platform = new Set([
      "tiktok", "instagram", "youtube", "twitter", "facebook", "reddit",
      "video", "videos", "reels", "reel", "clip", "clips", "after",
    ]);
    const terms = `${topic.reddit} ${topic.se}`
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !platform.has(word));
    const rows = (Array.isArray(articles) ? articles : [])
      .filter((article) => {
        // Title only. Matching the description too is how "taking a SwiftUI app
        // to 12 languages" passed as a TikTok thread: platform words were
        // filtered out but the body still contained them.
        const title = String(article.title ?? "").toLowerCase();
        return terms.some((term) => term.length >= 5 && title.includes(term));
      })
      .map((article) => ({
        title: article.title,
        url: article.url,
        platform: "dev.to",
        created: Date.parse(article.published_at ?? "") || 0,
        comments: article.comments_count ?? null,
        source: "dev.to API",
        topic: topic.key,
      }));
    return { rows, error: rows.length === 0 ? "dev.to matched no on-topic article" : null };
  } catch (error) {
    return { rows: [], error: `dev.to ${error.message}` };
  }
}

/* ---------------------------------- output -------------------------------- */

function ageLabel(created) {
  if (!created) return "date unknown";
  const hours = (Date.now() - created) / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function writeReport({ threads, sources, failures }) {
  const bySource = sources
    .map((entry) => `- ${entry.name}: **${entry.rows}** row(s)${entry.error ? ` — ${entry.error}` : ""}`)
    .join("\n");

  const lines = [
    "# Live Tier-1 threads — today",
    "",
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by \`npm run seo:outreach\` ` +
      `(window: last ${DAYS} days, cap ${LIMIT}).`,
    "",
    "Post these by hand and in your own words. Answer the question first; the link is the last line, and only " +
      "where it genuinely answers. Identical comments across communities are what triggers Reddit's spam filter.",
    "",
    "## Sources this run",
    "",
    bySource,
    "",
  ];

  if (threads.length === 0) {
    lines.push(
      "## No thread URLs",
      "",
      "Every source refused or returned nothing, so this file lists none. A radar that invents a link is worse " +
        "than an empty one.",
      "",
    );
  } else {
    lines.push("## Threads", "");
    threads.slice(0, LIMIT).forEach((thread, index) => {
      const topic = TOPICS.find((entry) => entry.key === thread.topic);
      lines.push(
        `### ${index + 1}. [${thread.title}](${thread.url})`,
        "",
        `- ${thread.platform} · ${ageLabel(thread.created)} · ${thread.comments ?? "?"} comments`,
        `- Found via: ${thread.source}`,
        `- Liveness: **${thread.status ?? "not checked"}**${
          thread.status === "HTTP 403"
            ? " — the site blocks this network; the thread is not necessarily dead, verify in a browser"
            : ""
        }`,
        `- Our page: ${ORIGIN}${topic.link.path}`,
        "",
        "<details><summary>Reply draft</summary>",
        "",
        topic.reply,
        "",
        "</details>",
        "",
      );
    });
  }

  if (failures.length > 0) {
    lines.push("## Source errors", "", ...failures.map((line) => `- ${line}`), "");
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join("\n"));
  log(`wrote ${path.relative(process.cwd(), OUT)} (${threads.length} threads)`);
}

/* ----------------------------------- main --------------------------------- */

async function main() {
  const sources = [
    { name: "PullPush (Reddit archive)", rows: 0, error: null },
    { name: "Arctic Shift (Reddit archive)", rows: 0, error: null },
    { name: "Bing Search RSS", rows: 0, error: null },
    { name: "Stack Exchange API", rows: 0, error: null },
    { name: "dev.to API", rows: 0, error: null },
  ];
  const bump = (name, count, error) => {
    const entry = sources.find((source) => source.name === name);
    if (!entry) return;
    entry.rows += count;
    if (count === 0 && error) entry.error = entry.error ? `${entry.error}; ${error}` : error;
  };

  const collected = [];
  const failures = [];
  const seen = new Set();
  const cutoff = Date.now() - DAYS * 86_400_000;

  for (const topic of TOPICS) {
    for (const [name, fetcher] of [
      ["PullPush (Reddit archive)", pullPush],
      ["Arctic Shift (Reddit archive)", arcticShift],
      ["Bing Search RSS", bingRss],
      ["Stack Exchange API", stackExchange],
      ["dev.to API", devTo],
    ]) {
      const { rows, error } = await fetcher(topic);
      bump(name, rows.length, error);
      if (error) failures.push(`${name} · ${topic.key}: ${error}`);
      for (const row of rows) {
        const key = row.url.replace(/\/$/, "");
        if (seen.has(key)) continue;
        // Undated rows (RSS without pubDate, archive gaps) are kept only when the
        // source itself is date-ordered; otherwise they would dominate the list.
        //
        // Stack Exchange is the exception: its API is sorted by recent
        // *activity*, not creation, and the video/superuser sites are quiet — a
        // 2022 "remove the TikTok logo with ffmpeg" question that still collects
        // answers is a live thread and a far better fit than anything dev.to
        // published this week. Measuring SE rows against the 7-day Reddit window
        // discarded every one of them, so age never filters this source; the
        // activity sort already does that job.
        if (row.source !== "Stack Exchange API" && row.created && row.created < cutoff) continue;
        seen.add(key);
        collected.push(row);
      }
      await sleep(300);
    }
    log(`  ${topic.key}: ${collected.length} unique so far`);
  }

  collected.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

  // Liveness, measured rather than assumed: a radar that prints a URL nobody
  // checked is the thing this script exists to avoid. Reddit answers 403 to
  // this network from its own CDN, so a 403 is recorded as a block, not as a
  // dead thread.
  for (const row of collected) row.status = await statusOf(row.url);

  writeReport({ threads: collected, sources, failures });

  for (const source of sources) {
    log(`${source.rows.toString().padStart(3)} rows  ${source.name}${source.error ? ` — ${source.error}` : ""}`);
  }
  if (collected.length === 0) {
    log("no live thread retrieved — every source refused or returned nothing");
    process.exitCode = 1;
    return;
  }
  for (const row of collected.slice(0, LIMIT)) {
    log(`  ${ageLabel(row.created).padEnd(10)} ${row.platform} — ${row.title.slice(0, 70)}`);
  }
}

main().catch((error) => {
  console.error(`seo-outreach failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
