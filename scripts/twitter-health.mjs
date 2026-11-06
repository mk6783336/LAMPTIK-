#!/usr/bin/env node
/**
 * Twitter/X resolver health — are the mirrors still answering?
 *
 * The resolver (`lib/twitter.ts`) walks fxtwitter → vxtwitter → syndication,
 * so a mirror can die without a single visitor noticing: the next tier answers
 * and the only visible trace is a `provider` value in the response body. The
 * day *two* tiers are down the page breaks for everyone, which is a bad way to
 * find out — these mirrors change field names and rate-limit without warning.
 *
 * This script asks the deployed site two questions every few hours:
 *
 *   1. `/api/twitter/health` — per-mirror state, probed in parallel by the
 *      route rather than by the waterfall, so a dead primary is reported while
 *      a healthy secondary carries production.
 *   2. `/api/twitter?url=…`  — the exact request a visitor's browser makes,
 *      end to end, including routing, rate limiting and the JSON contract.
 *
 * The second one matters: the health route shares the mirror code but not the
 * public path, and "the code is fine but the route 500s" is a real failure mode
 * this repo has shipped before.
 *
 * Alert rules (any one opens/updates the `twitter-health` issue and fails the
 * run — a failed scheduled run is what makes GitHub email the owner):
 *   - the health endpoint cannot be reached at all, or answers 503/down;
 *   - any single mirror is unreachable (degraded) — that is the whole point of
 *     monitoring, long before the page breaks;
 *   - the fixtures resolve to nothing anywhere (monitoring has gone blind, so
 *     someone must update TWITTER_HEALTH_POSTS);
 *   - the visitor-facing request returns `ok:false` or zero renditions.
 *
 * No secrets, no extra setup. Options:
 *   TWITTER_HEALTH_ORIGIN       default https://www.lamptik.online
 *   TWITTER_HEALTH_POSTS        comma-separated fixture post ids
 *   TWITTER_HEALTH_ALERT_PATH   default twitter-health-alerts.md
 *   RUN_URL                     link back to the Actions run (set by CI)
 */
import { appendFileSync, writeFileSync } from "node:fs";

const ORIGIN = (process.env.TWITTER_HEALTH_ORIGIN ?? "https://www.lamptik.online").replace(
  /\/+$/,
  "",
);
const FIXTURE = (
  process.env.TWITTER_HEALTH_POSTS ?? "1879168383423496436"
)
  .split(",")[0]
  .trim()
  .replace(/^.*\/status\//, "");
const ALERT_PATH = process.env.TWITTER_HEALTH_ALERT_PATH ?? "twitter-health-alerts.md";
const RUN_URL = (process.env.RUN_URL ?? "").trim();
/** Two retries: a scheduled run must tell "one bad request" from "one dead mirror". */
const ATTEMPTS = 3;
const TIMEOUT_MS = 20_000;

const log = (message = "") => console.log(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setOutput(name, value) {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) return;
  appendFileSync(path, `${name}=${value}\n`);
}

function summary(markdown) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  appendFileSync(path, `${markdown}\n`);
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "lamptik-twitter-health/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

/** Retry wrapper that keeps the last transport error for the report. */
async function getJsonWithRetry(url, label) {
  let lastError = "no attempt made";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const result = await getJson(url);
      if (result.json) return result;
      lastError = `HTTP ${result.status} with a non-JSON body`;
    } catch (error) {
      lastError = error?.name === "TimeoutError" ? "timed out" : String(error?.message ?? error);
    }
    if (attempt < ATTEMPTS) await sleep(3_000 * attempt);
  }
  throw new Error(`${label}: ${lastError}`);
}

