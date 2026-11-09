#!/usr/bin/env node
/**
 * Re-ping Googlebot through the official Search Console Sitemaps API.
 *
 * Run:  npm run seo:submit
 *
 * Why this instead of the Indexing API: `indexing.googleapis.com` answers 403
 * "Failed to verify the URL ownership" for every ordinary page — it is
 * documented for JobPosting and BroadcastEvent only, and the service account in
 * this repo is not an owner of the property anyway. What that same service
 * account *does* have is `siteFullUser` on `sc-domain:lamptik.online`, which is
 * exactly the permission the Sitemaps API needs:
 *
 *   PUT https://www.googleapis.com/webmasters/v3/sites/{site}/sitemaps/{feed}
 *
 * That call is the real "please look again" a human would trigger by pressing
 * Submit in the Search Console UI, and unlike the Indexing API it is supported
 * for any site. The script then reads the sitemap back and prints what Google
 * recorded — lastDownloaded, lastSubmitted, warnings, errors — so a 200 here is
 * never mistaken for "Google has crawled and indexed these pages".
 *
 * Scope + credential: `https://www.googleapis.com/auth/webmasters`, minted from
 * the same service-account JSON the GSC/GA4 scripts use
 * (`GOOGLE_APPLICATION_CREDENTIALS`, default `.scratch/ga4-key.json`).
 *
 * Exit codes: 0 = submitted and read back, 1 = auth/permission/transport error.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SITE = (process.env.GSC_SITE ?? "https://www.lamptik.online/").replace(/\/?$/, "/");
const FEED = (process.env.GSC_FEED ?? `${SITE}sitemap.xml`).replace(/\/?$/, "/");
const SCOPE = "https://www.googleapis.com/auth/webmasters";
const API = "https://www.googleapis.com/webmasters/v3";

const log = (...parts) => console.log("[gsc]", ...parts);

function credentialPath() {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  for (const candidate of [explicit, ".scratch/ga4-key.json", ".scratch/indexing-key.json"]) {
    if (!candidate) continue;
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

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
      `token exchange failed (${response.status}): ${body?.error_description || body?.error || "unknown"}`,
    );
  }
  return body.access_token;
}

/** Search Console wants the site and feed percent-encoded inside the path. */
const encode = (value) => encodeURIComponent(value);

async function main() {
  const keyFile = credentialPath();
  if (!keyFile) {
    log("no service-account key found — set GOOGLE_APPLICATION_CREDENTIALS");
    process.exitCode = 1;
    return;
  }

  const credentials = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  log(`service account ${credentials.client_email}`);
  const token = await accessToken(credentials);
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // 1. Prove the account can see the property before asking it to submit.
  const sitesResponse = await fetch(`${API}/sites`, { headers });
  const sites = await sitesResponse.json().catch(() => ({}));
  const entries = sites.siteEntry ?? [];
  log(
    `properties: ${entries.map((entry) => `${entry.siteUrl} [${entry.permissionLevel}]`).join(", ") || "none"}`,
  );
  const property = entries.find((entry) => entry.siteUrl === SITE.replace(/\/$/, "")) ?? entries[0];
  if (!property) {
    log("the service account has no Search Console property — nothing to submit to");
    process.exitCode = 1;
    return;
  }
  if (property.permissionLevel && !/Full|Owner/i.test(property.permissionLevel)) {
    log(`permission is ${property.permissionLevel}; sitemaps.PUT needs Full or Owner`);
    process.exitCode = 1;
    return;
  }

  // 2. The submit itself. 200/204 = accepted, and it is safe to repeat.
  const putUrl = `${API}/sites/${encode(property.siteUrl)}/sitemaps/${encode(FEED)}`;
  const put = await fetch(putUrl, { method: "PUT", headers });
  log(`PUT sitemap → HTTP ${put.status} ${put.statusText} (${FEED})`);

  // 3. Read back what Google recorded, so the report cannot overstate it.
  const getResponse = await fetch(putUrl, { headers });
  const entry = await getResponse.json().catch(() => ({}));
  if (getResponse.ok) {
    log(`sitemap entry (HTTP ${getResponse.status}):`);
    log(`  path            ${entry.path ?? FEED}`);
    log(`  lastSubmitted   ${entry.lastSubmitted ?? "—"}`);
    log(`  lastDownloaded  ${entry.lastDownloaded ?? "—"}`);
    log(`  warnings        ${entry.warnings ?? 0}   errors ${entry.errors ?? 0}`);
    log(`  contents        ${(entry.contents ?? []).map((part) => `${part.type}:${part.submitted}`).join(", ") || "—"}`);
    log("A 200 here means Google accepted the sitemap; indexing is a separate, later step.");
  } else {
    log(`read-back failed: HTTP ${getResponse.status} ${JSON.stringify(entry).slice(0, 200)}`);
  }

  if (!put.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[gsc] failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
