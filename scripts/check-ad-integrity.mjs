#!/usr/bin/env node
/**
 * Assert the monetization rules that are invisible to a build: no ad paints a
 * full-viewport layer, every reserved creative box keeps its aspect ratio, and
 * nothing sits on top of a control in a protected region.
 *
 * Why it exists: every one of these failed in production. A network script
 * painted an invisible `position: fixed; inset: 0` layer that swallowed taps
 * (the "site is frozen" report), a slot collapsed from 250px to 56px, and a
 * download button was once reachable in the DOM but not by a finger. `npm run
 * build` is green through all of it — the failure lives in the rendered box
 * model, so the check has to read the box model.
 *
 *   npm run check:ads
 *   npm run check:ads -- --paths=/,/instagram --widths=390
 *   npm run check:ads -- --self-test        # prove the detector detects
 *
 * Exit codes: 0 = every rule held, 1 = at least one violated, 2 = no browser
 * (a skip, not a pass — unless --allow-skip is passed).
 */

import { findBrowser, flag, launch, openPage, option, pathList, poll, widthList } from "./lib/browser.mjs";

const BASE = (process.env.AD_CHECK_URL ?? "https://www.lamptik.online").replace(/\/+$/, "");
const WIDTHS = widthList(option("widths", "AD_CHECK_WIDTHS") ?? "320,390");
const PATHS = pathList(option("paths", "AD_CHECK_PATHS") ?? "/,/tools,/guides");
const ALLOW_SKIP = flag("allow-skip");
const VERBOSE = flag("verbose");
const SELF_TEST = flag("self-test");

/**
 * Read the things the rules talk about out of the live box model:
 *
 * - `overlays`: a fixed layer covering half the viewport or more that accepts
 *   pointer events. `pointer-events: none` is exempt on purpose — the ambient
 *   backdrop and the header scrim are both full-bleed and both pass taps
 *   through, which is exactly the distinction the ban turns on.
 * - `slots`: each `AdSlot`'s reserved box, compared against the ratio it
 *   declares in `--ad-ratio`. A slot that keeps its box cannot shift the page.
 * - `controls`: every enabled, visible control inside a `data-ad-guard` region,
 *   with five hit tests across its face. This is the "is it actually tappable"
 *   question, which `elementFromPoint` answers and a selector cannot.
 */