async function main() {
  const problems = [];
  let snapshot = null;
  let measured = false;

  log(`Twitter resolver health — ${ORIGIN}`);
  log("");

  try {
    const health = await getJsonWithRetry(`${ORIGIN}/api/twitter/health`, "health endpoint");
    snapshot = health.json;
    measured = Array.isArray(snapshot?.mirrors) && snapshot.mirrors.length > 0;

    if (!measured) {
      problems.push("The health endpoint answered without a `mirrors` array — the response shape changed.");
    }

    log("mirror      state         renditions   ms   detail");
    log("----------  ------------  ----------  ---   ------");
    for (const mirror of snapshot?.mirrors ?? []) {
      log(
        `${String(mirror.mirror).padEnd(10)}  ${String(mirror.state).padEnd(12)}  ${String(
          mirror.renditions,
        ).padStart(10)}  ${String(mirror.durationMs).padStart(4)}   ${mirror.detail ?? "—"}`,
      );
    }
    log("");

    if (snapshot?.status === "down") {
      problems.push(
        `No mirror produced a downloadable rendition (${health.status}). The page is broken for every visitor.`,
      );
    } else if (snapshot?.status === "degraded") {
      const broken = (snapshot.mirrors ?? [])
        .filter((mirror) => mirror.state !== "ok")
        .map((mirror) => `${mirror.mirror} (${mirror.state}${mirror.detail ? `, ${mirror.detail}` : ""})`);
      problems.push(
        `Resolver degraded: ${snapshot.usable}/${snapshot.total} mirrors healthy. Broken: ${broken.join(", ")}.`,
      );
    } else if (snapshot?.status === "fixture_missing") {
      problems.push(
        `Every mirror agrees there is nothing to parse for post ${(snapshot.posts ?? []).join(", ")} — ` +
          "the fixture is probably deleted, so this check is no longer measuring anything. " +
          "Set TWITTER_HEALTH_POSTS to a current public video post.",
      );
    }
  } catch (error) {
    problems.push(`${error.message} — the deployed site could not be measured.`);
  }

  // The visitor-facing path. Only run once the health route answered, because
  // it would otherwise report the same outage twice.
  let visitor = null;
  if (measured) {
    const target = `https://x.com/i/status/${FIXTURE}`;
    try {
      const response = await getJson(`${ORIGIN}/api/twitter?url=${encodeURIComponent(target)}`);
      visitor = {
        status: response.status,
        ok: response.json?.ok === true,
        provider: response.json?.media?.provider ?? null,
        renditions: Array.isArray(response.json?.media?.variants)
          ? response.json.media.variants.length
          : 0,
      };
      log(
        `visitor path: HTTP ${visitor.status}, ok=${visitor.ok}, provider=${visitor.provider ?? "—"}, ` +
          `renditions=${visitor.renditions}`,
      );
      if (!visitor.ok || visitor.renditions < 1) {
        problems.push(
          `The visitor-facing request failed (HTTP ${visitor.status}, ok=${visitor.ok}, ` +
            `renditions=${visitor.renditions}) even though the mirrors probe ran.`,
        );
      }
    } catch (error) {
      problems.push(`The visitor-facing request threw: ${error.message}`);
    }
  }
  log("");

  setOutput("measured", measured ? "true" : "false");
  setOutput("alerts", problems.length > 0 ? "true" : "false");

  if (problems.length === 0) {
    log(`All ${snapshot?.total ?? 3} mirrors healthy.`);
    summary(
      `## Twitter resolver health\n\nAll ${snapshot?.total ?? 3} mirrors healthy ` +
        `(visitor path: ${visitor?.provider ?? "—"}, ${visitor?.renditions ?? 0} renditions).`,
    );
    return;
  }

  const lines = [
    `## Twitter resolver health — ${problems.length} problem${problems.length === 1 ? "" : "s"}`,
    "",
    ...problems.map((problem) => `- ${problem}`),
    "",
    `Checked ${new Date().toISOString()} against ${ORIGIN}.`,
    "",
    "| mirror | state | renditions | ms | detail |",
    "| --- | --- | --- | --- | --- |",
    ...(snapshot?.mirrors ?? []).map(
      (mirror) =>
        `| \`${mirror.mirror}\` | **${mirror.state}** | ${mirror.renditions} | ${mirror.durationMs} | ${mirror.detail ?? "—"} |`,
    ),
    "",
    "The resolver falls through to the next mirror, so a single degraded mirror is not yet a broken page — " +
      "it is the warning before one. Check each endpoint by hand:",
    "",
    "```bash",
    `curl -sS "${ORIGIN}/api/twitter/health" | jq .`,
    `curl -sS "${ORIGIN}/api/twitter?url=https%3A%2F%2Fx.com%2Fi%2Fstatus%2F${FIXTURE}" | jq '.media.variants'`,
    "```",
  ];
  if (RUN_URL) lines.push("", `Run: ${RUN_URL}`);

  const markdown = lines.join("\n");
  summary(markdown);
  writeFileSync(ALERT_PATH, `${markdown}\n`);
  console.error(markdown);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`twitter health failed: ${error?.message ?? error}`);
  summary(`> **Twitter resolver health failed.** ${error?.message ?? error}`);
  process.exitCode = 1;
});
