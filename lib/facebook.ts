import { AppError } from "@/lib/errors";
import { runWaterfall, WATERFALL_TIMEOUT_MS } from "@/lib/load-balancer";
import {
  cleanCaption,
  DEFAULT_TIMEOUT_MS,
  DESKTOP_UA,
  MOBILE_UA,
  timedFetch,
  withTimeoutSignal,
} from "@/lib/http";
import { probeMp4, type Mp4Probe } from "@/lib/mp4";
import type { VideoCodec } from "@/lib/tiktok/types";
import { hostMatches } from "@/lib/url-guard";

/**
 * Facebook extractor built for long & large videos (100MB–1GB+):
 *
 *  1. Short-link resolver — safely follows fb.watch / share/v redirects
 *     server-side (max 5 hops, every hop must stay on Facebook hosts).
 *  2. Multi-source stream parser — desktop + mobile UA profiles against both
 *     modern and legacy JSON payloads:
 *       playable_url_quality_hd / browser_native_hd_url / hd_src /
 *       hd_src_no_ratelimit (HD) and playable_url / browser_native_sd_url /
 *       sd_src (SD), plus embedded DASH progressive MP4 nodes.
 *  3. Full escape decoding (\\u0025, \\u0026, \\/) so signed fbcdn.net query
 *     tokens stay intact.
 */

const FACEBOOK_HOST_SUFFIXES = ["facebook.com", "fb.watch", "fbcdn.net"] as const;

const DESKTOP_PROFILE = DESKTOP_UA;
/** Mobile profile gets m./mbasic. mirrors in a second pass. */
const MOBILE_PROFILE = MOBILE_UA;

const MAX_REDIRECT_HOPS = 5;

/** Backoff before the single transient-throttle retry (see below). */
const TRANSIENT_RETRY_DELAY_MS = 1_200;

/**
 * Transient-throttle tolerance: Facebook answers bot-like TLS stacks with
 * `400`/`429` in bursts, then serves the identical request seconds later
 * (verified live: `400` → `200` + canonical after a short cooldown). One
 * retry after a short backoff per request; a second failure (or any other
 * status) flows through the normal handling, so behavior is unchanged when
 * unthrottled. Network-level throws get the same single retry unless the
 * client already disconnected.
 */
async function fetchWithTransientRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<Response> {
  const attempt = () => timedFetch(url, { ...init, signal }, timeoutMs);
  try {
    const first = await attempt();
    if (first.status !== 400 && first.status !== 429) return first;
    await first.body?.cancel().catch(() => undefined);
  } catch (error) {
    if (signal.aborted) throw error;
  }
  // NOTE: this timer must stay ref'd (no `unref`) — the backoff sleep is the
  // actual work here, and an unref'd timer lets the runtime exit (or recycle
  // the handler) before the retry fires.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS);
  });
  if (signal.aborted) throw new AppError("PROVIDER_UNAVAILABLE", "Request cancelled.");
  return attempt();
}

export interface FacebookSource {
  id: string;
  canonicalUrl: string;
  title: string;
  author: string;
  thumbnail: string | null;
  duration: number;
  videoHd: string | null;
  videoSd: string | null;
  /** Sizes from the MP4 probe (null when the CDN hid them). */
  videoHdBytes?: number | null;
  videoSdBytes?: number | null;
  /** Codec of the chosen HD stream. */
  codec?: VideoCodec;
}

function isFacebookHost(hostname: string): boolean {
  return FACEBOOK_HOST_SUFFIXES.some((suffix) => hostMatches(hostname, suffix));
}

function isUsableUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!/^https:\/\//.test(cleaned)) return null; // kills blob: and relative junk
  if (cleaned.length > 4_096) return null;
  // DASH segments and manifest fragments are video-only: they download as an
  // MP4 with no audio and freeze mid-playback in phone galleries.
  if (/\.m4s(?:[?#]|$)|bytestart=|byteend=|dash_manifest|dash_info/i.test(cleaned)) {
    return null;
  }
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!isFacebookHost(url.hostname)) return null; // only fb-owned CDNs
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Decode `\/`, `\u0026`, `\u0025` … escapes so signed tokens survive.
 * `&amp;` is decoded too: URLs scraped from HTML-escaped contexts (meta
 * tags, plugin embeds) carry it, and a signed fbcdn token with a literal
 * `&amp;` 403s.
 */
function decodeEscapes(input: string): string {
  return input
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, "&");
}