const AUDIT = `(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const name = (el) => {
    if (!el) return 'nothing';
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  const rectOf = (el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
  };

  // 1. Viewport-covering layers that can eat a tap.
  const overlays = [];
  for (const el of document.querySelectorAll('body *')) {
    const box = el.getBoundingClientRect();
    if (box.width * box.height < vw * vh * 0.5) continue;
    const style = getComputedStyle(el);
    if (style.position !== 'fixed' || style.pointerEvents === 'none') continue;
    if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    overlays.push({
      node: name(el),
      covers: Math.round(((box.width * box.height) / (vw * vh)) * 100),
      zIndex: style.zIndex,
    });
  }

  // 2. Reserved creative boxes, and the ratio they promise.
  //
  // The promise is not simply the --ad-ratio custom property: globals.css
  // pins every .ad-reserve to 300/250 below 640px, because the mobile
  // leaderboard→rectangle swap happens after hydration and an unpinned box grew
  // from ~48px to 325px when it landed (a measured 0.05 CLS). Both halves are
  // asserted: the declaration must exist, and the box must match whichever
  // ratio is actually in force at this width.
  const mobilePin = window.matchMedia('(max-width: 639px)').matches;
  const slots = [];
  for (const aside of document.querySelectorAll('[data-ad-slot]')) {
    const host = aside.querySelector('[data-ad-reserve]');
    const box = rectOf(host ?? aside);
    const ratio = host ? getComputedStyle(host).getPropertyValue('--ad-ratio').trim() : '';
    const parts = /([\\d.]+)\\s*\\/\\s*([\\d.]+)/.exec(ratio);
    const effective = mobilePin ? [300, 250] : parts ? [Number(parts[1]), Number(parts[2])] : null;
    const expected = effective ? Math.round((box.width * effective[1]) / effective[0]) : null;
    slots.push({
      format: aside.getAttribute('data-ad-slot'),
      state: aside.getAttribute('data-ad-state'),
      ratio,
      expectedFrom: mobilePin ? '300/250 (mobile pin)' : ratio,
      width: Math.round(box.width),
      height: Math.round(box.height),
      expectedHeight: expected,
      delta: expected === null ? null : Math.round(box.height) - expected,
      box,
    });
  }

  // 3. Tap-through on the protected controls.
  const controls = [];
  const CONTROL = 'button, a[href], input, select, textarea';
  for (const region of document.querySelectorAll('[data-ad-guard]')) {
    for (const el of region.querySelectorAll(CONTROL)) {
      if (el.disabled) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') continue;

      el.scrollIntoView({ block: 'center', inline: 'center' });
      const box = rectOf(el);
      if (box.width < 8 || box.height < 8) continue;

      const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName)
        .replace(/\\s+/g, ' ')
        .trim()
        .slice(0, 40);

      const blockers = new Set();
      let tested = 0;
      for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const x = box.left + box.width * fx;
        const y = box.top + box.height * fy;
        if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
        tested += 1;
        const hit = document.elementFromPoint(x, y);
        if (!(hit === el || el.contains(hit))) blockers.add(name(hit));
      }

      // Ad boxes are read here, at the same scroll position as the control, so
      // the two rects are in the same coordinate space.
      let adOverlapPx = 0;
      for (const host of document.querySelectorAll('[data-ad-slot] [data-ad-reserve]')) {
        const ad = host.getBoundingClientRect();
        const overlapW = Math.min(ad.right, box.right) - Math.max(ad.left, box.left);
        const overlapH = Math.min(ad.bottom, box.bottom) - Math.max(ad.top, box.top);
        if (overlapW > 0 && overlapH > 0) adOverlapPx = Math.max(adOverlapPx, Math.round(overlapW * overlapH));
      }

      controls.push({
        region: region.getAttribute('data-ad-guard'),
        label,
        tested,
        blocked: [...blockers],
        adOverlapPx,
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
  }

  return { pathname: location.pathname, vw, vh, overlays, slots, controls };
})()`;

/** Drop these into the page so the self-test can prove each rule fires. */
const FIXTURE = `(() => {
  // Sized explicitly, and given a child: an empty, auto-sized fixed div came
  // out 0x0 on the live page, which made this fixture silently plant nothing
  // and let the self-test pass over a missing overlay.
  const overlay = document.createElement('div');
  overlay.id = '__adcheck_overlay';
  overlay.setAttribute(
    'style',
    'display:block;position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:rgba(5,5,5,0.85)',
  );
  const mark = document.createElement('span');
  mark.textContent = 'self-test overlay';
  overlay.appendChild(mark);

  const region = document.createElement('div');
  region.id = '__adcheck_guard';
  region.setAttribute('data-ad-guard', 'result');
  region.setAttribute('style', 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Download';
  button.setAttribute('style', 'padding:12px 20px;pointer-events:auto');
  region.appendChild(button);

  const slot = document.createElement('aside');
  slot.id = '__adcheck_slot';
  slot.setAttribute('data-ad-slot', 'rectangle');
  slot.setAttribute('data-ad-state', 'pending');
  const host = document.createElement('div');
  host.setAttribute('data-ad-reserve', 'eager');
  host.setAttribute('style', 'width:300px;height:20px;--ad-ratio:300 / 250');
  slot.appendChild(host);

  document.body.append(region, overlay, slot);
  return true;
})()`;

const CLEANUP = `(() => {
  for (const id of ['__adcheck_overlay', '__adcheck_guard', '__adcheck_slot']) {
    document.getElementById(id)?.remove();
  }
  return true;
})()`;

