#!/usr/bin/env node
/**
 * Static render check for the SVG sprite.
 *
 * The page audit reads live HTML with no browser, so nothing in it notices a
 * `<use href="#g-…">` whose `<symbol>` is missing: the icon simply renders as
 * an empty box for real visitors while every metadata check still passes. That
 * is exactly the failure a sprite refactor can ship — one renamed symbol id and
 * every arrow on the site disappears.
 *
 * The rules here are deliberately about what the document says, not what a
 * browser would paint:
 *
 *   - every `<use>` must name a target (`href`/`xlink:href` starting with `#`);
 *   - that target must exist as a `<symbol id>` in the same document;
 *   - `<symbol id>` values must be unique — a duplicate id means one of the two
 *     icons silently wins and the other's draws are dropped;
 *   - an `<svg>` with no drawable child at all is flagged Low: it can be a
 *     decorative placeholder, but it is also what a broken icon looks like.
 *
 * Severity follows the sweep's contract: High fails the run, Low is
 * informational.
 */

const DRAWABLE = /<(?:path|circle|rect|line|polyline|polygon|ellipse|text|image|use)\b/;

function uniqueNonEmpty(values) {
  return [...new Set(values.filter((value) => value !== ""))];
}

export function checkSprite(html) {
  const findings = [];

  const symbolIds = [...html.matchAll(/<symbol\b[^>]*\bid="([^"]*)"/g)].map((match) => match[1]);
  const symbolSet = new Set(symbolIds);

  const duplicateIds = uniqueNonEmpty(
    symbolIds.filter((id, index) => symbolIds.indexOf(id) !== index),
  );
  if (duplicateIds.length) {
    findings.push({
      id: "sprite-duplicate-symbol",
      severity: "Medium",
      message: `duplicate <symbol id> (${duplicateIds.length}): ${duplicateIds.slice(0, 5).join(", ")}`,
    });
  }

  const uses = [...html.matchAll(/<use\b[^>]*>/g)].map((match) => match[0]);
  const withoutTarget = uses.filter(
    (tag) => !/\b(?:xlink:)?href="#[^"]+"/.test(tag),
  ).length;
  if (withoutTarget) {
    findings.push({
      id: "sprite-use-without-target",
      severity: "High",
      message: `${withoutTarget} <use> element${withoutTarget === 1 ? "" : "s"} with no href="#…" target`,
    });
  }

  const referenced = uses
    .map((tag) => /\b(?:xlink:)?href="#([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean);
  const unresolved = uniqueNonEmpty(referenced.filter((id) => !symbolSet.has(id)));
  if (unresolved.length) {
    findings.push({
      id: "sprite-missing-symbol",
      severity: "High",
      message:
        `${unresolved.length} referenced symbol${unresolved.length === 1 ? "" : "s"} not defined in the document ` +
        `(${referenced.length} <use> references): ${unresolved.slice(0, 5).join(", ")}` +
        (symbolIds.length === 0 ? " — no <symbol> at all" : ""),
    });
  }

  const svgs = [...html.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)].map((match) => match[1]);
  const emptySvgs = svgs.filter((body) => !DRAWABLE.test(body) && !/<symbol\b/.test(body)).length;
  if (emptySvgs) {
    findings.push({
      id: "svg-empty",
      severity: "Low",
      message: `${emptySvgs} <svg> with no drawable child (no path/use/shape)`,
    });
  }

  return findings;
}
