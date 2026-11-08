#!/usr/bin/env node
/**
 * Daily download totals, read from the store the log drain writes to.
 *
 * The drain (`app/api/log-drain/route.ts`) increments one set of keys per UTC
 * day. This prints them as a table, because "how many downloads started" is a
 * question about days, not about log lines.
 *
 * Usage:
 *   npm run downloads:totals              # last 14 days
 *   npm run downloads:totals -- --days 30
 *
 * Credentials come from the environment or `.env.local` (never printed):
 *   KV_REST_API_URL / KV_REST_API_TOKEN   (Vercel Marketplace Redis)
 *   UPSTASH_REDIS_REST_URL / ..._TOKEN    (direct Upstash)
 */

import { readFile } from "node:fs/promises";

const DAYS = (() => {
  const index = process.argv.indexOf("--days");
  const raw = index === -1 ? Number.NaN : Number(process.argv[index + 1]);
  return Number.isFinite(raw) && raw > 0 && raw <= 365 ? Math.floor(raw) : 14;
})();

/** Minimal `.env.local` reader: KEY=value, optional quotes, no expansion. */
async function envFile(path) {
  try {
    const text = await readFile(path, "utf8");
    const values = new Map();
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, "$2").trim();
      if (value) values.set(match[1], value);
    }
    return values;
  } catch {
    return new Map();
  }
}

const file = await envFile(".env.local");
const pick = (...names) => {
  for (const name of names) {
    const value = process.env[name] ?? file.get(name);
    if (value) return value;
  }
  return "";
};

const url = pick("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL").replace(/\/+$/, "");
const token = pick("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");

if (!url || !token) {
  console.error(
    "No store configured. Set KV_REST_API_URL and KV_REST_API_TOKEN (Vercel → Storage → Redis)\n" +
      "or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, here or in .env.local.",
  );
  process.exit(2);
}

const days = Array.from({ length: DAYS }, (_, offset) => {
  const date = new Date(Date.now() - offset * 86_400_000);
  return date.toISOString().slice(0, 10);
}).reverse();

const result = await (async () => {
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(days.map((day) => ["GET", `dl:${day}`])),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`store answered ${response.status}`);
  return response.json();
})();

const counts = days.map((_, index) => Number(result?.[index]?.result ?? 0) || 0);

/** Byte totals and platform split need their own reads; keep them in one batch. */
const extras = await (async () => {
  const commands = [];
  for (const day of days) {
    commands.push(["GET", `dl:${day}:bytes`]);
    for (const platform of ["tiktok", "instagram", "facebook", "youtube", "twitter"]) {
      commands.push(["GET", `dl:${day}:p:${platform}`]);
    }
  }
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`store answered ${response.status}`);
  const rows = await response.json();
  return days.map((day, index) => {
    const base = index * 6;
    const value = (offset) => Number(rows?.[base + offset]?.result ?? 0) || 0;
    return {
      day,
      bytes: value(0),
      platforms: {
        tiktok: value(1),
        instagram: value(2),
        facebook: value(3),
        youtube: value(4),
        twitter: value(5),
      },
    };
  });
})();

const total = counts.reduce((sum, value) => sum + value, 0);
const totalBytes = extras.reduce((sum, row) => sum + row.bytes, 0);
const active = counts.filter((value) => value > 0).length;

console.log(`\nDownloads started — last ${DAYS} days (UTC)\n`);
console.log("  day          files   size      platforms");
for (let index = 0; index < days.length; index += 1) {
  const row = extras[index];
  const split = Object.entries(row.platforms)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => `${name.slice(0, 3)} ${value}`)
    .join(" · ");
  console.log(
    `  ${days[index]}   ${String(counts[index]).padStart(4)}   ${formatBytes(row.bytes).padStart(7)}   ${split || "—"}`,
  );
}

console.log(
  `\n  ${total} files on ${active} active ${active === 1 ? "day" : "days"} · ${formatBytes(totalBytes)} total` +
    (active ? ` · ${(total / Math.max(1, active)).toFixed(1)} per active day` : ""),
);
if (total === 0) {
  console.log("\n  No counts yet. The drain stores a day only after a download starts AND a store is configured.");
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** power;
  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`;
}
