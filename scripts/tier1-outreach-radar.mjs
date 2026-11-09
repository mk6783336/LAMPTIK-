#!/usr/bin/env node
/**
 * Tier-1 Reddit / community thread radar.
 *
 * Run:  npm run seo:outreach
 *       npm run seo:outreach -- --hours 48
 *
 * Finds threads from the past week where somebody is asking the exact question
 * one of our tools answers, and writes a tailored, non-spam reply draft next to
 * each link, so the human step is "read, adjust, post", not "search Reddit for
 * an hour".
 *
 * Honest about the wall it will hit: reddit.com/search.json answers 403 to
 * unauthenticated requests from most networks, and it has done so from this
 * machine. The script therefore tries, in order:
 *
 *   1. www.reddit.com/r/<sub>/search.json       (public JSON, no auth)
 *   2. old.reddit.com/r/<sub>/search.json       (same API, different edge)
 *   3. DuckDuckGo `site:reddit.com/r/<sub> <kw>` (Bing's index of Reddit)
 *
 * The output file records which source produced each row, and — when all three
 * are blocked — says so instead of inventing threads. A marketing radar that
 * fabricates URLs is worse than no radar.
 *
 * The reply snippets answer the question first. The link is one line, named
 * for what it does, and only included where it is genuinely the answer; the
 * drafts are written to be posted by a human who read the thread, which is also
 * what keeps them out of Reddit's spam filter.
 */

import fs from "node:fs";
import path from "node:path";

const ARGS = process.argv.slice(2);
const value = (name, fallback) => {
  const index = ARGS.indexOf(`--${name}`);
  return index >= 0 && ARGS[index + 1] ? ARGS[index + 1] : fallback;
};

const HOURS = Number(value("hours", "168"));
const LIMIT = Number(value("limit", "15"));
const OUT = path.join(process.cwd(), "docs/live-tier1-threads-today.md");
const ORIGIN = "https://www.lamptik.online";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * One row per problem we can genuinely answer. The keyword is what Reddit is
 * searched for; `reply` is the draft, and `link` is the page that actually
 * solves it (never the home page, which answers nothing).
 */
