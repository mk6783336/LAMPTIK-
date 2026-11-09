#!/usr/bin/env node
/**
 * Assert the floating header bar never overflows itself, at the widths phones
 * actually use.
 *
 * Why it exists: the header row holds a `shrink-0` logo and a `shrink-0`
 * control cluster, so `justify-between` has nothing to give when the content
 * is wider than the bar — the surplus goes straight past the rounded corner.
 * That happened twice (the two-position theme control at 390px, the App badge
 * at 320px), and both times the only way to see it was to open a browser and
 * measure by hand. This turns that measurement into a command.
 *
 * No dependency is added: Node 22 ships a global WebSocket, Chrome/Edge ships
 * a DevTools endpoint, and the two speak CDP. The only thing this needs is a
 * Chromium binary on the machine — see `findBrowser()`.
 *
 *   npm run check:header
 *   npm run check:header -- --widths=320,390 --paths=/,/tools
 *   HEADER_CHECK_URL=http://localhost:3000 npm run check:header
 *
 * Exit codes: 0 = every page fits at every width, 1 = at least one overflowed,
 * 2 = no browser found (a skip, not a pass — unless --allow-skip is passed).
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = (process.env.HEADER_CHECK_URL ?? "https://www.lamptik.online").replace(/\/+$/, "");

/** Widths worth guarding: the site's stated 390px budget and the narrowest phones. */
const arg = (name, fallback) => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  const env = process.env[`HEADER_CHECK_${name.toUpperCase()}`];
  if (!hit) return env ?? fallback;

  // Git Bash on Windows rewrites a bare `/tools` argument into
  // `C:/…/git/tools` before Node ever sees it, so the check would navigate to
  // a nonsense URL and only fail later with a confusing error page. Recover
  // the last segment; the caller keeps writing `--paths=/tools`.
  return hit
    .slice(name.length + 3)
    .split(",")
    .map((entry) => {
      const value = entry.trim();
      if (!/^[A-Za-z]:[\\/]/.test(value)) return value;
      // A bare `/` is rewritten to the shell's root *with* a trailing
      // separator; `/tools` is rewritten with the segment appended and no
      // trailing separator. That difference is the only reliable signal.
      if (/[\\/]$/.test(value)) {
        console.warn(`[header] note: "${value}" was rewritten by the shell — using "/"`);
        return "/";
      }
      const segment = value.split(/[\\/]/).pop() ?? "";
      console.warn(`[header] note: ${value} was rewritten by the shell — using "/${segment}"`);
      return `/${segment}`;
    })
    .join(",");
};

const WIDTHS = String(arg("widths", "320,390"))
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 200);

const PATHS = String(arg("paths", "/,/tools,/guides"))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => (value.startsWith("/") ? value : `/${value}`));

const ALLOW_SKIP = process.argv.includes("--allow-skip");
const VERBOSE = process.argv.includes("--verbose");

/**
 * The row is found by shape, not by Tailwind class: the header's only flex
 * container that holds both a link (the logo) and a button (the theme toggle).
 * The mobile platform strip is a `nav` and holds no buttons, so it cannot be
 * mistaken for the bar.
 */
const MEASURE = `(() => {
  const header = document.querySelector('header');
  if (!header) return { found: false, reason: 'no <header> on the page' };
  const row = [...header.querySelectorAll('div')].find(
    (el) => getComputedStyle(el).display === 'flex' && el.querySelector('a') && el.querySelector('button'),
  );
  if (!row) return { found: false, reason: 'header bar row not found' };
  const box = row.getBoundingClientRect();
  const app = [...header.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/apps');
  const group = header.querySelector('div[role="group"]');
  return {
    found: true,
    innerWidth: window.innerWidth,
    rowWidth: Math.round(box.width),
    clientWidth: row.clientWidth,
    scrollWidth: row.scrollWidth,
    overflowPx: row.scrollWidth - row.clientWidth,
    rightEdge: Math.round([...row.children].at(-1).getBoundingClientRect().right - box.left),
    docScrollWidth: document.documentElement.scrollWidth,
    appBadge: app ? getComputedStyle(app).display : 'absent',
    themeControl: group ? getComputedStyle(group).display : 'absent',
    visibleThemeButtons: [...header.querySelectorAll('button')].filter(
      (b) => b.getBoundingClientRect().width > 0,
    ).length,
    title: document.title.slice(0, 60),
    pathname: location.pathname,
  };
})()`;