/**
 * Every usable URL for Facebook's stream keys, in key priority order.
 * Facebook often publishes several HD renditions (H.264 + VP9-in-MP4); the
 * first is not necessarily the one a phone can play, so all of them are
 * collected and probed instead of trusting the first match.
 */
function pickSources(decodedHtml: string, keys: string[]): string[] {
  const urls: string[] = [];

  for (const key of keys) {
    const pattern = new RegExp(`"${key}"\\s*:\\s*"(https:[^"]+)"`, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(decodedHtml)) !== null) {
      const url = isUsableUrl(match[1]);
      if (url && !urls.includes(url)) urls.push(url);
      if (urls.length >= 4) return urls;
    }
  }

  return urls;
}

interface ChosenStream {
  url: string;
  /** `null` when the CDN refused the probe and the URL is used unverified. */
  probe: Mp4Probe | null;
}

/** Codecs that stutter, freeze, or show black in phone galleries. */
const INCOMPATIBLE_CODECS = new Set(["hevc", "av1", "vp9", "vp8"]);

function chooseUniversalStream(
  urls: string[],
  probes: Array<Mp4Probe | null>,
): ChosenStream | null {
  let unverified: ChosenStream | null = null;
  let lateMoov: ChosenStream | null = null;

  for (let index = 0; index < urls.length; index += 1) {
    const probe = probes[index] ?? null;
    if (!probe || !probe.reachable) continue;
    if (INCOMPATIBLE_CODECS.has(probe.codec)) continue;
    if (probe.hasAudio === false) continue;

    // Explicit H.264 + audio is the universal choice; a late-moov acceptance
    // (valid ftyp + video/mp4, Facebook progressive with the moov at the
    // tail) beats a bare `unknown` verdict.
    if (probe.codec === "h264") return { url: urls[index], probe };
    if (probe.lateMoovAccepted) lateMoov ??= { url: urls[index], probe };
    else unverified ??= { url: urls[index], probe };
  }

  if (lateMoov) return lateMoov;

  // Every probe was blocked by the CDN: keep the first candidate so a
  // download is still possible, but leave the codec unlabelled.
  if (urls.length > 0 && probes.every((probe) => !probe || !probe.reachable)) {
    return { url: urls[0], probe: null };
  }

  return unverified;
}

/** Page slug from a Facebook video URL (`/cnn/videos/…` → "cnn"). */
function authorFromPath(url: string): string | null {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean)[0];
    if (!segment) return null;
    if (
      /^(?:videos?|reels?|watch|share|groups?|people|plugins|permalink\.php|story\.php|video\.php|photo(?:\.php)?)$/i.test(
        segment,
      )
    ) {
      return null;
    }
    const cleaned = decodeURIComponent(segment).replace(/[._-]+/g, " ").trim();
    return cleaned || null;
  } catch {
    return null;
  }
}

const HD_KEYS = [
  "playable_url_quality_hd",
  "browser_native_hd_url",
  "hd_src_no_ratelimit",
  "hd_src",
];
const SD_KEYS = [
  "browser_native_sd_url",
  "playable_url",
  "sd_src_no_ratelimit",
  "sd_src",
];

/**
 * Extract a video id from every supported Facebook URL shape:
 * /videos/123, /reel/123, watch?v=123, story.php?story_fbid=, /share/v/…,
 * /share/r/… (reel shares), /v/123, fb.watch/….
 */
