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
 *   npm run check:header
 *   npm run check:header -- --widths=320,390 --paths=/,/tools
 *   HEADER_CHECK_URL=http://localhost:3000 npm run check:header
 *
 * Exit codes: 0 = every page fits at every width, 1 = at least one overflowed,
 * 2 = no browser found (a skip, not a pass — unless --allow-skip is passed).
 */

import { findBrowser, flag, launch, openPage, option, pathList, poll, sleep, widthList } from "./lib/browser.mjs";

const BASE = (process.env.HEADER_CHECK_URL ?? "https://www.lamptik.online").replace(/\/+$/, "");

/** Widths worth guarding: the site's stated 390px budget and the narrowest phones. */
const WIDTHS = widthList(option("widths", "HEADER_CHECK_WIDTHS") ?? "320,390");
const PATHS = pathList(option("paths", "HEADER_CHECK_PATHS") ?? "/,/tools,/guides");
const ALLOW_SKIP = flag("allow-skip");
const VERBOSE = flag("verbose");

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

async function main() {
  if (WIDTHS.length === 0) {
    console.error("[header] no usable --widths given");
    process.exit(2);
  }

  const browser = findBrowser("HEADER_CHECK_CHROME");
  if (!browser) {
    console.error(
      "[header] SKIP: no Chrome/Edge found. Set HEADER_CHECK_CHROME to a Chromium binary.\n" +
        "         This is a skip, not a pass — the header was not measured.",
    );
    process.exit(ALLOW_SKIP ? 0 : 2);
  }

  const session = await launch(browser, VERBOSE);
  if (!session) process.exit(2);
  const { cdp, stop } = session;
  const sessionId = await openPage(cdp);

  const rows = [];
  const failures = [];

  for (const width of WIDTHS) {
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 },
      sessionId,
    );

    for (const route of PATHS) {
      await cdp.send("Page.navigate", { url: `${BASE}${route}` }, sessionId);

      // Wait for the bar itself, at the route that was asked for. A soft 404
      // still renders the shared header, so a wrong URL would otherwise report
      // a healthy measurement for a page nobody asked about.
      const probe = await poll(
        cdp,
        sessionId,
        `(() => {
          const header = document.querySelector('header');
          const row = header && [...header.querySelectorAll('div')].find(
            (el) => getComputedStyle(el).display === 'flex' && el.querySelector('a') && el.querySelector('button'),
          );
          return location.pathname + '|' + location.href.slice(0, 80) + '|' + (row ? 'row' : 'no-row');
        })()`,
        (value) => {
          const [pathname = "", href = "", state = ""] = value.split("|");
          if (href.includes("chrome-error")) return "stop";
          return state === "row" && pathname === route ? "ok" : "wait";
        },
        { verbose: VERBOSE },
      );

      if (!probe.ok) {
        const [pathname = "", href = ""] = probe.value.split("|");
        failures.push({
          route,
          width,
          reason: probe.stopped ? `navigation failed (${href})` : `the header bar never appeared (at ${pathname})`,
          hint: "a bot challenge or a build error hides the header; try HEADER_CHECK_URL against a local dev server",
        });
        continue;
      }

      // One frame for the client components to hydrate the toggle icon.
      await sleep(400);

      let measurement;
      try {
        measurement = await cdp.evaluate(sessionId, MEASURE);
      } catch (error) {
        failures.push({ route, width, reason: `measurement failed: ${error.message}` });
        continue;
      }

      if (!measurement?.found) {
        failures.push({ route, width, reason: measurement?.reason ?? "no measurement" });
        continue;
      }
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
  stop();

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