const TOPICS = [
  {
    keyword: "watermark",
    subs: ["Tiktokhelp", "videoediting", "NewTubers"],
    link: { path: "/", label: "LAMP TIK (no-watermark TikTok download)" },
    reply:
      "TikTok keeps two files per video: the clean `play` master the app streams, and a `wmplay` copy with the watermark stamped in, which the share sheet hands out. That is why \"download without watermark\" is possible at all — you just have to request the first one. Cropping or blurring the logo only cuts into your subject.\n\n" +
      "If your edit needs the clean file, LAMP TIK's page takes the video URL and requests `play` rather than `wmplay`: " +
      `${ORIGIN}/ — free, no app, no account.`,
  },
  {
    keyword: "quality loss",
    subs: ["videoediting", "premiere", "NewTubers"],
    link: { path: "/guides/why-tiktok-video-quality-drops-after-upload", label: "Why quality drops after upload" },
    reply:
      "Quality loss is almost always a second encode, not the platform. Export once at the delivery settings (1080×1920, H.264 high, CRF 18-20, audio AAC 192 kbps) so the platform's transcode is the first and only extra generation. Re-downloading a platform copy and re-editing it adds a generation each pass — that is where the soft, smeared look comes from.\n\n" +
      `The bitrate/trade-off numbers are written up here: ${ORIGIN}/guides/why-tiktok-video-quality-drops-after-upload`,
  },
  {
    keyword: "1080p 60fps",
    subs: ["NewTubers", "videoediting", "premiere"],
    link: { path: "/youtube-to-mp4-1080p", label: "What 1080p really means" },
    reply:
      "YouTube publishes several renditions per upload and only some carry audio. 1080p is often served as a VP9/AV1 video-only stream with the audio in a separate file — grab that one and you get a silent MP4, which is why \"the 1080p option doesn't work\" is such a common complaint.\n\n" +
      `Muxed H.264+ AAC is the file you want for editing; the format table here explains which uploads expose it: ${ORIGIN}/youtube-to-mp4-1080p`,
  },
  {
    keyword: "safe zone",
    subs: ["Tiktokhelp", "InstagramMarketing", "videoediting"],
    link: { path: "/tiktok-safe-zone-checker", label: "Safe-zone checker" },
    reply:
      "The safe area is not one number — TikTok's own UI sits on the right (like/comment/share) and the caption block covers the bottom-left, so text inside roughly the outer 10-15% gets covered on some devices and not others. Keep critical text inside the middle ~1080×1420 of a 1080×1920 frame and you are covered on both TikTok and Reels.\n\n" +
      `You can drag a frame onto the checker and see the overlays it would be hidden by: ${ORIGIN}/tiktok-safe-zone-checker`,
  },
  {
    keyword: "mp4 import error",
    subs: ["premiere", "videoediting", "CapCut"],
    link: { path: "/video-thumbnail-downloader", label: "Thumbnail extractor" },
    reply:
      "Most \"media offline\" / \"unsupported format\" errors on a downloaded clip are one of three things: HEVC (H.265) in a container the NLE won't decode, a VP9/AV1 stream pulled from a DASH manifest, or a file with no audio track at all. Remux to H.264/AAC before importing — `ffmpeg -i in.mp4 -c:v libx264 -crf 18 -c:a aac -b:a 192k out.mp4` takes seconds and fixes all three.\n\n" +
      `If you only need a still frame for a thumbnail, this pulls one without re-encoding the video: ${ORIGIN}/video-thumbnail-downloader`,
  },
  {
    keyword: "rpm calculator",
    subs: ["Tiktokhelp", "NewTubers"],
    link: { path: "/tiktok-money-calculator", label: "TikTok money calculator" },
    reply:
      "RPM maths trips people up because the headline \"Creator Fund pays per view\" number is a range, not a rate. Work it as: (views ÷ 1000) × RPM, where RPM already nets out the platform's share — then subtract the 24% US withholding if you are not a US taxpayer. Views from the For You feed and from search are paid differently, so a single average is a rough guide at best.\n\n" +
      `You can put your own numbers in here and see the split instead of a single guess: ${ORIGIN}/tiktok-money-calculator`,
  },
  {
    keyword: "slideshow download",
    subs: ["Tiktokhelp"],
    link: { path: "/", label: "Slideshow / photo post handling" },
    reply:
      "Photo-mode posts and slideshows are not videos — there is no MP4 to fetch, which is why most downloaders hand you a 0-byte file or an error. TikTok serves each slide as an image plus a separate audio track; you either save the images or the audio, and a tool that claims to give you \"the video\" is guessing.\n\n" +
      `The downloader says this plainly instead of writing a broken file: ${ORIGIN}/`,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...parts) => console.log("[outreach]", ...parts);

async function redditSearch(sub, keyword) {
  const query = encodeURIComponent(keyword);
  for (const host of ["www.reddit.com", "old.reddit.com"]) {
    for (const sort of ["new", "relevance"]) {
      const url =
        `https://${host}/r/${sub}/search.json?q=${query}&restrict_sr=1&sort=${sort}` +
        `&t=week&limit=25&raw_json=1`;
      try {
        const response = await fetch(url, {
          headers: { "user-agent": UA, accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          log(`${host} r/${sub} "${keyword}" → HTTP ${response.status}`);
          continue;
        }
        const body = await response.json();
        const children = body?.data?.children ?? [];
        if (children.length === 0) continue;
        return children.map((child) => ({
          title: child.data.title,
          url: `https://www.reddit.com${child.data.permalink}`,
          sub,
          created: child.data.created_utc * 1000,
          comments: child.data.num_comments,
          score: child.data.score,
          source: `${host} (${sort})`,
        }));
      } catch (error) {
        log(`${host} r/${sub} "${keyword}" → ${error.message}`);
      }
      await sleep(400);
    }
  }
  return [];
}

async function duckduckgoReddit(sub, keyword) {
  const query = `site:reddit.com/r/${sub} ${keyword}`;
  try {
    const response = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", accept: "text/html" },
      body: new URLSearchParams({ q: query }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const rows = [];
    const block = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    for (const match of html.matchAll(block)) {
      const raw = match[1].startsWith("//") ? `https:${match[1]}` : match[1];
      let target = raw;
      try {
        const url = new URL(raw, "https://duckduckgo.com");
        target = url.searchParams.get("uddg") ? decodeURIComponent(url.searchParams.get("uddg")) : url.href;
      } catch {
        /* keep raw */
      }
      if (!/reddit\.com\/r\//.test(target)) continue;
      if (!/\/comments\//.test(target)) continue;
      rows.push({
        title: match[2].replace(/<[^>]+>/g, "").trim(),
        url: target.split("?")[0],
        sub,
        created: null,
        comments: null,
        score: null,
        source: "duckduckgo (Bing index)",
      });
      if (rows.length >= 10) break;
    }
    return rows;
  } catch (error) {
    log(`ddg r/${sub} "${keyword}" → ${error.message}`);
    return [];
  }
}

function ageLabel(created) {
  if (!created) return "unknown";
  const hours = (Date.now() - created) / 3_600_000;
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function writeReport({ threads, blocked, perTopic }) {
  const lines = [
    "# Live Tier-1 threads — today",
    "",
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by ` +
      `\`npm run seo:outreach\` (window: last ${Math.round(HOURS / 24)} days, ${LIMIT} threads).`,
    "",
    "Post these by hand, in your own words, and answer the question before you link anything. " +
      "The drafts below exist to save typing, not to be pasted verbatim into six threads — Reddit's spam " +
      "filter reads identical comments across communities faster than you can post them.",
    "",
  ];

  if (threads.length === 0) {
    lines.push(
      "## Nothing measured — every source was blocked",
      "",
      "No thread URLs are listed because none were actually retrieved. Blocked endpoints:",
      "",
      ...blocked.map((entry) => `- ${entry}`),
      "",
      "The Reddit JSON API answers 403 to unauthenticated clients from most networks. To unblock this radar " +
        "properly, either run it from a residential IP, or create a free Reddit script app and set " +
        "`REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` (read-only scope is enough). Until then the DuckDuckGo " +
        "fallback is the only path, and it returned nothing usable today.",
      "",
    );
  } else {
    lines.push("## Threads", "");
    threads.slice(0, LIMIT).forEach((thread, index) => {
      const topic = perTopic.get(thread.topicKey);
      lines.push(
        `### ${index + 1}. [${thread.title}](${thread.url})`,
        "",
        `- Subreddit: \`r/${thread.sub}\` · ${ageLabel(thread.created)} · ` +
          `${thread.comments ?? "?"} comments · ${thread.score ?? "?"} points`,
        `- Found via: ${thread.source} (query: \`${thread.keyword}\`)`,
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

  const blockedNote = blocked.length > 0 ? blocked.slice(0, 8) : [];
  if (blockedNote.length > 0) {
    lines.push("## Endpoints that refused this run", "", ...blockedNote.map((entry) => `- ${entry}`), "");
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join("\n"));
  log(`wrote ${path.relative(process.cwd(), OUT)} (${threads.length} threads)`);
}

async function main() {
  log(`scanning ${TOPICS.length} topics across ${new Set(TOPICS.flatMap((t) => t.subs)).size} subreddits`);
  const blocked = [];
  const perTopic = new Map();
  const seen = new Set();
  const collected = [];

  for (const topic of TOPICS) {
    perTopic.set(topic.keyword, topic);
    for (const sub of topic.subs) {
      const fromApi = await redditSearch(sub, topic.keyword);
      let rows = fromApi;
      if (rows.length === 0) {
        rows = await duckduckgoReddit(sub, topic.keyword);
        if (rows.length === 0) blocked.push(`r/${sub} + "${topic.keyword}" — Reddit JSON 403, DuckDuckGo returned no thread`);
      }
      for (const row of rows) {
        const cutoff = Date.now() - HOURS * 3_600_000;
        if (row.created && row.created < cutoff) continue;
        const key = row.url.replace(/\/$/, "");
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push({ ...row, topicKey: topic.keyword, keyword: topic.keyword });
      }
      await sleep(500);
    }
  }

  collected.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  writeReport({ threads: collected, blocked, perTopic });

  if (collected.length === 0) {
    log("no live threads retrieved — see the report for which endpoints refused");
    process.exitCode = blocked.length > 0 ? 1 : 0;
    return;
  }
  log(`${collected.length} threads, newest first:`);
  for (const row of collected.slice(0, LIMIT)) log(`  ${ageLabel(row.created).padEnd(8)} r/${row.sub} — ${row.title}`);
}

main().catch((error) => {
  console.error(`seo-outreach failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
