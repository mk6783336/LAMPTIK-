#!/usr/bin/env node
/**
 * Ad fill health — GA4's `ad_slot_result` events, summarised per zone.
 *
 * The site reports one event per ad auction (`lib/ad-telemetry.ts`) with the
 * zone key, the placement and one of three outcomes. This turns that stream
 * into the only number that matters operationally: each zone's fill rate,
 * compared with its own recent past, so a zone that quietly stops bidding is
 * noticed without anyone opening a dashboard.
 *
 * Fill rate deliberately EXCLUDES `blocked`. A visitor with an ad-blocker
 * never gave the auction a chance, and counting them as "no demand" would
 * make every zone look dead in proportion to how many readers block ads.
 *
 *   fill rate = filled / (filled + timeout)
 *
 * A zone is flagged when either:
 *   - its fill rate falls by `GA4_DROP_POINTS` or more against the baseline
 *     window, on at least `GA4_MIN_AUCTIONS` measurable auctions; or
 *   - it fills nothing at all (`filled = 0`) on that many auctions — the
 *     "dead zone" case, which has no delta to trip.
 *
 * Output: a table on stdout, the same table in the run's Summary tab, and
 * `ads-health-alerts.md` when something is wrong (the workflow turns that
 * file into a GitHub issue and a failed run).
 *
 * The same window's traffic follows it: sessions, users, page views, where the
 * sessions came from and the top pages. A fill rate is a ratio over a sample
 * nobody sized — a zone can "drop" because a channel stopped sending people,
 * and this is the table that shows which. It is reporting only: traffic never
 * opens or closes an issue.
 *
 * Auth is the same service account used by `scripts/gsc-check.mjs`: the key
 * is accepted raw or base64, and `GA4_SERVICE_ACCOUNT_JSON` falls back to
 * `GSC_SERVICE_ACCOUNT_JSON` so one key can serve both APIs. The account must
 * be added as a Viewer on the GA4 property, and the four custom dimensions
 * must exist first — see `docs/ga4-ad-health-setup.md`.
 */
import { createSign } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";

const EVENT_NAME = "ad_slot_result";

const KEY_RAW = (
  process.env.GA4_SERVICE_ACCOUNT_JSON ??
  process.env.GSC_SERVICE_ACCOUNT_JSON ??
  ""
).trim();
/**
 * The property this repository reports on, used when the repository variable
 * is absent. Only one GA4 property receives this site's traffic, and an unset
 * variable used to fail the run with "unconfigured" even though everything
 * else was in place — a configuration trap, not a measurement problem.
 * `GA4_PROPERTY_ID` still wins when set, so a second property stays possible.
 */