/** Candidate executables, most specific first. `HEADER_CHECK_CHROME` wins. */
function findBrowser() {
  const explicit = process.env.HEADER_CHECK_CHROME;
  if (explicit && existsSync(explicit)) return explicit;

  const candidates =
    process.platform === "win32"
      ? [
          "C:/Program Files/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
          "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/snap/bin/chromium",
          ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal CDP client: one socket, session-scoped commands, 10s per call. */
function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 0;

  socket.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(timer);
    if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
    else resolve(message.result ?? {});
  };

  const ready = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error("could not open the DevTools socket"));
  });

  function send(method, params = {}, sessionId) {
    const id = ++nextId;
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 30_000);
      pending.set(id, {
        resolve: (value) => {
          if (VERBOSE) console.log(`  · ${method} ${Date.now() - started}ms`);
          resolve(value);
        },
        reject,
        timer,
      });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  return { ready, send, close: () => socket.close() };
}

/**
 * Wait for the thing being measured, not for `readyState`.
 *
 * A production page with ad iframes can sit in "loading" for a long time, so
 * a completion check reports a timeout on a page that has been measurable for
 * seconds. The header is server-rendered, so the honest condition is "the bar
 * row exists in the document at the route I asked for".
 */
async function waitForHeader(cdp, sessionId, route, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  const probe = `(() => {
    const header = document.querySelector('header');
    const row = header && [...header.querySelectorAll('div')].find(
      (el) => getComputedStyle(el).display === 'flex' && el.querySelector('a') && el.querySelector('button'),
    );
    return location.pathname + '|' + location.href.slice(0, 80) + '|' + (row ? 'row' : 'no-row');
  })()`;
  let last = "";

  while (Date.now() < deadline) {
    try {
      const { result } = await cdp.send("Runtime.evaluate", { expression: probe, returnByValue: true }, sessionId);
      const value = String(result?.value ?? "");
      if (VERBOSE && value !== last) console.log(`  probe: ${value}`);
      last = value;

      const [pathname = "", href = "", state = ""] = value.split("|");
      if (href.includes("chrome-error")) {
        return { ok: false, pathname, reason: `navigation failed (${href})` };
      }
      if (state === "row" && pathname === route) return { ok: true, pathname };
    } catch {
      // Execution context destroyed mid-navigation; ask again on the new one.
    }
    await sleep(250);
  }

  const [pathname = ""] = last.split("|");
  return { ok: false, pathname, reason: "the header bar never appeared" };
}

