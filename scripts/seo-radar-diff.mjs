#!/usr/bin/env node
/**
 * Verdict deltas between two radar runs — nothing else.
 *
 * Run:  npm run seo:radar:diff
 *       npm run seo:radar:diff -- --seed
 *
 * `npm run seo:radar` appends one compact line per run to
 * `docs/seo-radar-history.jsonl` (tracked in git, unlike `.scratch/seo-radar.json`)
 * so "re-run it in a week and tell me what moved" is a diff rather than a
 * memory exercise.
 *
 * Only deltas print: phrases that appeared, disappeared, or changed verdict
 * between the two most recent snapshots. A run where nothing moved prints
 * nothing but the header — which is itself the finding.
 *
 * Winnability order: TRUE ZERO-KD (most open) > LOW-KD GAP > CONTESTED >
 * LOCKED HEAD TERM. A move up that order is EASIER (someone can win it now),
 * down is HARDER (an incumbent started answering it). UNVERIFIED is a discard
 * rather than a rank, so it is reported as gained/lost, never as movement:
 * calling an off-topic SERP "harder" would invent a measurement.
 *
 * `--seed [file]` imports a radar JSON as the oldest snapshot, so a baseline
 * recorded before this script existed is not lost. The file's mtime becomes its
 * `ranAt`, which is how a copied snapshot keeps its original position.
 *
 * Exit codes: 0 = compared or baseline written, 1 = no history to compare.
 */

import fs from "node:fs";
import path from "node:path";

const HISTORY = path.join(process.cwd(), "docs/seo-radar-history.jsonl");
const LIVE_JSON = path.join(process.cwd(), ".scratch/seo-radar.json");
const RANK = { "TRUE ZERO-KD": 4, "LOW-KD GAP": 3, CONTESTED: 2, "LOCKED HEAD TERM": 1 };

const say = (...parts) => console.log(...parts);

function readHistory() {
  if (!fs.existsSync(HISTORY)) return [];
  return fs
    .readFileSync(HISTORY, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
    .sort((a, b) => Date.parse(a.ranAt) - Date.parse(b.ranAt));
}

function writeHistory(snapshots) {
  const body = snapshots.map((snapshot) => JSON.stringify(snapshot)).join("\n");
  fs.writeFileSync(HISTORY, `${body}\n`);
}

function snapshotFrom(measured, ranAt) {
  return {
    ranAt,
    measured: measured.map((row) => ({
      query: row.query,
      verdict: row.verdict,
      difficulty: row.difficulty ?? null,
      page: row.page ?? null,
    })),
  };
}

function seed(file = LIVE_JSON) {
  if (!fs.existsSync(file)) {
    console.error(`[diff] no ${path.relative(process.cwd(), file)} to seed from — run \`npm run seo:radar\` first.`);
    process.exitCode = 1;
    return;
  }
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const ranAt = fs.statSync(file).mtime.toISOString();
  const snapshots = readHistory();
  if (snapshots.some((entry) => entry.ranAt === ranAt)) {
    say(`[diff] baseline ${stamp(ranAt)} is already recorded (${snapshots.length} snapshot(s) on file).`);
    return;
  }
  snapshots.push(snapshotFrom(payload.measured ?? [], ranAt));
  snapshots.sort((a, b) => Date.parse(a.ranAt) - Date.parse(b.ranAt));
  writeHistory(snapshots);
  say(`[diff] seeded baseline ${stamp(ranAt)} · ${(payload.measured ?? []).length} queries.`);
}

function stamp(iso) {
  return iso.slice(0, 16).replace("T", " ");
}

function describe(row) {
  const score = row.difficulty === null ? "—" : `${row.difficulty}/10`;
  return `${score}${row.page ? ` → ${row.page}` : ""}`;
}

function diff() {
  const snapshots = readHistory();
  if (snapshots.length === 0) {
    console.error("[diff] no history yet — run `npm run seo:radar` (it records a snapshot) or `--seed`.");
    process.exitCode = 1;
    return;
  }
  if (snapshots.length === 1) {
    const only = snapshots[0];
    say(`[diff] one snapshot on file: ${stamp(only.ranAt)} · ${only.measured.length} queries.`);
    say("[diff] nothing to compare yet — the next `npm run seo:radar` produces the second point.");
    return;
  }

  const before = snapshots[snapshots.length - 2];
  const after = snapshots[snapshots.length - 1];
  const previous = new Map(before.measured.map((row) => [row.query, row]));
  const current = new Map(after.measured.map((row) => [row.query, row]));

  const gained = [];
  const lost = [];
  const easier = [];
  const harder = [];
  const rescored = [];

  for (const [query, row] of current) {
    const old = previous.get(query);
    if (!old) {
      gained.push(row);
      continue;
    }
    if (old.verdict !== row.verdict) {
      const from = RANK[old.verdict] ?? 0;
      const to = RANK[row.verdict] ?? 0;
      if (from === 0 || to === 0) continue; // discard in either direction is not a rank
      (to > from ? easier : harder).push({ query, old, row });
    } else if (old.difficulty !== row.difficulty) {
      rescored.push({ query, old, row });
    }
  }
  for (const [query, row] of previous) if (!current.has(query)) lost.push(row);

  const shared = [...current.keys()].filter((query) => previous.has(query)).length;
  say(
    `[diff] ${stamp(before.ranAt)} → ${stamp(after.ranAt)} · ` +
      `${before.measured.length} queries then, ${after.measured.length} now · ${shared} shared`,
  );

  if (gained.length + lost.length + easier.length + harder.length + rescored.length === 0) {
    say("[diff] no verdict or score changed between these two runs.");
    return;
  }

  if (easier.length > 0) {
    say(`\n[EASIER] ${easier.length} phrase(s) moved toward an open SERP:`);
    for (const entry of easier) {
      say(`  ${entry.old.verdict} → ${entry.row.verdict}  ${describe(entry.row)}  · ${entry.query}`);
    }
  }
  if (harder.length > 0) {
    say(`\n[HARDER] ${harder.length} phrase(s) lost ground:`);
    for (const entry of harder) {
      say(`  ${entry.old.verdict} → ${entry.row.verdict}  ${describe(entry.row)}  · ${entry.query}`);
    }
  }
  if (gained.length > 0) {
    say(`\n[NEW] ${gained.length} phrase(s) measured for the first time:`);
    for (const row of gained) say(`  ${row.verdict}  ${describe(row)}  · ${row.query}`);
  }
  if (lost.length > 0) {
    say(`\n[DROPPED] ${lost.length} phrase(s) no longer in the sweep:`);
    for (const row of lost) say(`  ${row.verdict}  ${describe(row)}  · ${row.query}`);
  }
  if (rescored.length > 0) {
    say(`\n[RESCORED] ${rescored.length} phrase(s) same verdict, different weakness:`);
    for (const entry of rescored) {
      say(`  ${entry.old.difficulty}/10 → ${entry.row.difficulty}/10  · ${entry.query}`);
    }
  }
  say(
    "\nA verdict that did not move is not proof the page is not ranking — this measures the " +
      "top ten's titles, not our position. Check Search Console for impressions before rewriting copy.",
  );
}

const seedIndex = process.argv.indexOf("--seed");
if (seedIndex >= 0) {
  const candidate = process.argv[seedIndex + 1];
  seed(candidate && !candidate.startsWith("--") ? candidate : LIVE_JSON);
} else {
  diff();
}