const DEFAULT_PROPERTY = "561275135";
const PROPERTY = (process.env.GA4_PROPERTY_ID || DEFAULT_PROPERTY)
  .trim()
  .replace(/^properties\//, "");
const SKIP_IF_UNCONFIGURED = process.argv.includes("--skip-if-unconfigured");
const RUN_URL = (process.env.RUN_URL ?? "").trim();
const ALERT_PATH = process.env.GA4_ALERT_PATH ?? "ads-health-alerts.md";

/** Tuning knobs, all optional. Defaults are the ones documented in the doc. */
const RECENT_DAYS = intEnv("GA4_RECENT_DAYS", 3, 1, 30);
const BASELINE_DAYS = intEnv("GA4_BASELINE_DAYS", 14, 3, 90);
const MIN_AUCTIONS = intEnv("GA4_MIN_AUCTIONS", 40, 5, 100_000);
const DROP_POINTS = intEnv("GA4_DROP_POINTS", 20, 5, 100);
/**
 * GA4 finalises a day up to 48h behind the calendar. Without the lag, the last
 * day of every window is partial and every run looks like a drop.
 */
const DATA_LAG_DAYS = intEnv("GA4_DATA_LAG_DAYS", 2, 1, 7);

const log = (message = "") => console.log(message);

function intEnv(name, fallback, min, max) {
  const given = (process.env[name] ?? "").trim();
  // An unset repository variable reaches the script as "", not undefined, so
  // an empty string must mean "use the default" rather than Number("") = 0.
  const raw = given === "" ? fallback : Number(given);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

/** `YYYY-MM-DD` for N days ago, UTC. */
function shiftDate(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** A window of `days` days ending `offset` days before today. */
function windowRange(offset, days) {
  return { startDate: shiftDate(offset + days - 1), endDate: shiftDate(offset) };
}

const RECENT = windowRange(DATA_LAG_DAYS, RECENT_DAYS);
const BASELINE = windowRange(DATA_LAG_DAYS + RECENT_DAYS, BASELINE_DAYS);

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

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

function warn(message) {
  console.warn(message);
  summary(`> **Ad fill health: not measured.** ${message}`);
}

// ---------------------------------------------------------------------------
// Auth — identical shape to scripts/gsc-check.mjs
// ---------------------------------------------------------------------------

const base64url = (value) => Buffer.from(value).toString("base64url");

function parseCredentials(raw) {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("service account secret is neither JSON nor base64-encoded JSON");
  }
  if (!json.client_email || !json.private_key) {
    throw new Error("service account JSON is missing client_email or private_key");
  }
  return { email: json.client_email, key: json.private_key };
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: credentials.email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64url(
    createSign("RSA-SHA256").update(`${header}.${claims}`).sign(credentials.key),
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    const reason = data?.error_description ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(`token exchange failed: ${reason}`);
  }
  return data.access_token;
}

// ---------------------------------------------------------------------------
// GA4 Data API
// ---------------------------------------------------------------------------

async function runReport(token) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`;
  const body = {
    dateRanges: [
      { startDate: RECENT.startDate, endDate: RECENT.endDate, name: "recent" },
      { startDate: BASELINE.startDate, endDate: BASELINE.endDate, name: "baseline" },
    ],
    dimensions: [
      { name: "customEvent:zone_key" },
      { name: "customEvent:slot" },
      { name: "customEvent:outcome" },
    ],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: EVENT_NAME, matchType: "EXACT" },
      },
    },
    limit: 10_000,
    keepEmptyRows: false,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error?.message ?? `HTTP ${response.status}`;
    if (/customEvent|valid dimension|unknown dimension|not a valid/i.test(message)) {
      throw new Error(
        `${message}\n\nGA4 has no custom dimensions registered for these event parameters yet. ` +
          "Register `zone_key`, `slot`, `outcome` and `wait_ms` under " +
          "Admin → Custom definitions → Custom dimensions (scope: Event), then re-run. " +
          "See docs/ga4-ad-health-setup.md.",
      );
    }
    throw new Error(`GA4 runReport failed: ${message}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Traffic — what the auctions rode on
// ---------------------------------------------------------------------------

const number = new Intl.NumberFormat("en-US");

/**
 * Three questions in one call, on the fill report's own window: how much
 * traffic arrived, where it came from, and which pages it read.
 *
 * This is deliberately not allowed to take the run down. A fill-rate
 * regression is the alert this job exists to send, and a quota error or a
 * renamed dimension here must not replace that alert with a stack trace —
 * the caller catches and reports the reason in the summary instead.
 */
async function loadTraffic(token) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:batchRunReports`;
  const dateRanges = [{ startDate: RECENT.startDate, endDate: RECENT.endDate }];

  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          dateRanges,
          metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }],
        },
        {
          dateRanges,
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [{ name: "sessions" }],
          limit: 10,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
        {
          dateRanges,
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
          limit: 10,
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
  }

  const reports = data?.reports ?? [];
  const total = reports[0]?.rows?.[0]?.metricValues ?? [];
  const count = (value) => Number(value?.value ?? 0);

  return {
    sessions: count(total[0]),
    users: count(total[1]),
    views: count(total[2]),
    sources: (reports[1]?.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value || "(not set)",
      medium: row.dimensionValues?.[1]?.value || "(not set)",
      sessions: count(row.metricValues?.[0]),
    })),
    pages: (reports[2]?.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value || "(not set)",
      views: count(row.metricValues?.[0]),
      sessions: count(row.metricValues?.[1]),
    })),
  };
}

/** A `|` in a path or source would break the table's columns. */
function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|");
}

function renderTraffic(traffic) {
  summary(`## Traffic, same window`);
  summary(`Recent: **${RECENT.startDate} → ${RECENT.endDate}** (${RECENT_DAYS}d).`);

  if (traffic.error) {
    log("");
    log(`traffic: unavailable — ${traffic.error}`);
    summary("");
    summary(`> **Traffic report unavailable.** ${traffic.error}`);
    summary("");
    return;
  }

  const { sessions, users, views, sources, pages } = traffic;
  log("");
  log(
    `traffic ${RECENT.startDate}..${RECENT.endDate}: ${number.format(sessions)} sessions · ` +
      `${number.format(users)} users · ${number.format(views)} page views`,
  );

  summary("");
  summary(
    `**${number.format(sessions)}** sessions · **${number.format(users)}** users · ` +
      `**${number.format(views)}** page views`,
  );
  summary("");

  if (!sessions) {
    summary("_No sessions in this window._");
    summary("");
    return;
  }

  if (sources.length) {
    summary(`### Where the sessions came from`);
    summary("| Source / medium | Sessions |");
    summary("| --- | ---: |");
    for (const entry of sources) {
      summary(
        `| ${escapeCell(entry.source)} / ${escapeCell(entry.medium)} | ${number.format(
          entry.sessions,
        )} |`,
      );
    }
    summary("");
  }

  if (pages.length) {
    summary(`### Top pages`);
    summary("| Page | Views | Sessions |");
    summary("| --- | ---: | ---: |");
    for (const entry of pages) {
      summary(
        `| \`${escapeCell(entry.path)}\` | ${number.format(entry.views)} | ${number.format(
          entry.sessions,
        )} |`,
      );
    }
    summary("");
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const OUTCOMES = ["filled", "timeout", "blocked"];

function emptyTally() {
  return { filled: 0, timeout: 0, blocked: 0, other: 0 };
}

/** Fill rate excluding blocked traffic; null when nothing was measurable. */
function fillRate(tally) {
  const measurable = tally.filled + tally.timeout;
  return measurable > 0 ? tally.filled / measurable : null;
}

function measurable(tally) {
  return tally.filled + tally.timeout;
}

function percent(rate) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function points(delta) {
  if (delta === null) return "—";
  const rounded = Math.round(delta);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/**
 * Rows are per zone+slot+outcome; the alert unit is the zone, so they collapse
 * here while the slots it serves are kept for the report.
 */
function aggregate(rows) {
  const zones = new Map();

  for (const row of rows) {
    const [zone = "(unset)", slot = "(unset)", outcome = "other"] = row.dimensionValues.map(
      (value) => value.value || "(unset)",
    );
    const count = Number(row.metricValues?.[0]?.value ?? 0);
    if (!count) continue;

    // Named ranges come back as their name; unnamed ones as date_range_N.
    const range = row.dateRange ?? "";
    const which = range === "baseline" || range === "date_range_1" ? "baseline" : "recent";

    if (!zones.has(zone)) {
      zones.set(zone, {
        zone,
        slots: new Set(),
        recent: emptyTally(),
        baseline: emptyTally(),
      });
    }
    const entry = zones.get(zone);
    entry.slots.add(slot);
    if (OUTCOMES.includes(outcome)) entry[which][outcome] += count;
    else entry[which].other += count;
  }

  return [...zones.values()].map((entry) => {
    const recentRate = fillRate(entry.recent);
    const baselineRate = fillRate(entry.baseline);
    const deltaPoints =
      recentRate === null || baselineRate === null
        ? null
        : (recentRate - baselineRate) * 100;

    let status = "ok";
    if (entry.recent.blocked > measurable(entry.recent)) {
      // More blocked than measurable: the zone is not the problem, the audience
      // is blocking ads. Informational — it never raises an alert on its own.
      status = "blocked";
    }
    if (measurable(entry.recent) >= MIN_AUCTIONS) {
      if (entry.recent.filled === 0) status = "dead";
      else if (deltaPoints !== null && deltaPoints <= -DROP_POINTS) status = "dropping";
    } else if (baselineRate === null) {
      status = "new";
    }

    return {
      zone: entry.zone,
      slots: [...entry.slots].sort(),
      recent: entry.recent,
      baseline: entry.baseline,
      recentRate,
      baselineRate,
      deltaPoints,
      status,
    };
  });
}

const ALERT_STATUSES = new Set(["dead", "dropping"]);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderTable(entries) {
  const head =
    "| Zone | Slots | Auctions | Fill now | Fill before | Δ | Blocked | Status |\n" +
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |";
  const body = entries
    .map((entry) => {
      const auctions = measurable(entry.recent);
      const blockedShare =
        auctions + entry.recent.blocked > 0
          ? Math.round((entry.recent.blocked / (auctions + entry.recent.blocked)) * 100)
          : 0;
      return `| \`${entry.zone}\` | ${entry.slots.join(", ")} | ${auctions} | ${percent(
        entry.recentRate,
      )} | ${percent(entry.baselineRate)} | ${points(entry.deltaPoints)} | ${blockedShare}% | ${entry.status} |`;
    })
    .join("\n");
  return `${head}\n${body}`;
}

function printConsole(entries) {
  const width = Math.max(...entries.map((entry) => entry.zone.length), 8);
  log(
    `${"zone".padEnd(width)}  ${"auctions".padStart(8)}  ${"fill now".padStart(8)}  ${"before".padStart(7)}  ${"delta".padStart(6)}  status`,
  );
  for (const entry of entries) {
    log(
      `${entry.zone.padEnd(width)}  ${String(measurable(entry.recent)).padStart(8)}  ${percent(
        entry.recentRate,
      ).padStart(8)}  ${percent(entry.baselineRate).padStart(7)}  ${points(
        entry.deltaPoints,
      ).padStart(6)}  ${entry.status}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // The property id has a default, so a missing key is the only configuration
  // failure left that this script can hit.
  if (!KEY_RAW) {
    const message =
      "ad fill health is unconfigured — missing GA4_SERVICE_ACCOUNT_JSON " +
      "(or GSC_SERVICE_ACCOUNT_JSON). Set it per docs/ga4-ad-health-setup.md; " +
      "until then no zone can be watched.";
    if (SKIP_IF_UNCONFIGURED) {
      warn(message);
      setOutput("configured", "false");
      setOutput("alerts", "false");
      return;
    }
    throw new Error(message);
  }

  if (!/^\d+$/.test(PROPERTY)) {
    throw new Error(
      `GA4_PROPERTY_ID must be the numeric property id (e.g. 123456789), got "${PROPERTY}".`,
    );
  }

  setOutput("configured", "true");
  log(
    `GA4 property ${PROPERTY} · ${EVENT_NAME} · recent ${RECENT.startDate}..${RECENT.endDate} ` +
      `vs baseline ${BASELINE.startDate}..${BASELINE.endDate}`,
  );

  const credentials = parseCredentials(KEY_RAW);
  const token = await getAccessToken(credentials);

  // Fetched before the ad report so a window with no auctions still answers
  // the traffic question, and caught here so a traffic failure is a line in
  // the summary rather than the end of the run.
  const traffic = await loadTraffic(token).catch((error) => ({ error: error.message }));

  const data = await runReport(token);
  const rows = data?.rows ?? [];

  if (!rows.length) {
    warn(
      `no \`${EVENT_NAME}\` events in either window. The telemetry shipped recently — ` +
        "it needs traffic, and GA4 needs up to 48h to finalise a day.",
    );
    // `measured` is separate from `alerts` so the workflow can tell "nothing is
    // wrong" from "nothing was measured": only the former may close an issue.
    setOutput("measured", "false");
    setOutput("alerts", "false");
    renderTraffic(traffic);
    return;
  }

  // Only now is there something to measure: everything above can still end in
  // "no data", which must never be reported as a clean bill of health.
  setOutput("measured", "true");

  const entries = aggregate(rows).sort((a, b) => {
    const aAlert = ALERT_STATUSES.has(a.status) ? 0 : 1;
    const bAlert = ALERT_STATUSES.has(b.status) ? 0 : 1;
    if (aAlert !== bAlert) return aAlert - bAlert;
    return measurable(b.recent) - measurable(a.recent);
  });

  const alerts = entries.filter((entry) => ALERT_STATUSES.has(entry.status));

  log("");
  printConsole(entries);
  log("");
  log(
    `${alerts.length} zone(s) need attention · thresholds: drop ≥${DROP_POINTS} points ` +
      `on ≥${MIN_AUCTIONS} auctions, or zero fills. Fill rate excludes blocked traffic.`,
  );

  summary(`## Ad fill rate by zone`);
  summary(`Recent: **${RECENT.startDate} → ${RECENT.endDate}** (${RECENT_DAYS}d) · baseline: **${BASELINE.startDate} → ${BASELINE.endDate}** (${BASELINE_DAYS}d).`);
  summary(`Fill rate = \`filled / (filled + timeout)\`; blocked visitors are excluded because they never entered the auction.`);
  summary("");
  summary(renderTable(entries));
  summary("");
  summary(
    `Alert rule: a drop of ≥${DROP_POINTS} points, or zero fills, on at least ${MIN_AUCTIONS} measurable auctions.`,
  );
  summary("");

  renderTraffic(traffic);

  if (!alerts.length) {
    setOutput("alerts", "false");
    log("All zones healthy.");
    return;
  }

  setOutput("alerts", "true");

  const detected = new Date().toISOString().replace("T", " ").slice(0, 16);
  const alertMarkdown = [
    `## Ad fill rate regression`,
    "",
    `Detected ${detected} UTC. Recent window **${RECENT.startDate} → ${RECENT.endDate}** vs baseline **${BASELINE.startDate} → ${BASELINE.endDate}**.`,
    "",
    renderTable(alerts),
    "",
    `Thresholds: fill drops ≥${DROP_POINTS} points, or a zone fills nothing, on ≥${MIN_AUCTIONS} measurable auctions.`,
    `Fill rate excludes \`blocked\` traffic — a spike there means ad-blockers, not missing demand.`,
    "",
    RUN_URL ? `[Full report](${RUN_URL})` : "",
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync(ALERT_PATH, `${alertMarkdown}\n`, "utf8");

  log("");
  log("ALERTS:");
  for (const entry of alerts) {
    log(
      `  ${entry.zone} · ${entry.status} · fill ${percent(entry.recentRate)} vs ${percent(
        entry.baselineRate,
      )} (${points(entry.deltaPoints)} pts) on ${measurable(entry.recent)} auctions`,
    );
  }
}

main().catch((error) => {
  console.error(`ad fill health failed: ${error.message}`);
  summary(`> **Ad fill health failed.** ${error.message}`);
  process.exit(1);
});