/** Turn one audit into failures. Shared by the real run and the self-test. */
function judge({ route, width, audit, failures }) {
  for (const overlay of audit.overlays) {
    failures.push({
      route,
      width,
      code: "overlay",
      node: overlay.node,
      reason: `fixed layer covers ${overlay.covers}% of the viewport and accepts pointer events`,
      hint: "a viewport-covering ad layer is banned — it swallows every tap when its creative hangs",
    });
  }

  for (const slot of audit.slots) {
    if (slot.delta === null) {
      failures.push({
        route,
        width,
        code: "reserve",
        slot: slot.format,
        reason: `slot declares no usable --ad-ratio ("${slot.ratio}")`,
      });
    } else if (Math.abs(slot.delta) > 8) {
      failures.push({
        route,
        width,
        code: "reserve",
        slot: slot.format,
        reason:
          `reserved box is ${slot.width}×${slot.height}px but ${slot.expectedFrom} asks for ` +
          `${slot.expectedHeight}px tall (${slot.delta > 0 ? "+" : ""}${slot.delta}px)`,
        hint: "the box must keep its aspect ratio in every state, or everything below it moves",
      });
    }
  }

  for (const control of audit.controls) {
    if (control.blocked.length > 0) {
      failures.push({
        route,
        width,
        code: "tap",
        control: `${control.region}: ${control.label}`,
        reason: `not reachable at ${control.blocked.length} of ${control.tested} sampled points (covered by ${control.blocked.join(", ")})`,
        hint: "the Download CTA must be reachable with a plain tap",
      });
    }
    if (control.adOverlapPx > 0) {
      failures.push({
        route,
        width,
        code: "ad-cover",
        control: `${control.region}: ${control.label}`,
        reason: `an ad slot box overlaps ${control.adOverlapPx}px² of this control`,
      });
    }
  }
}