export function parseFacebookUrl(raw: string): { id: string | null; canonicalUrl: string; isShort: boolean } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!isFacebookHost(url.hostname)) return null;

  const path = url.pathname;
  const id =
    path.match(/\/videos\/(?:[^/]*\/)?(\d{5,})/)?.[1] ??
    path.match(/\/reel\/(?:[^/]*\/)?(\d{5,})/)?.[1] ??
    path.match(/^\/v\/(\d{5,})/)?.[1] ??
    path.match(/\/share\/v\/([^/?#]+)/)?.[1] ??
    path.match(/\/share\/r\/([^/?#]+)/)?.[1] ??
    url.searchParams.get("v") ??
    url.searchParams.get("story_fbid") ??
    null;

  const isShort =
    hostMatches(url.hostname, "fb.watch") ||
    /\/share\/[vr]\//.test(path) ||
    !id;

  return { id, canonicalUrl: url.toString(), isShort };
}

/**
 * Follow redirects manually (max 5 hops). Every hop must stay inside
 * Facebook-owned hosts — anything else aborts (SSRF guard for short links).
 */
/**
 * Pull the canonical video/reel target out of a `200 OK` share-page
 * document, in signal priority order:
 *
 *  1. `<link rel="canonical" href="…">` (usually `/reel/<numeric_id>`).
 *  2. `<meta property="og:url" content="…">` (same shape, either order).
 *  3. `<meta http-equiv="refresh" content="0;url=…">`.
 *  4. Embedded JSON ids (`"video_id"` / `"reel_id"`) → built reel URL.
 *
 * Returns `null` when nothing usable is found, or when the only candidate
 * is the page itself / a login gate (following those loops or dead-ends).
 */
/**
 * Unwrap a `refresh` response header (`0; URL=fb://fullscreen_video/<id>`
 * or an https reel/videos URL) into a followable canonical URL.
 */
function targetFromRefreshHeader(value: string | null): URL | null {
  if (!value) return null;
  const urlPart = value
    .match(/url\s*=\s*(.+?)\s*$/i)?.[1]
    ?.replace(/^["']|["'];?$/g, "");
  if (!urlPart) return null;
  const idMatch = urlPart.match(/(\d{5,})/);
  if (/^fb:\/\//i.test(urlPart)) {
    return idMatch?.[1] ? new URL(`https://www.facebook.com/reel/${idMatch[1]}/`) : null;
  }
  try {
    const next = new URL(urlPart);
    if (next.protocol === "https:" && isFacebookHost(next.hostname)) return next;
  } catch {
    return null;
  }
  return null;
}

async function canonicalTargetFromHtml(response: Response, base: URL): Promise<URL | null> {
  const html = await response.text();
  if (!html || html.length < 64) return null;

  const document = html.length > 1_000_000 ? html.slice(0, 1_000_000) : html;
  const candidates: Array<string | undefined> = [
    document.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1],
    document.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1],
    document.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1],
    document.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i)?.[1],
    document.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*?url=([^"'\s>]+)/i)?.[1],
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    let next: URL;
    try {
      next = new URL(raw.replace(/&amp;/g, "&"), base);
    } catch {
      continue;
    }
    if (next.protocol !== "https:" || !isFacebookHost(next.hostname)) continue;
    // Same page or a login/registration gate: not a video target.
    if (next.pathname === base.pathname) continue;
    if (/^\/(login|reg|checkpoint)/i.test(next.pathname)) continue;
    return next;
  }

  const idMatch = document.match(/"(?:video_id|reel_id|videoID)"\s*:\s*"?(\d{5,})"?/);
  if (idMatch?.[1]) {
    return new URL(`https://www.facebook.com/reel/${idMatch[1]}/`);
  }
  return null;
}

async function resolveRedirects(startUrl: string, signal: AbortSignal): Promise<string> {
  let current = new URL(startUrl);
  // Share-link host ladder: `www.facebook.com/share/…` answers bot-like TLS
  // stacks (undici, HTTP/1.1) with a bare 400 on every attempt, while the
  // legacy hosts serve the identical path (`m`: 200 + canonical/refresh,
  // `mbasic`: 302 to the reel). Share links therefore START on `m` and
  // walk down the ladder one rung per terminal hop instead of burning
  // requests against www.
  const SHARE_HOSTS = ["m.facebook.com", "mbasic.facebook.com"] as const;
  const triedShareHosts = new Set<string>();
  if (/\/share\//i.test(current.pathname)) {
    triedShareHosts.add(current.hostname.toLowerCase());
    if (!((SHARE_HOSTS as readonly string[]).includes(current.hostname.toLowerCase()))) {
      current.hostname = SHARE_HOSTS[0];
    }
  }
  // Share links (fb.watch, /share/v, /share/r) are minted for phones:
  // Facebook's redirect chain serves the mobile path, so unwrap them with
  // the realistic iPhone profile from the task spec.
  const profile =
    hostMatches(current.hostname, "fb.watch") || /\/share\/[vr]\//.test(current.pathname)
      ? MOBILE_PROFILE
      : DESKTOP_PROFILE;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    // NOTE: no `Sec-Fetch-*` / `Upgrade-Insecure-Requests` headers here.
    // Verified live: undici (HTTP/1.1) requests carrying browser-navigation
    // fetch-metadata get a bare 400 from Facebook's edge, while the
    // identical request with only UA + Accept-Language + Accept returns
    // 200 with the canonical reel. (curl over HTTP/2 is trusted either
    // way, which is why this only reproduces from Node.)
    const response = await fetchWithTransientRetry(
      current.toString(),
      {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          "User-Agent": profile,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      },
      10_000,
      signal,
    );

    const location = response.headers.get("location");

    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel().catch(() => undefined);
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new AppError("UPSTREAM_ERROR", "Facebook returned a malformed redirect.");
      }
      if (next.protocol !== "https:" || !isFacebookHost(next.hostname)) {
        throw new AppError("BAD_REQUEST", "That short link left Facebook's domain.");
      }
      // A hop that points at itself (login bounce, canonical echo) is
      // terminal, not a redirect — following it spins until the hop budget
      // throws "too many times" for a perfectly good URL.
      if (next.toString() === current.toString()) {
        return current.toString();
      }
      current = next;
      continue;
    }

    // Facebook often answers /share/r and /share/v with `200 OK` HTML
    // instead of a 3xx (it renders the reel inline or behind a JS gate).
    // Unwrap the canonical target embedded in the document and follow it;
    // without this the resolver parses the share slug itself and finds no
    // numeric id or stream.
    if (response.status === 200 && (response.headers.get("content-type") ?? "").includes("html")) {
      const target = await canonicalTargetFromHtml(response, current).catch(() => null);
      if (target) {
        // The reel page echoes its own URL via canonical + `refresh`
        // header on every hop — a self-target is terminal (see above).
        if (target.toString() === current.toString()) {
          await response.body?.cancel().catch(() => undefined);
          return current.toString();
        }
        current = target;
        continue;
      }
      // No canonical in the document: fall through to the refresh-header
      // / mirror checks below instead of giving up on the slug.
    }

    // `refresh: 0; URL=fb://fullscreen_video/<id>` response header — the
    // header twin of a meta refresh, one hop earlier than parsing HTML.
    const refreshTarget = targetFromRefreshHeader(response.headers.get("refresh"));
    if (refreshTarget && refreshTarget.toString() !== current.toString()) {
      await response.body?.cancel().catch(() => undefined);
      current = refreshTarget;
      continue;
    }

    // Next rung down the share-link host ladder (see above): same slug,
    // next legacy host. Each host is tried at most once; when the ladder is
    // exhausted the slug is terminal and parsing runs on it.
    if (/\/share\//i.test(current.pathname)) {
      const nextHost = SHARE_HOSTS.find((host) => !triedShareHosts.has(host));
      if (nextHost) {
        triedShareHosts.add(nextHost);
        await response.body?.cancel().catch(() => undefined);
        const mirror = new URL(current.toString());
        mirror.hostname = nextHost;
        current = mirror;
        continue;
      }
    }

    await response.body?.cancel().catch(() => undefined);
    // Terminal hop: the final URL is where parsing runs.
    return current.toString();
  }

  throw new AppError(
    "UPSTREAM_ERROR",
    "Facebook's short link redirected too many times.",
    "Open the video in Facebook and copy the full URL.",
  );
}

interface PageAttempt {
  url: string;
  userAgent: string;
}

function buildAttempts(finalUrl: string): PageAttempt[] {
  const parsed = new URL(finalUrl);
  const desktop = finalUrl;
  const mobile = finalUrl.replace(
    `${parsed.protocol}//${parsed.hostname}`,
    "https://m.facebook.com",
  );
  const basic = finalUrl.replace(
    `${parsed.protocol}//${parsed.hostname}`,
    "https://mbasic.facebook.com",
  );
  // The oEmbed-style plugin endpoint renders a lightweight embed document
  // that frequently still carries `playable_url` when the full page is a
  // login-walled JS shell.
  const plugin = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(finalUrl)}`;
  return [
    { url: desktop, userAgent: DESKTOP_PROFILE },
    { url: mobile, userAgent: MOBILE_PROFILE },
    { url: basic, userAgent: MOBILE_PROFILE },
    { url: plugin, userAgent: DESKTOP_PROFILE },
  ];
}

async function fetchPage(target: PageAttempt, signal: AbortSignal): Promise<string | null> {
  try {
    // Same no-fetch-metadata rule as the redirect hops (see above):
    // `Sec-Fetch-*` over undici HTTP/1.1 earns a bare 400.
    const response = await fetchWithTransientRetry(
      target.url,
      {
        headers: {
          "User-Agent": target.userAgent,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
        redirect: "follow",
      },
      12_000,
      signal,
    );
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

/** Decode HTML entities (`&#xb7;`, `&#064;`, `&amp;` …) in parsed titles. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16) || 63),
    )
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec) || 63))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`property=["']${property}["']\\s+content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["']\\s+property=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Resolve a Facebook video URL (any supported shape) into HD + SD raw CDN
 * streams. Bounded by a 12-second metadata budget with client-disconnect
 * propagation; the media itself is NEVER downloaded here — only metadata.
 */
export async function extractFacebook(
  rawUrl: string,
  externalSignal?: AbortSignal,
): Promise<FacebookSource> {
  const parsed = parseFacebookUrl(rawUrl);
  if (!parsed) {
    throw new AppError(
      "INVALID_URL",
      "That isn't a Facebook video link.",
      "Supported: facebook.com/…/videos/…, /reel/…, /watch?v=…, fb.watch and /share/v/ links.",
    );
  }

  const signal = withTimeoutSignal(externalSignal, DEFAULT_TIMEOUT_MS);

  // Resolve short links first so parsing runs against the canonical page.
  let finalUrl = parsed.canonicalUrl;
  if (parsed.isShort) {
    if (signal.aborted) throw new AppError("PROVIDER_UNAVAILABLE", "Request cancelled.");
    try {
      const resolvedFinalUrl = await resolveRedirects(parsed.canonicalUrl, signal);
      finalUrl = resolvedFinalUrl;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Couldn't expand that Facebook short link.",
        "Open the video in the Facebook app and copy the full URL.",
      );
    }
  }

  let html: string | null = null;
  // Keep the first non-empty page as a fallback: a later mirror (mbasic) may
  // return nothing, and overwriting a valid desktop payload with `null` used
  // to turn a resolvable video into a false "Facebook didn't serve the page".
  let fallbackHtml: string | null = null;

  // 3-tier waterfall: Tier 1 canonical/share-unwrap + desktop/mobile HTML
  // relay (browser_native_hd_url / playable_url); Tier 2 plugins/video.php
  // embed payload (bypasses timeline rate limits); Tier 3 mbasic lightweight
  // mobile redirect. Each tier gets a strict 4.5s timeout + circuit-breaker
  // via runWaterfall so one slow mirror never hangs the request.
  for (const attempt of buildAttempts(finalUrl)) {
    if (signal.aborted) break;
    let page: string | null = null;
    try {
      page = await runWaterfall([
        {
          name: `fb:page:${new URL(attempt.url).hostname}`,
          timeoutMs: WATERFALL_TIMEOUT_MS,
          fn: () => fetchPage(attempt, signal),
        },
      ]);
    } catch {
      continue;
    }
    if (!page) continue;
    if (!fallbackHtml) fallbackHtml = page;
    if (/"playable_url|"hd_src|"browser_native_|<video/i.test(page)) {
      html = page;
      break;
    }
  }

  html = html ?? fallbackHtml;

  if (!html) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Facebook didn't serve the video page.",
      "Long videos sometimes need a retry — try again in a moment.",
    );
  }

  const decoded = decodeEscapes(html);
  const hdCandidates = pickSources(decoded, HD_KEYS);
  const sdCandidates = pickSources(decoded, SD_KEYS).filter(
    (url) => !hdCandidates.includes(url),
  );

  // `og:video` meta fallback: embed/plugin payloads often expose the stream
  // only as a meta tag. Entities are decoded first (see `decodeEscapes`).
  const ogVideo = isUsableUrl(
    decodeEntities(
      metaContent(html, "og:video:secure_url") ??
        metaContent(html, "og:video:url") ??
        metaContent(html, "og:video") ??
        "",
    ).replace(/&amp;/g, "&"),
  );
  if (ogVideo && !sdCandidates.includes(ogVideo) && !hdCandidates.includes(ogVideo)) {
    sdCandidates.push(ogVideo);
  }

  // Progressive `representations` / `base_url` fallback for payloads that
  // hide the direct src. The allowlist in `isUsableUrl` already drops
  // `bytestart`/`byteend`/`.m4s` DASH fragments, and the probe below still
  // rejects HEVC / VP9 renditions.
  if (hdCandidates.length === 0 && sdCandidates.length === 0) {
    const progressive = new RegExp('"base_url"\\s*:\\s*"(https:[^"]+)"', "g");
    let progressiveMatch: RegExpExecArray | null;
    while ((progressiveMatch = progressive.exec(decoded)) !== null) {
      const url = isUsableUrl(progressiveMatch[1]);
      if (url && !sdCandidates.includes(url)) sdCandidates.push(url);
      if (sdCandidates.length >= 4) break;
    }
  }
  if (hdCandidates.length === 0 && sdCandidates.length === 0) {
    const mp4 = isUsableUrl(decoded.match(/"(https:\/\/[^"]+\.mp4[^"]*)"/)?.[1]);
    if (mp4) sdCandidates.push(mp4);
  }

  const canonicalId =
    finalUrl.match(/\/videos\/(?:[^/]*\/)?(\d{5,})/)?.[1] ??
    finalUrl.match(/\/reel\/(?:[^/]*\/)?(\d{5,})/)?.[1] ??
    finalUrl.match(/[?&]v=(\d{5,})/)?.[1] ??
    parsed.id ??
    String(Date.now());

  const probeOptions = {
    referer: "https://www.facebook.com/",
    signal,
    timeoutMs: 6_000,
    // Facebook progressive MP4s often park `moov` at the tail: accept a
    // valid ftyp + video/mp4 stream instead of rejecting it (see lib/mp4.ts).
    allowLateMoov: true,
  } as const;

  // Probe in parallel (bounded to 3 HD + 2 SD) and pick the first renditions
  // that are *verifiably* H.264 with an audio track — not merely the first
  // URL Facebook listed.
  const [hdProbes, sdProbes] = await Promise.all([
    Promise.all(
      hdCandidates
        .slice(0, 3)
        .map((url, index) =>
          probeMp4(url, { ...probeOptions, cacheKey: `fb:${canonicalId}:hd:${index}` }),
        ),
    ),
    Promise.all(
      sdCandidates
        .slice(0, 2)
        .map((url, index) =>
          probeMp4(url, { ...probeOptions, cacheKey: `fb:${canonicalId}:sd:${index}` }),
        ),
    ),
  ]);

  const hdChosen = chooseUniversalStream(hdCandidates.slice(0, 3), hdProbes);
  const sdChosen = chooseUniversalStream(sdCandidates.slice(0, 2), sdProbes);

  const videoHd = hdChosen?.url ?? null;
  const videoSd = sdChosen && sdChosen.url !== videoHd ? sdChosen.url : null;
  const primaryProbe = (hdChosen ?? sdChosen)?.probe ?? null;

  const thumbnail = isUsableUrl(
    metaContent(html, "og:image") ??
      decoded.match(/"preferred_thumbnail"[\s\S]{0,400}?"image_uri"\s*:\s*"(https:[^"]+)"/)?.[1],
  );

  const title = decodeEntities(
    cleanCaption(
      metaContent(html, "og:title") ?? decoded.match(/<title[^>]*>([^<]{1,300})<\/title>/)?.[1] ?? "",
    ),
  );
  const siteName = metaContent(html, "og:site_name")?.replace(/\s*\|\s*Facebook$/i, "");
  const author =
    decoded.match(/"owner_text"\s*:\s*"([^"]{1,120})"/)?.[1] ??
    // `/cnn/videos/…` → "cnn"; the page slug is more accurate than the
    // generic `og:site_name` ("Facebook") most videos fall back to.
    authorFromPath(finalUrl) ??
    (siteName && !/^facebook$/i.test(siteName) ? siteName : null) ??
    "facebook";

  // Facebook reports length as seconds (`videoDuration`) or milliseconds
  // (`playable_duration_in_ms`); 0:00 on a real video looked broken.
  const secondsMatch = decoded.match(/"videoDuration"\s*:\s*(\d{1,7})/);
  const msMatch = decoded.match(/"playable_duration_in_ms"\s*:\s*(\d{1,9})/);
  const duration = secondsMatch
    ? Math.round(Number(secondsMatch[1]) || 0)
    : msMatch
      ? Math.round((Number(msMatch[1]) || 0) / 1000)
      : 0;

  if (!videoHd && !videoSd) {
    if (/login|must.?log.?in/i.test(title) || /content="Log in/i.test(html)) {
      throw new AppError(
        "VIDEO_PRIVATE",
        "This Facebook video is private.",
        "Set the post to public, or open it while logged out and try again.",
      );
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Facebook didn't expose a downloadable stream for this video.",
      "Age-restricted or friends-only videos can't be resolved — retry once in case of rate limiting.",
    );
  }

  return {
    id: canonicalId,
    canonicalUrl: finalUrl,
    title: title || "Facebook video",
    author,
    thumbnail,
    duration,
    videoHd,
    videoSd,
    videoHdBytes: hdChosen?.probe?.byteSize ?? null,
    videoSdBytes: sdChosen?.probe?.byteSize ?? null,
    // Never claim H.264 without a verdict that actually says so.
    codec: primaryProbe?.codec ?? "unknown",
  };
}
