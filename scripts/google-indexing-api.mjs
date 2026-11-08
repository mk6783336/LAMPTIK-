#!/usr/bin/env node
/**
 * Push URLs into Google's Indexing API and IndexNow.
 *
 * Run:  node scripts/google-indexing-api.mjs [--limit 20] [--only reels-audio] [--dry]
 *
 * Auth: the Search Console / GA4 service account already in the repo
 * (`GOOGLE_APPLICATION_CREDENTIALS`, default `.scratch/ga4-key.json`) with the
 * `https://www.googleapis.com/auth/indexing` scope. No new secret is needed.
 *
 * Read this before trusting the output:
 *
 * The Indexing API is *documented* for two content types only — JobPosting and
 * BroadcastEvent. Google's own reference says it does not cover the rest of the
 * web. Pushing ordinary pages is therefore not a supported use: some URLs are
 * accepted and crawled, most are ignored, and a project that leans on it is
 * leaning on an undocumented behaviour. It is kept here because it costs one
 * request per URL and occasionally nudges a fresh page, not because it replaces
 * sitemap + internal links + time. IndexNow (Bing/Yandex) has no such limit and
 * is the reliable half of this script.
 *
 * The API also has to be ENABLED on the Cloud project before any request
 * succeeds. When it is not, Google answers 403 SERVICE_DISABLED and the exact
 * one-click console URL is printed below — that link is the fix, not a retry.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SITE = process.env.SITE_ORIGIN?.trim() || "https://www.lamptik.online";
const SCOPE = "https://www.googleapis.com/auth/indexing";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const DRY = flag("dry");
const LIMIT = Number(value("limit", "0")) || 0;
const ONLY = (value("only", "") || "").trim();

function log(line = "") {
  process.stdout.write(`${line}\n`);
}

/* ------------------------------- credentials ------------------------------ */

function credentialPath() {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const candidates = [explicit, ".scratch/ga4-key.json", ".scratch/indexing-key.json"].filter(
    Boolean,
  );
  for (const candidate of candidates) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function accessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: SCOPE,
      aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(credentials.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch(credentials.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) {
    throw new Error(
      `Token exchange failed (${response.status}): ${body?.error_description || body?.error || "unknown"}`,
    );
  }
  return body.access_token;
}

/* ---------------------------------- URLs ---------------------------------- */

async function sitemapUrls() {
  const response = await fetch(`${SITE}/sitemap.xml`, { headers: { "User-Agent": "lamptik-indexer" } });
  if (!response.ok) throw new Error(`sitemap ${response.status}`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  return [...new Set(urls)];
}

function pick(urls) {
  let list = urls;
  if (ONLY) list = list.filter((url) => url.includes(ONLY));
  if (LIMIT > 0) list = list.slice(0, LIMIT);
  return list;
}

/* --------------------------------- Google --------------------------------- */

function enableUrl(projectId) {
  const project = projectId || "YOUR_PROJECT_ID";
  return `https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=${project}`;
}

/** Google reports SERVICE_DISABLED inside a nested error detail. */
function disabledDetails(body) {
  const error = body?.error ?? {};
  const details = Array.isArray(error.details) ? error.details : [];
  for (const detail of details) {
    if (detail?.reason === "SERVICE_DISABLED" || detail?.["@type"]?.includes("ErrorInfo")) {
      const metadata = detail.metadata ?? {};
      return {
        disabled: detail.reason === "SERVICE_DISABLED" || Boolean(metadata.service),
        project: metadata.consumer || metadata.service?.split("/").pop() || null,
        activation: metadata.activationUrl || null,
      };
    }
  }
  return { disabled: error.status === "PERMISSION_DENIED", project: null, activation: null };
}

async function googlePush(urls, token) {
  const results = { ok: 0, failed: 0, disabled: null };
  for (const url of urls) {
    if (DRY) {
      log(`  [dry] ${url}`);
      continue;
    }
    const response = await fetch(PUBLISH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      results.ok += 1;
      log(`  ok    ${url}`);
    } else {
      results.failed += 1;
      const details = disabledDetails(body);
      if (details.disabled && !results.disabled) {
        results.disabled = {
          activation: details.activation || enableUrl(details.project),
          project: details.project,
        };
      }
      log(
        `  ${response.status}   ${url} — ${
          body?.error?.message?.split("\n")[0] || "no body"
        }`,
      );
    }
    // Be a polite client; the quota is shared with the token exchange.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return results;
}

/* -------------------------------- IndexNow -------------------------------- */

function indexNowKey() {
  const fromEnv = process.env.INDEXNOW_KEY?.trim();
  if (fromEnv) return { key: fromEnv, location: null };
  const publicDir = path.resolve(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) return null;
  for (const entry of fs.readdirSync(publicDir)) {
    if (!/^[a-f0-9]{32}\.txt$/i.test(entry)) continue;
    const key = entry.replace(/\.txt$/i, "");
    const body = fs.readFileSync(path.join(publicDir, entry), "utf8").trim();
    // The file must contain exactly the key, or the engine rejects the batch.
    if (body === key) return { key, location: `${SITE}/${entry}` };
  }
  return null;
}

async function indexNow(urls, keyInfo) {
  if (DRY) {
    log(`  [dry] IndexNow batch of ${urls.length}`);
    return true;
  }
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: keyInfo.key,
      ...(keyInfo.location ? { keyLocation: keyInfo.location } : {}),
      urlList: urls,
    }),
  });
  log(`  IndexNow ${response.status} ${response.statusText} (${urls.length} URLs)`);
  if (response.status === 403) {
    log("  → 403: the key file must be publicly reachable at the keyLocation above.");
  }
  return response.ok;
}