async function main() {
  if (WIDTHS.length === 0) {
    console.error("[ads] no usable --widths given");
    process.exit(2);
  }

  const browser = findBrowser("AD_CHECK_CHROME");
  if (!browser) {
    console.error(
      "[ads] SKIP: no Chrome/Edge found. Set AD_CHECK_CHROME to a Chromium binary.\n" +
        "      This is a skip, not a pass — nothing was measured.",
    );
    process.exit(ALLOW_SKIP ? 0 : 2);
  }

  const session = await launch(browser, VERBOSE);
  if (!session) process.exit(2);
  const { cdp, stop } = session;
  const sessionId = await openPage(cdp);

  const rows = [];
  const failures = [];
  let slotsSeen = 0;

  for (const width of WIDTHS) {
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 },
      sessionId,
    );

    for (const route of PATHS) {
      await cdp.send("Page.navigate", { url: `${BASE}${route}` }, sessionId);

      const ready = await poll(
        cdp,
        sessionId,
        `location.pathname + '|' + location.href.slice(0, 80) + '|' + (document.querySelector('main, [data-ad-guard]') ? 'painted' : 'blank')`,
        (value) => {
          const [pathname = "", href = "", state = ""] = value.split("|");
          if (href.includes("chrome-error")) return "stop";
          return state === "painted" && pathname === route ? "ok" : "wait";
        },
        { verbose: VERBOSE },
      );

      if (!ready.ok) {
        const [pathname = "", href = ""] = ready.value.split("|");
        failures.push({
          route,
          width,
          code: "landed",
          reason: ready.stopped ? `navigation failed (${href})` : `page never painted (at ${pathname})`,
          hint: "a bot challenge hides the whole page; try AD_CHECK_URL against a local dev server",
        });
        continue;
      }

      let audit;
      try {
        audit = await cdp.evaluate(sessionId, AUDIT);
      } catch (error) {
        failures.push({ route, width, code: "landed", reason: `audit failed: ${error.message}` });
        continue;
      }

      if (audit.pathname !== route) {
        failures.push({
          route,
          width,
          code: "landed",
          reason: `landed on ${audit.pathname} instead of ${route}`,
          hint: "the shell may have rewritten the argument; use AD_CHECK_PATHS",
        });
        continue;
      }

      slotsSeen += audit.slots.length;
      judge({ route, width, audit, failures });
      rows.push({ width, route, ...audit });
    }
  }

  // Nothing to measure is not the same as nothing wrong: an unconfigured zone
  // key renders no slot at all, and a green run there would be a lie.
  if (slotsSeen === 0) {
    failures.push({
      route: PATHS.join(","),
      width: WIDTHS.join(","),
      code: "noslots",
      reason: "no [data-ad-slot] element on any page — nothing was measured",
      hint: "the ad zone keys are unset in this environment, so AdSlot returns null",
    });
  }

  console.log(["width", "route", "slots", "reserve", "overlays", "cta"].join("\t"));
  for (const row of rows) {
    const sized = row.slots.filter((slot) => slot.delta !== null && Math.abs(slot.delta) <= 8).length;
    const reachable = row.controls.filter((control) => control.blocked.length === 0 && control.adOverlapPx === 0).length;
    console.log(
      [
        row.width,
        row.route,
        `${row.slots.length} (${[...new Set(row.slots.map((slot) => slot.state))].join(",") || "none"})`,
        `${sized}/${row.slots.length}`,
        row.overlays.length === 0 ? "none" : `${row.overlays.length}: ${row.overlays.map((o) => o.node).join(",")}`,
        row.controls.length === 0 ? "none in guard" : `${reachable}/${row.controls.length} reachable`,
      ].join("\t"),
    );
  }

  let selfTestFailed = false;
  if (SELF_TEST) {
    const route = PATHS[0];
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 900, deviceScaleFactor: 1, mobile: true },
      sessionId,
    );
    await cdp.send("Page.navigate", { url: `${BASE}${route}` }, sessionId);
    await poll(cdp, sessionId, "document.querySelector('main, [data-ad-guard]') ? 'painted' : 'blank'", (value) =>
      value === "painted" ? "ok" : "wait",
    );

    // Plant and audit in ONE evaluation, deliberately. `AdScripts` ships a
    // guard that clamps an unexpected fixed layer and hides it
    // (`display: none !important`) as soon as its observer runs — the reason a
    // banned vignette cannot freeze this site in production. A separate
    // evaluation therefore measures a layer that has already been neutralised,
    // and the self-test reports a miss on a page where nothing was left to
    // find. Same task, no observer in between.
    let audit;
    try {
      // The semicolon matters: without it the parser reads `})(...)` as a call
      // on the fixture's completion value.
      audit = await cdp.evaluate(sessionId, `${FIXTURE};\n${AUDIT}`);
    } finally {
      await cdp.evaluate(sessionId, CLEANUP).catch(() => {});
    }
    if (VERBOSE) {
      console.log(
        `  self-test audit: ${JSON.stringify({
          overlays: audit.overlays,
          slots: audit.slots.length,
          controls: audit.controls.map((c) => [c.label, c.tested, c.blocked]),
        })}`,
      );
    }

    const planted = [];
    judge({ route: `${route} (self-test)`, width: 390, audit, failures: planted });
    const codes = new Set(planted.map((failure) => failure.code));
    const missing = ["overlay", "reserve", "tap"].filter((code) => !codes.has(code));

    console.log(
      `\n[ads] self-test: planted an overlay, a collapsed 300x250 and a covered CTA — ` +
        `${missing.length === 0 ? "all three were caught" : `missed ${missing.join(", ")}`}`,
    );
    if (missing.length > 0) {
      selfTestFailed = true;
      failures.push({
        route: `${route} (self-test)`,
        width: 390,
        code: "self-test",
        reason: `the detector did not report ${missing.join(", ")} on a page where it was planted`,
        hint: "the selectors no longer match the markup — this check is no longer testing the rules",
      });
    }
  }

  cdp.close();
  stop();

  if (failures.length > 0) {
    console.error(`\n[ads] ${failures.length} failure(s)\n`);
    for (const failure of failures) {
      console.error(`  ${failure.route} @ ${failure.width}px — ${failure.code}`);
      if (failure.node) console.error(`    ${failure.node}`);
      if (failure.slot) console.error(`    ${failure.slot} slot`);
      if (failure.control) console.error(`    ${failure.control}`);
      console.error(`    ${failure.reason}`);
      if (failure.hint) console.error(`    ${failure.hint}`);
    }
    console.error(
      "\nMonetization may never cover the tool: ads stay in the document flow," +
        "\nreserve their box in every state, and leave every control tappable.\n",
    );
    process.exit(1);
  }

  console.log(`\n[ads] ${rows.length} page(s) audited — ad boxes hold their size and every control is reachable`);
  if (selfTestFailed) process.exit(1);
}

main().catch((error) => {
  console.error(`[ads] ${error.message}`);
  process.exit(2);
});
