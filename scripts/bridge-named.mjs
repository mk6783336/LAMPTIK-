#!/usr/bin/env node
/**
 * `npm run bridge:named` — host the yt-dlp bridge behind the STABLE Cloudflare
 * named tunnel instead of a Quick Tunnel.
 *
 * Quick tunnels get a new `*.trycloudflare.com` hostname on every restart, and
 * production has to follow it: that is how the site ended up pointing at a
 * hostname that no longer exists. This runs tunnel `lamptik-bridge`
 * (`1914e86b-…`), whose public hostname is fixed at `bridge.lamptik.online`
 * and written once into Netlify.
 *
 *   npm run bridge:named                # start bridge + named tunnel
 *   npm run bridge:named -- --write-env # also update .env.local
 *
 * Requirements, checked before anything is spawned:
 *   1. `~/.cloudflared/<tunnel-id>.json` — written by `cloudflared tunnel create`.
 *   2. `bridge.lamptik.online` must resolve. A named tunnel only serves a
 *      hostname inside a Cloudflare zone, so `lamptik.online`'s nameservers
 *      must be Cloudflare's. While they are Netlify's (`dns*.p03.nsone.net`)
 *      this exits with the migration checklist instead of starting a tunnel
 *      that serves nothing — see bridge/DNS-MIGRATION.md.
 *   3. The bridge itself listening on :7860.
 *
 * Unlike the Quick Tunnel path this never publishes a new URL: the hostname is
 * constant, so no Netlify environment change and no rebuild is needed.
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve4 } from "node:dns/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const PORT = process.env.BRIDGE_PORT ?? "7860";
const TUNNEL = process.env.BRIDGE_TUNNEL_NAME ?? "lamptik-bridge";
const TUNNEL_ID = process.env.BRIDGE_TUNNEL_ID ?? "1914e86b-9d47-49e8-870f-6a793835641b";
const HOSTNAME = process.env.BRIDGE_TUNNEL_HOSTNAME ?? "bridge.lamptik.online";
const WRITE_ENV = process.argv.includes("--write-env");
const SCRATCH = join(ROOT, ".scratch");
const CONFIG = join(SCRATCH, "cloudflared-bridge.yml");
const ENV_FILE = join(ROOT, ".env.local");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(lines) {
  console.error(`\n✖ ${Array.isArray(lines) ? lines.join("\n  ") : lines}\n`);
  process.exit(1);
}

function findCloudflared() {
  const candidates = [
    process.env.CLOUDFLARED_PATH,
    join(SCRATCH, "cloudflared.exe"),
    join(SCRATCH, "cloudflared"),
    "cloudflared",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (!existsSync(candidate)) continue;
    }
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // not this one
    }
  }
  return null;
}

function writeEnvValue(key, value) {
  const original = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const lines = original.split(/\r?\n/);
  const index = lines.findIndex((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, `${lines.join("\n").replace(/\n+$/, "")}\n`);
}

async function bridgeHealthy() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/health`, {
      signal: AbortSignal.timeout(4_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// --- precondition 1: credentials -------------------------------------------
const credentials = process.env.CLOUDFLARED_CREDENTIALS ?? join(homedir(), ".cloudflared", `${TUNNEL_ID}.json`);
if (!existsSync(credentials)) {
  fail([
    `no tunnel credentials at ${credentials}`,
    `create them once:  cloudflared tunnel login && cloudflared tunnel create ${TUNNEL}`,
  ]);
}

// --- precondition 2: the hostname must resolve ------------------------------
try {
  await resolve4(HOSTNAME);
} catch {
  let zoneNameservers = "(unknown)";
  try {
    zoneNameservers = execFileSync("nslookup", ["-type=NS", "lamptik.online", "1.1.1.1"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .filter((line) => /nameserver/i.test(line))
      .map((line) => line.split("=").at(-1)?.trim())
      .filter(Boolean)
      .join(", ");
  } catch {
    // keep the placeholder
  }
  fail([
    `${HOSTNAME} does not resolve, so the named tunnel would serve nothing.`,
    `lamptik.online nameservers: ${zoneNameservers}`,
    "",
    "A Cloudflare Tunnel only serves a hostname inside a Cloudflare zone. The",
    "tunnel, its credentials and the DNS route already exist — what is missing",
    "is authoritative DNS, which is a nameserver change at the registrar:",
    "  1. Cloudflare → lamptik.online → Overview: confirm the zone still lists",
    "     the imported records (A @, CNAME www, MX ×5, TXT SPF + google-site).",
    "  2. Namecheap → Domain → Nameservers → Custom DNS: set the two",
    "     *.ns.cloudflare.com hosts. Do NOT use the Netlify ones.",
    "  3. Wait for the zone to show Active, then rerun this command.",
    "",
    "See bridge/DNS-MIGRATION.md for the full checklist and rollback.",
  ]);
}

// --- precondition 3: the bridge itself --------------------------------------
if (!(await bridgeHealthy())) {
  fail(`the bridge is not answering http://127.0.0.1:${PORT}/health — start it first (npm run bridge:tunnel starts both).`);
}

const cloudflared = findCloudflared();
if (!cloudflared) {
  fail("cloudflared was not found — set CLOUDFLARED_PATH or keep it at .scratch/cloudflared.exe.");
}

// --- run -------------------------------------------------------------------
mkdirSync(SCRATCH, { recursive: true });
writeFileSync(
  CONFIG,
  [
    `# generated by scripts/bridge-named.mjs — ${TUNNEL} → http://127.0.0.1:${PORT}`,
    `tunnel: ${TUNNEL_ID}`,
    `credentials-file: ${credentials.replace(/\\/g, "/")}`,
    "ingress:",
    `  - hostname: ${HOSTNAME}`,
    `    service: http://127.0.0.1:${PORT}`,
    "  - service: http_status:404",
    "",
  ].join("\n"),
);

// HTTP/2 rather than QUIC: residential ISPs drop UDP often enough that QUIC
// dies with "no recent network activity", which is what rotates the tunnel.
const child = spawn(
  cloudflared,
  ["tunnel", "--protocol", "http2", "--no-autoupdate", "--config", CONFIG, "run", TUNNEL],
  { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] },
);
const shutdown = () => {
  if (!child.killed) child.kill("SIGTERM");
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const publicUrl = `https://${HOSTNAME}`;
console.log(`→ waiting for ${publicUrl}/health`);
for (let i = 0; i < 30; i += 1) {
  try {
    const response = await fetch(`${publicUrl}/health`, { signal: AbortSignal.timeout(5_000) });
    if (response.ok) {
      console.log(`✓ named tunnel healthy at ${publicUrl} (hostname is permanent)`);
      if (WRITE_ENV) {
        writeEnvValue("YTDLP_BRIDGE_URL", publicUrl);
        console.log(`✓ wrote YTDLP_BRIDGE_URL to ${ENV_FILE}`);
      }
      console.log(`\n  set this once in Netlify → YTDLP_BRIDGE_URL=${publicUrl}\n`);
      process.exit(0);
    }
  } catch {
    // still connecting
  }
  await sleep(2_000);
}

shutdown();
fail(`${publicUrl} never answered /health within 60s — check the cloudflared output above.`);