/* ---------------------------------- main ---------------------------------- */

async function main() {
  log(`Google Indexing API + IndexNow — ${SITE}`);
  const urls = pick(await sitemapUrls());
  if (urls.length === 0) {
    log("No URLs matched the filter.");
    process.exitCode = 1;
    return;
  }
  log(`\n${urls.length} URL(s) selected${ONLY ? ` matching "${ONLY}"` : ""}.\n`);

  let googleOk = 0;
  let googleFailed = 0;
  const keyFile = credentialPath();

  if (!keyFile) {
    log("No service-account key found.");
    log("Set GOOGLE_APPLICATION_CREDENTIALS to the JSON key, then run again.");
  } else {
    const credentials = JSON.parse(fs.readFileSync(keyFile, "utf8"));
    log(`Google: ${credentials.client_email}`);
    try {
      const token = await accessToken(credentials);
      const results = await googlePush(urls, token);
      googleOk = results.ok;
      googleFailed = results.failed;
      if (results.disabled) {
        log("\nThe Web Search Indexing API is not enabled on this Cloud project.");
        log(`Project: ${results.disabled.project || "(unknown)"}`);
        log(`Enable it here, then re-run: ${results.disabled.activation}`);
        log("(Enable the API → wait ~2 minutes for propagation → run this script again.)");
      }
    } catch (error) {
      googleFailed = urls.length;
      log(`Google auth failed: ${error.message}`);
    }
    log(`\nGoogle: ${googleOk} accepted, ${googleFailed} rejected.`);
    if (googleFailed > 0 && googleOk === 0) {
      log("Read the header of this script: the Indexing API is documented for");
      log("JobPosting and BroadcastEvent only. Rejections here are expected for");
      log("ordinary pages, and are not a sign the site is broken.");
    }
  }

  log("");
  const keyInfo = indexNowKey();
  if (!keyInfo) {
    log("IndexNow: no key found.");
    log("Create public/<32-hex-key>.txt containing exactly that key (and set");
    log("INDEXNOW_KEY if you prefer env), then re-run. Bing/Yandex need it.");
  } else {
    log(`IndexNow: key ${keyInfo.key.slice(0, 6)}…`);
    const ok = await indexNow(urls, keyInfo);
    if (!ok) process.exitCode = 1;
  }

  log("\nDone. Sitemap, internal links and time still do the real work.");
}

main().catch((error) => {
  log(`Fatal: ${error.message}`);
  process.exitCode = 1;
});
