#!/usr/bin/env node
/**
 * `npm run bridge:tunnel` — the zero-account way to host the yt-dlp bridge.
 *
 * Starts `bridge/app.py` on this machine and exposes it through a free
 * Cloudflare Quick Tunnel, then prints the two environment variables to paste
 * into Vercel. The bridge resolves YouTube from the residential IP that
 * actually gets a player response, and proxies the media bytes itself, so
 * Vercel never has to reach an IP-bound googlevideo URL.
 *
 *   npm run bridge:tunnel                 # print the Vercel variables
 *   npm run bridge:tunnel -- --write-env  # also update .env.local
 *
 * Keep this process (and the PC) awake while the site is live: when the tunnel
 * restarts, the trycloudflare URL changes and the Vercel variable must be
 * updated. For a hostname that never changes, deploy `bridge/` to a Docker
 * host — see bridge/README.md.
 */

import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PORT = process.env.BRIDGE_PORT ?? "7860";
const WRITE_ENV = process.argv.includes("--write-env");
const ENV_FILE = join(ROOT, ".env.local");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal `.env.local` reader — no dotenv dependency for a dev script. */
function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

/** Replace (or append) two keys, leaving every other line untouched. */
function writeEnvFile(values) {
  const original = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const lines = original.split(/\r?\n/);
  for (const [key, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
    if (index >= 0) lines[index] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_FILE, `${lines.join("\n").replace(/\n+$/, "")}\n`);
}

function which(command, args = ["--version"]) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findPython() {
  const venvs = [
    join(ROOT, "bridge", ".venv"),
    join(ROOT, ".scratch", "bridge-venv"),
  ];
  const candidates = [];
  for (const venv of venvs) {
    candidates.push(join(venv, "Scripts", "python.exe"), join(venv, "bin", "python"));
  }
  candidates.push("python", "python3");
  for (const candidate of candidates) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (!existsSync(candidate)) continue;
    }
    try {
      execFileSync(candidate, ["-c", "import flask, requests"], { stdio: "ignore" });
      return candidate;
    } catch {
      // missing interpreter or missing deps — try the next one
    }
  }
  return null;
}

function findCloudflared() {
  const candidates = [
    process.env.CLOUDFLARED_PATH,
    join(ROOT, ".scratch", "cloudflared.exe"),
    join(ROOT, ".scratch", "cloudflared"),
    "cloudflared",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (!existsSync(candidate)) continue;
    }
    if (which(candidate)) return candidate;
  }
  return null;
}

async function waitForHealth(url, attempts, intervalMs) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4_000) });
      if (response.ok) return await response.json();
    } catch {
      // not up yet
    }
    await sleep(intervalMs);
  }
  return null;
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const python = findPython();
if (!python) {
  fail(
    "Python with flask + requests was not found.\n" +
      "  cd bridge && py -3 -m venv .venv\n" +
      "  .venv/Scripts/pip install -r requirements.txt   (macOS/Linux: .venv/bin/pip)",
  );
}

const cloudflared = findCloudflared();
if (!cloudflared) {
  fail(
    "cloudflared was not found.\n" +
      "  Download it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n" +
      "  and put it on PATH, or set CLOUDFLARED_PATH=/path/to/cloudflared.",
  );
}

const envLocal = readEnvFile();
const secret = process.env.BRIDGE_SECRET || envLocal.BRIDGE_SECRET || randomBytes(24).toString("hex");

const children = [];
function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`→ starting bridge on :${PORT} (${python})`);
const bridge = spawn(python, [join(ROOT, "bridge", "app.py")], {
  cwd: join(ROOT, "bridge"),
  env: { ...process.env, PORT, BRIDGE_SECRET: secret, PYTHONUNBUFFERED: "1" },
  stdio: ["ignore", "inherit", "inherit"],
});
children.push(bridge);
bridge.on("exit", (code) => {
  if (code !== 0 && code !== null) fail(`bridge exited with code ${code}`);
});

const localHealth = await waitForHealth(`http://127.0.0.1:${PORT}`, 40, 500);
if (!localHealth) fail(`the bridge never answered /health on :${PORT}.`);
console.log(`✓ bridge healthy — yt-dlp ${localHealth.ytdlp}`);

console.log("→ opening a Cloudflare Quick Tunnel");
const tunnel = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${PORT}`], {
  stdio: ["ignore", "pipe", "pipe"],
});
children.push(tunnel);

// cloudflared prints the assigned tunnel inside a banner, and its help/notice
// text also mentions api.trycloudflare.com — so collect every candidate and
// keep the one that actually answers /health.
const candidates = new Set();
const readTunnel = (chunk) => {
  const text = chunk.toString();
  for (const match of text.matchAll(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi)) {
    if (new URL(match[0]).hostname.split(".")[0] !== "api") candidates.add(match[0]);
  }
  if (process.env.BRIDGE_TUNNEL_VERBOSE) process.stderr.write(text);
};
tunnel.stdout.on("data", readTunnel);
tunnel.stderr.on("data", readTunnel);

for (let i = 0; i < 60 && candidates.size === 0; i += 1) await sleep(500);
if (candidates.size === 0) {
  fail(
    "cloudflared could not create a quick tunnel.\n" +
      "  Cloudflare rate-limits quick tunnels per network; wait a few minutes and retry,\n" +
      "  or deploy bridge/ to a permanent Docker host — see bridge/README.md.",
  );
}

console.log("→ waiting for the tunnel to accept traffic");
let publicUrl = null;
for (const candidate of candidates) {
  if (await waitForHealth(candidate, 20, 1_000)) {
    publicUrl = candidate;
    break;
  }
}
if (!publicUrl) {
  publicUrl = [...candidates].at(-1);
  console.warn("⚠ the tunnel has not answered /health yet — using the last printed URL.");
}
console.log(`✓ tunnel ${publicUrl}`);

const variables = {
  YTDLP_BRIDGE_URL: publicUrl,
  BRIDGE_SECRET: secret,
};

console.log(`
──────────────────────────────────────────────────────────────────────
 Paste BOTH into Vercel → Project → Settings → Environment Variables
 (Production + Preview), then redeploy is NOT required for
 YTDLP_BRIDGE_URL — it is read at runtime:

   YTDLP_BRIDGE_URL=${variables.YTDLP_BRIDGE_URL}
   BRIDGE_SECRET=${variables.BRIDGE_SECRET}

 Verify: curl https://www.lamptik.online/api/health
   → "ytdlp": { "bridgeConfigured": true, "bridgeReachable": true }

 Keep this terminal open. The quick-tunnel URL changes on every restart;
 for a permanent hostname deploy bridge/ to a Docker host
 (bridge/README.md) and use its URL instead.
──────────────────────────────────────────────────────────────────────
`);

if (WRITE_ENV) {
  writeEnvFile(variables);
  console.log(`✓ wrote YTDLP_BRIDGE_URL + BRIDGE_SECRET to ${ENV_FILE}\n`);
}
