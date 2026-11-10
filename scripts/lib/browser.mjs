/**
 * Shared headless-Chromium plumbing for the layout guards
 * (`check-header-width.mjs`, `check-ad-integrity.mjs`).
 *
 * No dependency is added: Node 22 ships a global `WebSocket`, Chrome/Edge ships
 * a DevTools endpoint, and the two speak CDP. The only requirement is a
 * Chromium binary on the machine — see `findBrowser()`.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** `--name` present? */
export const flag = (name) => process.argv.includes(`--${name}`);

/** `--name=value` wins over the environment variable; `undefined` if neither. */
export function option(name, envName) {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.env[envName];
}

/**
 * Undo Git Bash's argument rewriting.
 *
 * On Windows, MSYS rewrites a bare `/tools` into `C:/…/git/tools` before Node
 * ever sees it, so a route argument silently becomes a nonsense URL. A bare
 * `/` arrives with a trailing separator (`C:/…/git/`); `/tools` arrives with
 * the segment appended and no trailing separator. That difference is the only
 * reliable signal, and it is what this recovers from.
 */
export function recoverShellPath(value) {
  if (!/^[A-Za-z]:[\\/]/.test(value)) return value;
  if (/[\\/]$/.test(value)) {
    console.warn(`[check] note: "${value}" was rewritten by the shell — using "/"`);
    return "/";
  }
  const segment = value.split(/[\\/]/).pop() ?? "";
  console.warn(`[check] note: ${value} was rewritten by the shell — using "/${segment}"`);
  return `/${segment}`;
}

export function pathList(raw) {
  return String(raw)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(recoverShellPath)
    .map((value) => (value.startsWith("/") ? value : `/${value}`));
}

export function widthList(raw) {
  return String(raw)
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value >= 200);
}

/** Candidate executables, most specific first. `*_CHECK_CHROME` wins. */
export function findBrowser(envName) {
  const explicit = process.env[envName];
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

/** Minimal CDP client: one socket, session-scoped commands, 30s per call. */
export function connect(url, verbose = false) {
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
          if (verbose) console.log(`  · ${method} ${Date.now() - started}ms`);
          resolve(value);
        },
        reject,
        timer,
      });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  /** Evaluate in the page and return the value, throwing on an in-page error. */
  async function evaluate(sessionId, expression, awaitPromise = false) {
    const { result, exceptionDetails } = await send(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise },
      sessionId,
    );
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text ?? "in-page error");
    }
    return result?.value;
  }

  return { ready, send, evaluate, close: () => socket.close() };
}

/**
 * Launch headless Chrome with a throwaway profile and hand back a CDP client.
 * Returns `null` (after printing why) when the endpoint never appears.
 */
export async function launch(browser, verbose = false) {
  const profile = mkdtempSync(path.join(tmpdir(), "lamp-check-"));
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
    console.error(`[check] ${error.message}`);
    return null;
  });

  const stop = () => {
    child.kill();
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Windows keeps a handle on the crashpad files for a moment; the temp
      // dir is disposable and the OS reclaims it.
    }
  };

  if (!endpoint) {
    stop();
    return null;
  }

  const cdp = connect(endpoint, verbose);
  await cdp.ready;
  return { cdp, stop };
}

/**
 * Open a page session with a normal desktop UA.
 *
 * `HeadlessChrome` in the UA is what makes some edge networks serve a bot
 * challenge instead of the page; keeping it out leaves these as layout tests.
 */
export async function openPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send(
    "Network.setUserAgentOverride",
    {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/131.0.0.0 Safari/537.36",
    },
    sessionId,
  );
  return sessionId;
}

/**
 * Poll an expression until `check(value)` returns "ok" (or "stop" to bail).
 *
 * Used instead of `document.readyState === "complete"`, which never settles on
 * a page with ad iframes even though the markup being measured has been there
 * for seconds.
 */
export async function poll(cdp, sessionId, expression, check, { timeoutMs = 25_000, verbose = false } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = String(await cdp.evaluate(sessionId, expression));
      const verdict = check(last);
      if (verbose && verdict !== "wait") console.log(`  poll: ${last}`);
      if (verdict === "ok") return { ok: true, value: last };
      if (verdict === "stop") return { ok: false, value: last, stopped: true };
    } catch {
      // Execution context destroyed mid-navigation; ask again on the new one.
    }
    await sleep(250);
  }
  return { ok: false, value: last };
}
