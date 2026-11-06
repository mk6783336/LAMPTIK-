#!/usr/bin/env node
/**
 * Every permanent redirect still lands on a page that answers 200.
 *
 * `next.config.ts` holds six redirects that exist only to keep old, linked
 * URLs alive (see `docs/legacy-redirects.md`). The failure this catches is the
 * quiet one: a destination page gets renamed — a guide slug changes, a tool
 * page moves — and the redirect keeps answering 308, but to nothing.
 *
 * Two independent assertions per rule, on purpose:
 *
 *   1. The source answers a permanent 3xx whose `Location` is the destination
 *      the config names. (Catches a source that stopped redirecting, or that
 *      redirects somewhere nobody meant.)
 *   2. The **destination itself** is requested and must answer 200. Checking
 *      only where the server actually went is not enough: if the rule is right
 *      but the page is gone, the followed chain is the thing that hides it.
 *
 * The source list is parsed from `next.config.ts` rather than duplicated here,
 * so a redirect added to the config is covered the next time this runs.
 *
 * Deliberately NOT part of `npm run verify`: that gate has to work offline, and
 * "the destination 404s" is a fact about a deployment, not about a commit. It
 * runs from the weekly Index Check workflow and by hand:
 *
 *   npm run check:redirects
 *   INDEX_CHECK_ORIGIN=http://localhost:3100 npm run check:redirects
 *
 * Exit codes: 0 = every redirect resolves to 200, 1 = at least one does not.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = (process.env.INDEX_CHECK_ORIGIN ?? "https://www.lamptik.online").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.REDIRECT_TIMEOUT_MS ?? 20_000);
const EXPECT_PERMANENT = process.env.REDIRECT_ALLOW_TEMPORARY !== "1";

const configPath = path.join(process.cwd(), "next.config.ts");
const config = await readFile(configPath, "utf8");

/**
 * `{ source, destination, permanent }` triples. Commented-out examples cannot
 * match: the regex needs all three keys, in that order, within a short span.
 */
const rules = [
  ...config.matchAll(
    /source:\s*"\/([^"]*)"[\s\S]{0,240}?destination:\s*"([^"]+)"[\s\S]{0,120}?permanent:\s*(true|false)/g,
  ),
]
  .map((match) => ({ source: `/${match[1]}`, destination: match[2], permanent: match[3] === "true" }))
  // A pattern carrying `:slug` or `*` cannot be requested as a literal URL;
  // it needs a real value, which this script has no way to invent.
  .filter((rule) => !/[:*()]/.test(rule.source));

if (rules.length === 0) {
  console.error(`check-redirects: no static redirect found in ${path.basename(configPath)}`);
  process.exit(1);
}

const absolute = (target) => {
  if (/^https?:\/\//i.test(target)) return target;
  return `${ORIGIN}${target.startsWith("/") ? target : `/${target}`}`;
};

const sameUrl = (actual, expected) => {
  try {
    const a = new URL(actual);
    const b = new URL(expected);
    return a.origin === b.origin && a.pathname.replace(/\/+$/, "") === b.pathname.replace(/\/+$/, "");
  } catch {
    return false;
  }
};

async function request(url, redirect) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect,
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; LampTikRedirectCheck/1.0)" },
    });
    // Drain so the socket is released and the timing is honest.
    await response.arrayBuffer();
    return { status: response.status, location: response.headers.get("location") };
  } catch (error) {
    return { status: 0, location: null, error: String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
const failures = [];

for (const rule of rules) {
  const from = absolute(rule.source);
  const expectedDestination = absolute(rule.destination);

  // Assertion 2 first: the destination has to answer on its own, whatever the
  // redirect currently does.
  const destination = await request(expectedDestination, "follow");

  const hop = await request(from, "manual");
  const redirectedTo = hop.location ? absolute(hop.location) : null;
  const followed = redirectedTo ? await request(redirectedTo, "follow") : { status: 0, location: null };

  const isRedirect = hop.status >= 300 && hop.status < 400;
  const permanent = hop.status === 301 || hop.status === 308;
  const pointsRight = Boolean(redirectedTo && sameUrl(redirectedTo, expectedDestination));

  rows.push({
    source: rule.source,
    hop: hop.status,
    target: redirectedTo ? redirectedTo.replace(ORIGIN, "") || "/" : "—",
    followed: followed.status,
    destination: destination.status,
  });

  if (hop.status === 0) {
    failures.push(`${rule.source} — request failed (${hop.error ?? "no response"})`);
  } else if (!isRedirect) {
    failures.push(`${rule.source} — answered ${hop.status}, expected a 3xx redirect`);
  } else {
    if (EXPECT_PERMANENT && rule.permanent && !permanent) {
      failures.push(`${rule.source} — answered ${hop.status}, expected a permanent 301/308`);
    }
    if (!pointsRight) {
      failures.push(
        `${rule.source} — redirects to ${rows.at(-1).target}, expected ${rule.destination}`,
      );
    }
    if (followed.status !== 200) {
      failures.push(`${rule.source} — following the redirect ends on ${followed.status || "no response"}, expected 200`);
    }
  }

  if (destination.status !== 200) {
    failures.push(
      `${rule.source} — destination ${rule.destination} answers ${destination.status || "no response"}, expected 200`,
    );
  }
}

const width = Math.max(...rows.map((row) => row.source.length));
console.log(`Redirects on ${ORIGIN}`);
console.log(`${"source".padEnd(width)}  hop  ->                       chain  dest`);
for (const row of rows) {
  console.log(
    `${row.source.padEnd(width)}  ${String(row.hop).padEnd(3)}  ${row.target.padEnd(24)} ${String(row.followed).padEnd(5)}  ${row.destination}`,
  );
}

if (failures.length > 0) {
  console.error(`\ncheck-redirects: ${failures.length} broken redirect(s)\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    "\nA redirect to a dead page is worse than a 404: the chain looks fine and ends nowhere." +
      "\nPoint the destination at the page that now answers, or restore it.\n",
  );
  process.exit(1);
}

console.log(
  `\ncheck-redirects: ${rows.length} redirect(s) land on 200 — ` +
    `${rows.filter((row) => row.hop === 308).length} permanent, ` +
    `${rows.filter((row) => row.destination === 200).length} destinations alive`,
);