async function main() {
  if (WIDTHS.length === 0) {
    console.error("[header] no usable --widths given");
    process.exit(2);
  }

  const browser = findBrowser();
  if (!browser) {
    console.error(
      "[header] SKIP: no Chrome/Edge found. Set HEADER_CHECK_CHROME to a Chromium binary.\n" +
        "         This is a skip, not a pass — the header was not measured.",
    );
    process.exit(ALLOW_SKIP ? 0 : 2);
  }

  const profile = mkdtempSync(path.join(tmpdir(), "lamp-header-"));
  const child = spawn(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--user-data-dir=${profile}`,
      "--remote-debugging-port=0",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  /** Chrome prints the endpoint on stderr; port 0 means it chose one. */
  const endpoint = await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not report a DevTools endpoint")), 20_000);
    child.stderr.on("data", (chunk) => {
      buffer += String(chunk);
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early with code ${code}`));
    });
  }).catch((error) => {
    console.error(`[header] ${error.message}`);
    return null;
  });

  if (!endpoint) {
    child.kill();
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // disposable
    }
    process.exit(2);
  }

  const cdp = connect(endpoint);
  await cdp.ready;

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  // HeadlessChrome in the UA is what makes some edge networks serve a bot
  // challenge instead of the page; a normal Chrome UA keeps this a layout test.
  await cdp.send(
    "Network.setUserAgentOverride",
    {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/131.0.0.0 Safari/537.36",
    },
    sessionId,
  );

  const rows = [];
  const failures = [];

  for (const width of WIDTHS) {
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 },
      sessionId,
    );

    for (const route of PATHS) {
      const url = `${BASE}${route}`;
      await cdp.send("Page.navigate", { url }, sessionId);
      const probe = await waitForHeader(cdp, sessionId, route);
      if (!probe.ok) {
        failures.push({
          route,
          width,
          reason: `${probe.reason}${probe.pathname ? ` (at ${probe.pathname})` : ""}`,
          hint: "a bot challenge or a build error hides the header; try HEADER_CHECK_URL against a local dev server",
        });
        continue;
      }
      // One frame for the client components to hydrate the toggle icon.
      await sleep(400);

      let measurement;
      try {
        const { result } = await cdp.send(
          "Runtime.evaluate",
          { expression: MEASURE, returnByValue: true, awaitPromise: true },
          sessionId,
        );
        measurement = result?.value;
      } catch (error) {
        failures.push({ route, width, reason: `measurement failed: ${error.message}` });
        continue;
      }

      if (!measurement?.found) {
        failures.push({
          route,
          width,
          reason: measurement?.reason ?? "no measurement",
          hint:
            measurement && !measurement.found
              ? "a challenge page or a build error will hide the header"
              : undefined,
        });
        continue;
      }

      // A soft 404 still renders the shared header, so a wrong URL would
      // otherwise report a healthy measurement for a page nobody asked about.
      if (measurement.pathname !== route) {
        failures.push({
          route,
          width,
          reason: `landed on ${measurement.pathname} instead of ${route}`,
          hint: "the shell may have rewritten the argument; use HEADER_CHECK_PATHS",
        });
        continue;
      }

      rows.push({ width, route, ...measurement });

      if (measurement.overflowPx > 0) {
        failures.push({
          route,
          width,
          reason: `header row is ${measurement.scrollWidth}px of content in a ${measurement.clientWidth}px bar (+${measurement.overflowPx}px)`,
        });
      }
      if (measurement.docScrollWidth > measurement.innerWidth) {
        failures.push({
          route,
          width,
          reason: `page scrolls sideways: ${measurement.docScrollWidth}px wide in a ${measurement.innerWidth}px viewport`,
        });
      }
    }
  }

  cdp.close();
  child.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Windows keeps a handle on the crashpad files for a moment; the temp dir
    // is disposable and the OS reclaims it.
  }

  const headers = ["width", "route", "bar", "content", "overflow", "badge", "theme"];
  console.log(headers.join("\t"));
  for (const row of rows) {
    console.log(
      [
        row.width,
        row.route,
        `${row.clientWidth}px`,
        `${row.scrollWidth}px`,
        row.overflowPx > 0 ? `+${row.overflowPx}px` : "ok",
        row.appBadge,
        row.themeControl === "none" ? `${row.visibleThemeButtons} button` : row.themeControl,
      ].join("\t"),
    );
    if (VERBOSE) console.log(`  ${row.title}`);
  }

  if (failures.length > 0) {
    console.error(`\n[header] ${failures.length} failure(s)\n`);
    for (const failure of failures) {
      console.error(`  ${failure.route} @ ${failure.width}px`);
      console.error(`    ${failure.reason}`);
      if (failure.hint) console.error(`    ${failure.hint}`);
    }
    console.error(
      "\nThe bar is a fixed-height flex row whose ends are `shrink-0`: when the" +
        "\ncontent is wider than the bar, nothing can give and the surplus spills" +
        "\npast the rounded corner. Trim or hide a control at that breakpoint.\n",
    );
    process.exit(1);
  }

  console.log(`\n[header] ${rows.length} measurement(s) — the bar fits at every width checked`);
}

main().catch((error) => {
  console.error(`[header] ${error.message}`);
  process.exit(2);
});
