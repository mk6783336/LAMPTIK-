/**
 * LampTik extension — background service worker.
 *
 * Every network call the extension makes goes through this worker, never
 * through a content script: a content script's `fetch` inherits YouTube's
 * page origin (and its CORP/CORS rules), while the worker talks to
 * lamptik.online with the extension's own host permissions. It also keeps one
 * small resolution cache, so opening the popover twice or clicking MP4 then
 * MP3 costs a single upstream resolve.
 *
 * Nothing is stored here beyond that in-memory cache: no history, no ids, no
 * cookies. The worker is restarted by Chrome whenever it goes idle, which
 * clears the cache.
 */

const BASE = "https://www.lamptik.online";

/** Platform → resolver route. YouTube has its own extractor; the other three
 *  share the unified `/api/fetch` endpoint. */
const ENDPOINTS = {
  youtube: "/api/youtube",
  tiktok: "/api/fetch",
  instagram: "/api/fetch",
  facebook: "/api/fetch",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const RESOLVE_TIMEOUT_MS = 25_000;

/** @type {Map<string, { at: number, payload: object }>} */
const cache = new Map();

/** @param {string} url */
function platformOf(url) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host.endsWith("instagram.com")) return "instagram";
  if (host.endsWith("facebook.com") || host === "fb.watch") return "facebook";
  return null;
}

/**
 * Media links come back as same-origin paths (`/api/download?…`) or as raw
 * CDN URLs. The extension needs them absolute so an anchor click from inside
 * youtube.com hits lamptik's attachment endpoint, not YouTube's 404 page.
 * @param {string | null | undefined} value
 */
function absoluteUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value, `${BASE}/`).toString();
  } catch {
    return null;
  }
}

/** Normalise a success payload into exactly what the UI renders. */
function normalize(data) {
  const media = data && typeof data.media === "object" && data.media ? data.media : null;
  if (!media) return null;
  return {
    id: typeof media.id === "string" ? media.id : "",
    platform: typeof media.platform === "string" ? media.platform : "",
    title: typeof media.title === "string" ? media.title : "Untitled video",
    author: typeof media.author === "string" ? media.author : "",
    duration: typeof media.duration === "number" ? media.duration : 0,
    thumbnail: absoluteUrl(media.thumbnail),
    videoHd: absoluteUrl(media.videoHd) || absoluteUrl(media.videoDirect),
    videoSd: absoluteUrl(media.videoSd),
    audioMp3: absoluteUrl(media.audioMp3) || absoluteUrl(media.audioDirect),
    pageUrl:
      typeof media.canonicalUrl === "string" && /^https?:\/\//i.test(media.canonicalUrl)
        ? media.canonicalUrl
        : BASE,
  };
}

function failure(message, code) {
  return { ok: false, error: { code: code || "UPSTREAM_ERROR", message: String(message) } };
}

/**
 * Resolve one video URL. Soft errors arrive as HTTP 200 with `ok: false`
 * (that is how lamptik keeps provider hiccups out of the function-error
 * budget), so the body — not the status — decides success.
 *
 * @param {string} url
 * @param {boolean} [force] bypass the local cache and ask for a fresh stream
 */
async function resolve(url, force) {
  const platform = platformOf(url);
  if (!platform) return failure("This page is not a supported video.", "UNSUPPORTED_URL");

  const key = `${platform}:${url}`;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.payload, cached: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE}${ENDPOINTS[platform]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url, force: Boolean(force) }),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    const data = await response.json().catch(() => null);

    if (!data || data.ok !== true) {
      const error = (data && data.error) || {};
      return {
        ok: false,
        error: {
          code: typeof error.code === "string" ? error.code : "UPSTREAM_ERROR",
          message:
            typeof error.message === "string" && error.message
              ? error.message
              : `lamptik.online answered ${response.status}. Please retry in a moment.`,
          hint: typeof error.hint === "string" ? error.hint : undefined,
        },
      };
    }

    const media = normalize(data);
    if (!media) return failure("lamptik.online returned an unreadable response.");
    if (!media.videoHd && !media.videoSd && !media.audioMp3) {
      return failure("No downloadable stream came back for this video.", "PROVIDER_UNAVAILABLE");
    }

    const payload = { ok: true, media };
    cache.set(key, { at: Date.now(), payload });
    return payload;
  } catch (error) {
    const aborted = error && (error.name === "AbortError" || error.code === 20);
    return failure(
      aborted
        ? "lamptik.online took too long to answer. Please retry."
        : "Could not reach lamptik.online. Check your connection and retry.",
      "UPSTREAM_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "lamptik:resolve" || typeof message.url !== "string") {
    return undefined;
  }
  resolve(message.url, message.force === true)
    .then(sendResponse)
    .catch(() => sendResponse(failure("Unexpected extension error.")));
  // Keep the message channel open for the async response.
  return true;
});
