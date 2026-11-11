#!/usr/bin/env node
/**
 * Load `.env.local` into `process.env` for the standalone scripts.
 *
 * Next.js reads `.env.local` itself, but `node scripts/*.mjs` does not — which
 * is how a key that was pasted once gets reported as "not configured" on the
 * next run. `import "./load-env.mjs"` is the whole API: ESM runs an imported
 * module before the importing module's body, so every `process.env.X` constant
 * below sees the file's values.
 *
 * Existing environment variables win, so a CI secret or a one-off
 * `BING_WEBMASTER_API_KEY=… node scripts/bing-submit.mjs` still overrides the
 * file rather than being silently replaced by it.
 *
 * An empty `KEY=` is skipped on purpose: a placeholder that reads as an empty
 * string would make `if (!KEY)` pass and turn a missing key into a failed run
 * instead of an honest "not configured".
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [".env.local", ".env"];

function apply(text) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    let value = match[2].trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    if (value === "") continue;

    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

/** Files that were actually read, in load order. */
export const loaded = FILES.filter((name) => existsSync(resolve(ROOT, name))).map((name) => {
  const path = resolve(ROOT, name);
  apply(readFileSync(path, "utf8"));
  return path;
});
