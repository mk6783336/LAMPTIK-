"use client";

import { ArrowUpRight, Check, Copy, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * `prefers-reduced-motion` as React state.
 *
 * This replaced framer-motion's `useReducedMotion`, which was the only reason
 * the animation library sat in the tool page's client bundle. Same behaviour,
 * no dependency: the MediaQueryList is read once on mount and kept in sync on
 * change, so a visitor who flips the OS setting mid-session gets the same
 * instant scroll the reduced-motion branch already asked for.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}


import { PlatformSwitcher } from "@/components/platform-switcher";
import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";
import { ResultPanel } from "@/components/result-panel";
import { AdSlot } from "@/components/ads/AdSlot";
import { clientMirrorStreams, clientOembedMeta } from "@/lib/youtube-client";

import { ToastStack, type ToastItem } from "@/components/toast";
import { UrlField } from "@/components/url-field";
import { signalAdIntent } from "@/lib/ad-intent";
import { cn } from "@/lib/cn";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { downloaderCopy, type DownloaderCopy } from "@/lib/i18n/ui";
import type { LocaleCode } from "@/lib/i18n/types";
import { directLinkUrl } from "@/lib/monetization";
import type { MediaPayload } from "@/lib/media";
import type { ApiFailure, ApiSuccess, ApiResponse, VideoInfo } from "@/lib/tiktok/types";

const SAMPLE_URL = "https://www.tiktok.com/@scout2015/video/6718335390845095173";

type Status = "idle" | "loading" | "success";

/* --------------------------------------------------------------------------
 *  Back/refresh survival — the resolved result is persisted per-pathname in
 *  sessionStorage. A Back/Forward press or an accidental mobile reload used
 *  to wipe the resolved video and drop the user back on an idle input;
 *  now their card and download buttons come straight back (<10 min old).
 * ------------------------------------------------------------------------ */

const RESULT_CACHE_TTL_MS = 10 * 60_000;

function resultCacheKey(): string {
  return `lamptik_last_result_${window.location.pathname}`;
}

function saveLastResult(url: string, video: VideoInfo, media: MediaPayload): void {
  try {
    window.sessionStorage.setItem(
      resultCacheKey(),
      JSON.stringify({ savedAt: Date.now(), url, video, media }),
    );
  } catch {
    // Safari private mode / quota errors — persistence is best-effort.
  }
}

function clearLastResult(): void {
  try {
    window.sessionStorage.removeItem(resultCacheKey());
  } catch {
    // Nothing to clear.
  }
}

interface LastResolvedResult {
  url: string;
  video: VideoInfo;
  media: MediaPayload;
}

function readLastResult(): LastResolvedResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(resultCacheKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: unknown;
      url?: unknown;
      video?: VideoInfo;
      media?: MediaPayload;
    };
    // Stale entries self-delete; the visitor re-resolves with one tap.
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > RESULT_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(resultCacheKey());
      return null;
    }
    if (typeof parsed.url !== "string" || !parsed.url || !parsed.video || !parsed.media) return null;
    return { url: parsed.url, video: parsed.video, media: parsed.media };
  } catch {
    return null; // corrupted blob / non-JSON — treat as empty
  }
}

function createToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface YouTubeJobMeta {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string | null;
}

/** Exchange one polled `download_url` for the standard `{ media, video }` payload. */
async function claimYouTubeJob(
  job: { format: string; downloadUrl: string },
  meta: YouTubeJobMeta,
  signal: AbortSignal,
): Promise<ApiSuccess> {
  const response = await fetch("/api/youtube/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId: meta.videoId,
      downloadUrl: job.downloadUrl,
      format: job.format,
      title: meta.title,
      author: meta.author,
      duration: meta.duration,
      thumbnail: meta.thumbnail,
    }),
    signal,
  });
  const body = (await response.json().catch(() => null)) as ApiResponse | null;
  if (!response.ok || !body || !body.ok) {
    const failure = body as ApiFailure | null;
    throw new Error(
      failure && !failure.ok ? failure.error.message : "That mirror result couldn't be claimed.",
    );
  }
  return body;
}

/* --------------------------------------------------------------------------
 *  Browser-direct rescue — the last resort when the server cannot resolve.
 *
 *  The visitor's residential IP is not on a datacenter blocklist, and the
 *  public Piped / Invidious APIs answer CORS `*`, so the same JSON extraction
 *  runs here and the resulting stream is exchanged for the standard payload
 *  through /api/youtube/claim. There is no converter in this path: loader.to
 *  now demands authorized API access and answers an HTML ad card.
 * ------------------------------------------------------------------------ */

/** Never let a dead mirror list hold the result screen for long. */
const RESCUE_MIRROR_TIMEOUT_MS = 4_000;

const YT_ID_RE = /(?:v=|\/shorts\/|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function extractYouTubeId(rawUrl: string): string | null {
  const match = rawUrl.match(YT_ID_RE);
  return match ? match[1] : null;
}

async function rescueYouTubeFromBrowser(args: {
  rawUrl: string;
  signal: AbortSignal;
  onNote: (note: string) => void;
  onMergeAudio: (payload: ApiSuccess) => void;
  onMergeVideo: (payload: ApiSuccess) => void;
}): Promise<ApiSuccess | null> {
  const { rawUrl, signal, onNote, onMergeAudio } = args;
  if (typeof window === "undefined") return null;
  const videoId = extractYouTubeId(rawUrl);
  if (!videoId) return null;

  onNote("Resolving on your connection — trying public mirrors…");
  // Metadata starts first but must never delay a dead-mirror verdict: await
  // the stream, and only then (usually already settled) the title/thumbnail.
  const metaPromise = clientOembedMeta(videoId);
  const mirror = await Promise.race([
    clientMirrorStreams(videoId),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RESCUE_MIRROR_TIMEOUT_MS)),
  ]);
  if (!mirror) return null;
  const meta = await metaPromise;

  const metaFor = (): YouTubeJobMeta => ({
    videoId,
    title: mirror.title || meta.title || `YouTube video ${videoId}`,
    author: mirror.author || meta.author || "YouTube",
    duration: mirror.duration > 0 ? mirror.duration : meta.duration,
    thumbnail: mirror.thumbnail ?? meta.thumbnail,
  });

  const mirrorVideo =
    mirror.video && !isKnownLoaderInterstitialUrl(mirror.video) ? mirror.video : null;
  const mirrorAudio =
    mirror.audio && !isKnownLoaderInterstitialUrl(mirror.audio) ? mirror.audio : null;
  if (!mirrorVideo) return null;

  if (mirrorAudio) {
    void claimYouTubeJob({ format: "mp3", downloadUrl: mirrorAudio }, metaFor(), signal)
      .then(onMergeAudio)
      .catch(() => undefined);
  }
  try {
    return await claimYouTubeJob({ format: "720", downloadUrl: mirrorVideo }, metaFor(), signal);
  } catch {
    return null;
  }
}

const STEPS = [

  "Resolving the share link",
  "Extracting the clean stream",
  "Verifying HD CDN nodes",
] as const;

const YT_STEPS = [
  "Resolving high-speed stream",
  "Trying HD mirrors (1080p / 720p / audio)",
  "Preparing instant download buttons",
] as const;

/**
 * Live resolve timeline. The three stages are revealed by real elapsed time
 * (the timer is a measurement, not decoration) so the user always sees
 * forward motion and a truthful duration — no frozen button, no mystery
 * spinner, no fake percentage.
 */
function LoadingConsole({
  elapsedMs,
  platform,
  copy,
}: {
  elapsedMs: number;
  platform: Platform;
  copy: DownloaderCopy;
}) {
  const activeIndex = elapsedMs < 1_200 ? 0 : elapsedMs < 3_200 ? 1 : 2;
  const isYouTube = platform === "youtube";
  const steps = isYouTube ? YT_STEPS : STEPS;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mt-4 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-sunken)] px-4 py-4"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px animate-sweep bg-gradient-to-r from-transparent via-[var(--tool-ring,var(--accent))] to-transparent"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative grid size-5 shrink-0 place-items-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[var(--accent-soft)]"
            />
            <Loader2 className="relative size-3.5 animate-spin text-[var(--accent-text)]" />
          </span>
          <span className="truncate text-sm font-medium">{copy.analyzing}</span>
        </div>
        <span className="micro shrink-0 tabular-nums text-[var(--text-3)]">
          {(elapsedMs / 1000).toFixed(1)}s
        </span>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((label, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={label} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-300",
                  done
                    ? "border-[var(--ok)]/60 bg-[var(--ok-soft)] text-[var(--ok)]"
                    : active
                      ? "border-[var(--accent)]/70 bg-[var(--accent-soft)] text-[var(--accent-text)]"
                      : "border-[var(--line)] text-[var(--text-3)]",
                )}
              >
                {done ? (
                  <Check className="size-2.5" strokeWidth={3.5} />
                ) : active ? (
                  <Loader2 className="size-2.5 animate-spin" />
                ) : (
                  <span className="size-1 rounded-full bg-current opacity-50" />
                )}
              </span>
              <span
                className={cn(
                  "truncate text-sm transition-colors duration-300",
                  done
                    ? "text-[var(--text-2)]"
                    : active
                      ? "text-[var(--text)]"
                      : "text-[var(--text-3)]",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 space-y-2" aria-hidden="true">
        <div className="skeleton h-2.5 w-[74%]" />
        <div className="skeleton h-2.5 w-[46%]" />
      </div>

      {/* Stage A monetization — the sponsored 300×250 lives IN FLOW inside
          the resolve console: the visitor watches an ad exactly while the
          CDN link is being prepared. Clickable, never an overlay, and it
          unmounts with the console the moment the resolve finishes. */}
      <div className="mt-4">
        <AdSlot
          slot="loader"
          format="rectangle"
          eager
          alwaysReserve
          label="Sponsored — keeps LAMP TIK free"
        />
      </div>
    </div>
  );
}

/**
 * The URL-prefix trick, made copyable.
 *
 * `lamptik.online/<video url>` resolves on arrival (see the catch-all bridge at
 * `app/(site)/[...target]/page.tsx`). The badge exists so the trick is
 * discoverable and shareable — a mechanic nobody sees is a mechanic nobody
 * tells a friend about — and it copies the prefix so a link can be built by
 * pasting it in front of a video address.
 */
function UrlPrefixTip() {
  const PREFIX = "https://www.lamptik.online/";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(PREFIX);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      // Clipboard blocked (permissions, http origin): the text stays readable.
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 py-2 text-xs leading-relaxed text-[var(--text-2)]">
      <Zap aria-hidden="true" className="size-3.5 shrink-0 text-[var(--accent-text)]" />
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-[var(--text)]">Pro tip:</span> type{" "}
        <code className="rounded bg-[var(--bg-sunken)] px-1 py-0.5 font-mono text-xs text-[var(--text)]">
          lamptik.online/
        </code>{" "}
        in front of any TikTok, Reels, Shorts or X link and it starts downloading.
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3 text-[var(--ok)]" />
        ) : (
          <Copy aria-hidden="true" className="size-3" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

interface DownloaderProps {
  /** Which platform page this shell lives on — default accent + copy. */
  platform?: Platform;
  /** Localized routes pass their code so the field, CTA and result panel
   *  speak the same language as the page around them. */
  locale?: LocaleCode;
  /**
   * Link to show in the field on first paint (the playlist browser hands a
   * chosen video here). Prefilled only — the visitor still presses the
   * Download button, so the ad gate and resolve flow stay untouched.
   */
  initialUrl?: string;
}

export function Downloader({ platform = "tiktok", initialUrl, locale }: DownloaderProps) {
  const t = downloaderCopy(locale);
  const [status, setStatus] = useState<Status>("idle");
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [media, setMedia] = useState<MediaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [seed, setSeed] = useState({ value: initialUrl?.trim() ?? "", nonce: 0 });
  /** Incremented on every resolve / reset so the ad slots re-auction for a
      fresh impression (see AdSlot's throttled `refreshKey`). */
  const [adRefreshKey, setAdRefreshKey] = useState(0);
  /** Shown during the single silent auto-retry (attempt 2/2). */
  const [backupNote, setBackupNote] = useState<string | null>(null);
  /** Last URL that actually failed, so the inline Retry can skip re-detecting. */
  const lastFailureRef = useRef<{ url: string; at: number } | null>(null);
  const lastSubmittedUrlRef = useRef<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  /** One-shot: the Back/refresh restore must not scroll the result into view. */
  const skipNextResultScrollRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const tickerRef = useRef<number | null>(null);
  /** Always-current submit handler, so the share-sheet effect and the result
      panel's failure-retry can call it without re-subscribing on every render. */
  const submitRef = useRef<
    (url: string, options?: { force?: boolean }) => Promise<void>
  >(async () => {});
  const reduceMotion = usePrefersReducedMotion();

  const isLoading = status === "loading";

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<ToastItem, "id">) => {
    // Replace an identical banner instead of stacking a copy under it — the
    // repeated "couldn't resolve" stack was half of the reported error loop.
    setToasts((current) => [
      ...current.filter((item) => item.title !== toast.title).slice(-2),
      { ...toast, id: createToastId() },
    ]);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const abort = () => abortRef.current?.abort();
    return abort;
  }, []);

  useEffect(() => stopTicker, [stopTicker]);

  // Keep the deferred submit handler current (function declarations hoist, so
  // this reference is valid on the very first render).
  useEffect(() => {
    submitRef.current = handleSubmitUrl;
  });

  /**
   * Shared-link hand-off.
   *
   * A `?shared_url=` query parameter (Web Share Target or a manual link)
   * pre-fills and resolves the link automatically. Consumed exactly once:
   * extract the link, strip the parameter from the address bar, then resolve.
   * YouTube links opened from another platform's shell are re-routed to the
   * dedicated YouTube page so the right hero and copy frame the result.
   */
  const sharedHandledRef = useRef(false);

  // Restore the last resolved video for this page on mount (Back press,
  // mobile reload). A `?shared_url=` hand-off skips the restore so the
  // fresh resolve wins; a manual “Download Another Video” reset already
  // cleared the cache above.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === "undefined") return;
    const initialParams = new URLSearchParams(window.location.search);
    // Any auto-resolve hand-off (`?url=` deep link, `?shared_url=`) wins over
    // the cached card: the visitor asked for THIS video.
    if (initialParams.has("shared_url") || initialParams.has("url")) return;
    void restoreLastResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Restore-and-validate the cached card. Because any platform's link can
   * be resolved on any page (the submit flow doesn't route), a dedicated
   * tool page must NEVER resurrect a card its platform can't serve Back
   * from navigation: ``/youtube-downloader`` holding a TikTok entry is
   * stale cross-platform state, so the entry is cleared on the spot. The
   * home shell (``/``) stays the universal tool — whatever it resolved
   * legitimately restores there.
   */
  async function restoreLastResult(): Promise<void> {
    const last = readLastResult();
    if (!last) return;
    if (window.location.pathname !== "/") {
      const { detectLink } = await import("@/lib/detect");
      const detected = detectLink(last.url);
      if (detected && detected.platform !== platform) {
        clearLastResult();
        return;
      }
    }
    // Silent restore: the input keeps whatever state it had (no value
    // injection, no focus — UrlField ignores same-nonce seeds anyway) and
    // the auto-scroll effect below is suppressed for this first success.
    skipNextResultScrollRef.current = true;
    setVideo(last.video);
    setMedia(last.media);
    setStatus("success");
  }

  /**
   * `?url=` deep link — the landing half of the URL-prefix shortcut.
   *
   * The catch-all bridge (`app/(site)/[...target]/page.tsx`) and any shared
   * link arrive here with the video address already encoded. Resolving it on
   * mount is the whole point of the trick: type `lamptik.online/<video url>`,
   * press Enter, watch the result appear — no paste, no second click.
   *
   * Consumed exactly once (parameter stripped from the address bar so a
   * reload does not re-fetch) and outside the ad gate: a visitor who was
   * handed a deep link already chose this video, and a 10s gate in front of
   * that choice would waste the share. YouTube links open on the dedicated
   * page for the same reason as `?shared_url=`.
   */
  const urlParamHandledRef = useRef(false);
  useEffect(() => {
    if (urlParamHandledRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("url");
    if (!incoming || !incoming.trim()) return;
    urlParamHandledRef.current = true;

    params.delete("url");
    const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    try {
      window.history.replaceState(window.history.state, "", cleaned);
    } catch {
      // History API unavailable — the handled ref still prevents a re-fire.
    }

    void (async () => {
      const { detectLink } = await import("@/lib/detect");
      const detected = detectLink(incoming);
      if (!detected) {
        // X is not part of the shared flow (its own resolver, its own panel):
        // hand the link to that page instead of leaving a filled-in field on a
        // shell that would answer "isn't a TikTok, Instagram, Facebook… link".
        const host = (() => {
          try {
            return new URL(incoming.trim()).hostname.replace(/^www\./, "").toLowerCase();
          } catch {
            return "";
          }
        })();
        if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) {
          window.location.assign(
            `/twitter-video-downloader?url=${encodeURIComponent(incoming.trim())}`,
          );
          return;
        }
        setSeed((current) => ({ value: incoming.trim(), nonce: current.nonce + 1 }));
        inputRef.current?.focus();
        return;
      }
      if (detected.platform === "youtube" && platform !== "youtube") {
        window.location.assign(
          `/youtube-downloader?url=${encodeURIComponent(detected.url)}`,
        );
        return;
      }
      setSeed((current) => ({ value: detected.url, nonce: current.nonce + 1 }));
      skipNextResultScrollRef.current = false;
      void submitRef.current(detected.url);
    })();
    // Runs once per mount: a deep link describes the page the visitor opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sharedHandledRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared_url");
    if (!shared || !shared.trim()) return;
    sharedHandledRef.current = true;

    params.delete("shared_url");
    const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    try {
      window.history.replaceState(window.history.state, "", cleaned);
    } catch {
      // History API unavailable — the handled ref still prevents a re-fire.
    }

    void (async () => {
      const { detectLink } = await import("@/lib/detect");
      const detected = detectLink(shared);
      if (!detected) {
        setSeed((current) => ({ value: shared.trim(), nonce: current.nonce + 1 }));
        inputRef.current?.focus();
        return;
      }
      if (detected.platform === "youtube" && platform !== "youtube") {
        window.location.assign(
          `/youtube-downloader?shared_url=${encodeURIComponent(shared.trim())}`,
        );
        return;
      }
      setSeed((current) => ({ value: detected.url, nonce: current.nonce + 1 }));
      void submitRef.current(detected.url);
    })();
    // Runs once per mount: the hand-off must be consumed exactly once, and
    // `platform` is fixed for the lifetime of the page shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bring the expanded result into view on small screens.
  //
  // Suppressed on the cached Back/refresh restore: the browser is already
  // showing the exact spot the visitor left — yanking the page down to the card
  // would read as a hijack.
  //
  // This used to be one `setTimeout(420)` shot that measured the card once and
  // gave up if it looked visible. Measured on a 390×844 phone it landed or not
  // depending on what had finished loading: the thumbnail, the webfont, the
  // ad slot swapping to its compact row and the reveal transform each moved the
  // card after the measurement, and a single smooth scroll that the browser was
  // still animating could be dropped outright (measured `scrollY: 0` with the
  // panel starting 1023px down). So: scroll once, then re-assert the position a
  // few times while the panel settles, and stop the moment the visitor touches
  // the page — a scroll correction must never fight a real gesture.
  useEffect(() => {
    if (status !== "success" || !video) return;
    if (skipNextResultScrollRef.current) {
      skipNextResultScrollRef.current = false;
      return;
    }
    if (typeof window === "undefined") return;

    /** Where the card should sit: this far below the sticky header. */
    const HEADER_OFFSET = 112;
    /** How far off the target is still "in place". */
    const TOLERANCE = 8;
    let cancelled = false;
    let timer = 0;

    const stop = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // A wheel, a finger or a key means the visitor has taken over.
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchmove", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });

    const targetTop = (): number | null => {
      const node = resultRef.current;
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return Math.max(0, Math.round(window.scrollY + rect.top - HEADER_OFFSET));
    };

    /**
     * Keep the card at its place while the panel settles: up to four instant
     * corrections over ~1.2s, only while it is still below the header line.
     */
    const settle = (round = 0) => {
      if (cancelled) return;
      const top = targetTop();
      if (top !== null && Math.abs(window.scrollY - top) > TOLERANCE) {
        window.scrollTo({ top, behavior: "instant" });
      }
      if (round < 4) timer = window.setTimeout(() => settle(round + 1), 300);
    };

    let attempts = 0;
    const start = () => {
      if (cancelled) return;
      const top = targetTop();
      // The reveal mounts a frame or two after `status` flips, so a missing
      // ref is "not laid out yet", not "nothing to do".
      if (top === null) {
        attempts += 1;
        if (attempts < 6) timer = window.setTimeout(start, 80);
        return;
      }
      if (Math.abs(window.scrollY - top) < TOLERANCE) return;

      window.scrollTo({ top, behavior: reduceMotion ? "instant" : "smooth" });

      // Verification pass. Measured in the packaged Chromium, a programmatic
      // `behavior: "smooth"` scroll on this page is silently dropped —
      // `scrollY` stayed 0 while `behavior: "instant"` moved it to 900 — and
      // the page's CSS `scroll-behavior: smooth` means `"auto"` inherits the
      // same fate. So the card gets an instant correction when the smooth one
      // did not actually move the page.
      timer = window.setTimeout(
        () => {
          if (cancelled) return;
          const wanted = targetTop();
          if (wanted !== null && Math.abs(window.scrollY - wanted) > TOLERANCE) {
            window.scrollTo({ top: wanted, behavior: "instant" });
          }
          settle(1);
        },
        reduceMotion ? 0 : 420,
      );
    };

    timer = window.setTimeout(start, reduceMotion ? 0 : 380);

    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [status, video, reduceMotion]);

  // Global paste shortcut (⌘/Ctrl+V when the field isn't focused).
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (inField || event.metaKey || event.ctrlKey) return;
      if (event.key.toLowerCase() === "v") inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function reset() {
    abortRef.current?.abort();
    stopTicker();
    lastFailureRef.current = null;
    lastSubmittedUrlRef.current = null;
    setStatus("idle");
    setVideo(null);
    setMedia(null);
    setError(null);
    clearLastResult();
    setAdRefreshKey((key) => key + 1);
    setSeed((current) => ({ value: "", nonce: current.nonce + 1 }));
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function loadSample() {
    setSeed((current) => ({ value: SAMPLE_URL, nonce: current.nonce + 1 }));
    inputRef.current?.focus();
  }

  /** Attach a late-finishing YouTube mp3 claim to the panel — the audio
   *  stream already shows video buttons; this only lights the MP3 button. */
  function mergeAudioClaim(claim: ApiSuccess) {
    setMedia((current) =>
      current
        ? {
            ...current,
            audioDirect: claim.media.audioDirect ?? current.audioDirect,
            audioMp3: claim.media.audioMp3 ?? current.audioMp3,
          }
        : current,
    );
    setVideo((current) =>
      current
        ? {
            ...current,
            downloads: {
              ...current.downloads,
              audioDirect: claim.video.downloads.audioDirect,
              audio: claim.video.downloads.audio,
            },
          }
        : current,
    );
    notify({
      kind: "success",
      title: "Audio ready",
      description: "The audio track finished converting — Download Audio is live.",
    });
  }

  /** Attach a late-finishing YouTube video claim when only the mp3 landed
   *  first (the panel was audio-only until now). */
  function mergeVideoClaim(claim: ApiSuccess) {
    setMedia((current) =>
      current
        ? {
            ...current,
            videoDirect: claim.media.videoDirect ?? current.videoDirect,
            videoHd: claim.media.videoHd ?? current.videoHd,
            videoSd: claim.media.videoSd ?? current.videoSd,
            videoHdBytes: claim.media.videoHdBytes ?? current.videoHdBytes,
            videoSdBytes: claim.media.videoSdBytes ?? current.videoSdBytes,
          }
        : current,
    );
    setVideo((current) =>
      current
        ? {
            ...current,
            quality: claim.video.quality === "hd" ? "hd" : current.quality,
            downloads: {
              ...current.downloads,
              videoDirect: claim.video.downloads.videoDirect,
              video: claim.video.downloads.video,
              videoSd: claim.video.downloads.videoSd,
            },
          }
        : current,
    );
    notify({
      kind: "success",
      title: "Video stream ready",
      description: "The converted MP4 landed — Server 01 and Server 02 are live.",
    });
  }

  /**
   * Every DIRECT input submission (typed, pasted or sample) waits behind the
   * sponsored video gate; the resolve itself starts when the gate closes.
   * Retries and the automatic `?shared_url=` hand-off call `handleSubmitUrl`
   * directly, so an already-earned result never pays for a second gate.
   */
  function handleGateSubmit(rawUrl: string) {
    if (isLoading) return;
    // The submit-time video gate is gone.
    //
    // It held every pasted link behind a full-screen card for 10 seconds on the
    // first three videos of a session and for 30 seconds on every one after
    // that — before the tool had even looked at the link. That wait, not the
    // resolve, is what the site felt like on a phone: paste, then sit through an
    // ad, then find out the clip is private. Submission now resolves
    // immediately, so the banners and the sponsored card are the only ad
    // surfaces and none of them block the tool.
    //
    // A retry of a URL that just failed is still a recovery action: it forces a
    // fresh resolve instead of replaying the error.
    const failed = lastFailureRef.current;
    setError(null);
    if (failed && failed.url === rawUrl.trim() && Date.now() - failed.at < 120_000) {
      void handleSubmitUrl(rawUrl, { force: true });
      return;
    }
    void handleSubmitUrl(rawUrl);
  }

  /** Inline recovery action: force a fresh resolve without the ad gate. */
  function retryLastResolve() {
    if (isLoading) return;
    const url = lastFailureRef.current?.url ?? lastSubmittedUrlRef.current;
    if (!url) return;
    setError(null);
    void handleSubmitUrl(url, { force: true });
  }

  async function handleSubmitUrl(rawUrl: string, options: { force?: boolean } = {}) {
    if (isLoading) return;
    // Sanitize messy mobile share-sheet text: extract the first valid video
    // URL from surrounding words instead of rejecting the paste.
    // (UrlField already submits a detected URL, but direct calls and quirky
    // clipboard text still land here.)
    const { detectLink: detectIncoming } = await import("@/lib/detect");
    const detectedIncoming = detectIncoming(rawUrl);
    const url = detectedIncoming ? detectedIncoming.url : rawUrl.trim();

    // A new submission supersedes an older in-flight one: abort the stale
    // request so it cannot repaint the UI with an old error later.
    abortRef.current?.abort();

    setError(null);
    setStatus("loading");
    setVideo(null);
    setMedia(null);
    setElapsedMs(0);
    setBackupNote(null);
    lastSubmittedUrlRef.current = url;
    // The visitor submitted a real link: the tool is in use, so the post-intent
    // push networks may load from here on (lib/ad-intent.ts). Fires once per
    // pageview, and after the sanitise step so junk submissions never arm it.
    signalAdIntent("resolve-submit");

    // Real elapsed-time readout while the resolver runs.
    const startedAt = performance.now();
    tickerRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 100);

    const controller = new AbortController();
    abortRef.current = controller;
    // Client-side bail-out just before the server's own maxDuration (30s), so
    // the UI never hangs on a request Vercel is about to kill. YouTube gets a
    // slightly longer window because its route may fall through the failover
    // engines when the primary player client refuses.
    const isYouTube = detectedIncoming?.platform === "youtube";
    const timeout = window.setTimeout(() => controller.abort(), isYouTube ? 40_000 : 28_000);
    // YouTube resolves through its own route (dedicated waterfall, 1080p
    // selection rules); every other platform uses the shared resolver. Both
    // are open to any browser — there is no install gate.
    const endpoint = isYouTube ? "/api/youtube" : "/api/fetch";

    /**
     * Browser rescue, at most ONCE per submission. The old flow could run it
     * inside the retry loop and again after the loop, doubling the wait and
     * repainting the same red banner — the reported "error loop".
     */
    let rescueAttempted = false;
    const tryBrowserRescue = async (): Promise<ApiSuccess | null> => {
      if (rescueAttempted) return null;
      rescueAttempted = true;
      setStatus("loading");
      setBackupNote("Trying your own connection for this video…");
      let timer: number | null = null;
      try {
        return await Promise.race([
          rescueYouTubeFromBrowser({
            rawUrl: url,
            signal: controller.signal,
            onNote: (note) => setBackupNote(note),
            onMergeAudio: mergeAudioClaim,
            onMergeVideo: mergeVideoClaim,
          }),
          new Promise<null>((resolve) => {
            timer = window.setTimeout(() => resolve(null), 7_000);
          }),
        ]);
      } catch {
        return null;
      } finally {
        if (timer !== null) window.clearTimeout(timer);
      }
    };

    /** Never repeat the server's internal bot-check line after the rescue
     *  has already failed; give the visitor one clear next action. */
    const finalMessage = (apiError: { code?: string; message?: string } | null): string => {
      if (
        isYouTube &&
        (apiError?.code === "PROVIDER_UNAVAILABLE" || apiError?.code === "UPSTREAM_ERROR")
      ) {
        // Name the real situation and the way out. "It usually clears" was
        // false for label music videos, which are blocked from datacenter IPs
        // permanently — the visitor needs one clear action, not a loop, and
        // never a hand-off to a competitor downloader.
        return "YouTube is blocking this video from our server network right now. Retry in a moment.";
      }
      return apiError?.message ?? "Couldn’t resolve this video.";
    };

    const fail = (apiError: { code?: string; message?: string; hint?: string } | null): void => {
      const message = finalMessage(apiError);
      lastFailureRef.current = { url, at: Date.now() };
      setStatus("idle");
      setBackupNote(null);
      setError(message);
      // One inline recovery action is enough: a provider block used to add a
      // toast on every retry, producing the stacked red banners users saw.
      if (apiError?.code !== "PROVIDER_UNAVAILABLE" || !isYouTube) {
        notify({ kind: "error", title: message, description: apiError?.hint });
      }
    };

    try {
      let payload: ApiSuccess | null = null;
      let lastApiError: { message?: string; hint?: string; code?: string } | null = null;
      let succeeded = false;
      // One silent retry (attempt 2/2) for transient hiccups. Provider
      // trouble then earns exactly one browser rescue, never a second one.
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (attempt === 2) setBackupNote("Switching to backup high-speed server… (attempt 2/2)");
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // `force` bypasses the server's 3-minute resolve cache — the
            // download-retry path (an expired signed CDN URL must re-sign).
            body: JSON.stringify({ url, force: options.force === true }),
            signal: controller.signal,
          });
          const body = (await response.json().catch(() => null)) as ApiResponse | null;
          // Soft errors arrive as HTTP 200 + `{ ok:false }` (so provider
          // outages never count as function errors) — the body is the
          // contract, not the status code.
          if (body?.ok) {
            payload = body;
            succeeded = true;
            break;
          }
          const apiError = body && !body.ok ? body.error : null;
          lastApiError = apiError;
          const transient =
            !response.ok && (response.status === 502 || response.status === 503 || response.status === 504);
          // A provider block already burned the server's whole waterfall;
          // running that waterfall a second time just doubles the wait. Only
          // a genuine transient/upstream hiccup earns the silent retry.
          const providerBlocked = apiError?.code === "PROVIDER_UNAVAILABLE";
          const retriableCode = apiError?.code === "UPSTREAM_ERROR";
          const shouldRetry =
            !providerBlocked &&
            (transient || retriableCode || (!response.ok && !apiError));
          if (attempt === 1 && shouldRetry) {
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }
          // A verdict about the VIDEO (private / deleted / a livestream) is
          // final; only provider trouble earns the browser rescue.
          const definitiveVideoError =
            apiError?.code === "VIDEO_PRIVATE" ||
            apiError?.code === "VIDEO_NOT_FOUND" ||
            apiError?.code === "UNSUPPORTED_URL" ||
            apiError?.code === "INVALID_URL";
          if (isYouTube && !definitiveVideoError) {
            const rescued = await tryBrowserRescue();
            if (rescued) {
              payload = rescued;
              succeeded = true;
              break;
            }
          }
          if (abortRef.current !== controller) return;
          fail(apiError);
          return;
        } catch (networkError) {
          if (networkError instanceof DOMException && networkError.name === "AbortError") throw networkError;
          if (abortRef.current !== controller) return;
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }
          throw networkError;
        }
      }

      if (!succeeded || !payload || !payload.ok) {
        if (abortRef.current !== controller) return;
        fail(lastApiError);
        return;
      }

      lastFailureRef.current = null;
      setVideo(payload.video);
      setMedia(payload.media);
      setStatus("success");
      // Persist for Back/Forward/refresh survival (see restore effect below).
      saveLastResult(url, payload.video, payload.media);
      setAdRefreshKey((key) => key + 1);
      notify({
        kind: "success",
        title: "Stream ready",
        description:
          payload.video.quality === "hd"
            ? `HD ${PLATFORMS[payload.media.platform].videoNoun} source, no watermark.`
            : "Clean source stream resolved.",
      });

    } catch (requestError) {
      // A newer submission (or a reset) owns the UI now; do not clobber it.
      if (abortRef.current !== controller) return;
      const timedOut =
        requestError instanceof DOMException && requestError.name === "AbortError";
      const message = timedOut
        ? "The resolver timed out. Try again in a moment."
        : "Network error. Check your connection and try again.";
      lastFailureRef.current = { url, at: Date.now() };
      setStatus("idle");
      setBackupNote(null);
      setError(message);
      notify({
        kind: "error",
        title: timedOut ? "Request timed out" : "Network error",
        description: timedOut
          ? "The server is responding slowly — retry shortly."
          : "Check your connection, then retry.",
      });
    } finally {
      if (abortRef.current === controller) {
        stopTicker();
        if (timeout !== null) window.clearTimeout(timeout);
        abortRef.current = null;
      }
    }
  }


  return (
    <div
      id="tool"
      data-ad-guard="tool"
      // Result mode drives the page layout: the hero column swaps its copy for
      // the sponsor showcase (see globals.css `.hero-stage`) so the result card
      // is never squashed beside a giant empty void.
      data-stage={status === "success" ? "result" : "idle"}
      className="relative scroll-mt-24"
    >

      {/* Ambient halo behind the tool — a pre-painted radial gradient, not a
          blur filter, so it costs nothing to composite. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 bottom-6 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 0%, var(--accent-soft), transparent 70%)",
        }}
      />

      {/* Segmented platform switcher sits directly above the URL input on
          tablet and up. On phones the sticky header already carries the same
          three destinations, so the duplicate control is dropped. */}
      <div className="hidden sm:block">
        <PlatformSwitcher active={platform} />
      </div>

      <div className="panel mt-2 overflow-hidden p-3 sm:mt-3 sm:p-6">
        {/* Lit top edge — one hairline of neon, the only chrome on the card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent"
        />

        {/* Panel header: real system state, never fake telemetry. */}
        <div className="flex items-center justify-between gap-3 pb-2 sm:pb-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex size-2 shrink-0">
              {isLoading ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--warn)]/60" />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative size-2 rounded-full",
                  isLoading
                    ? "bg-[var(--warn)]"
                    : status === "success"
                      ? "bg-[var(--ok)] shadow-[0_0_10px_var(--ok)]"
                      : "bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]",
                )}
              />
            </span>
            <span className="micro whitespace-nowrap">
              {isLoading ? t.resolving : status === "success" ? t.streamReady : t.ready}
            </span>
          </div>
          <span className="micro hidden shrink-0 whitespace-nowrap sm:block">
            {PLATFORMS[platform].panelTag}
          </span>
        </div>

        {/* URL input lives in its own component so typing never re-renders
            the page, the result panel, or the toast stack. */}
        <UrlField
          inputRef={inputRef}
          seed={seed}
          busy={isLoading}
          error={error}
          platform={platform}
          onSubmitUrl={handleGateSubmit}
          onRetry={retryLastResolve}
          onNotify={notify}
          copy={t}
        />

        <UrlPrefixTip />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-[var(--text-2)] sm:text-sm">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0 text-[var(--ok)]" />
            <span>{t.privacy}</span>
          </span>
          <button
            type="button"
            onClick={loadSample}
            className="group inline-flex shrink-0 items-center gap-1 underline-offset-4 transition-colors duration-200 hover:text-[var(--text-2)] hover:underline"
          >
            {t.sample}
            <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />
          </button>
        </div>

        {/* SnapTik "ad sandwich" — top slice. A high-visibility banner sits
            between the URL input card and the result/features zone, where
            eyes already are at the moment a resolve happens. In document
            flow, CLS-safe, and refreshed (throttled inside AdSlot) on every
            new video so the banner re-auctions instead of going stale. */}
        <div className="mt-4 flex justify-center">
          <AdSlot
            slot="tool-bar"
            format="leaderboard"
            eager
            refreshKey={adRefreshKey}
            className="max-w-[340px] sm:max-w-none"
            label="Sponsored — keeps LAMP TIK free"
          />
        </div>

        <>
          {isLoading ? (
            <div key="loading" className="overflow-hidden">
              <LoadingConsole elapsedMs={elapsedMs} platform={platform} copy={t} />
              {backupNote ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-2.5 py-1 text-xs font-medium text-[var(--warn)]"
                >
                  <Loader2 className="size-3 animate-spin" />
                  {backupNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Result reveal: transform + opacity ONLY — compositor-friendly
              60fps on mobile, no layout-driven height animation, no blur. */}
          {status === "success" && video && media ? (
            <div
              key={`result-${video.id}`}
              ref={resultRef}
              className="result-reveal mt-5"
            >
              <div className="rule mb-5" />
              <ResultPanel
                media={media}
                video={video}
                onReset={reset}
                onNotify={notify}
                refreshKey={adRefreshKey}
                onReresolve={(url) => void submitRef.current(url, { force: true })}
                copy={t}
              />
            </div>
          ) : null}
        </>
      </div>

      {/* Notifications render IN-FLOW below the tool buttons as solid opaque
          blocks — never a floating overlay on top of the form (on 390px
          screens the old fixed toast sat over the Download CTA with the
          button text bleeding through). */}
      <div className="mt-3">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>

      {/* Keyboard hint: desktop only — mobile users tap the Paste button. */}
      <p className="mt-3 hidden items-center gap-1.5 text-xs text-[var(--text-2)] sm:flex sm:text-sm">
        <Sparkles className="size-3.5 shrink-0 text-[var(--accent-text)]" />
        Press
        <kbd className="rounded-lg border border-[var(--glass-border)] bg-[var(--field)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-2)]">
          Enter
        </kbd>
        to fetch ·
        <kbd className="rounded-lg border border-[var(--glass-border)] bg-[var(--field)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-2)]">
          Esc
        </kbd>
        to clear
      </p>

      {/* Mobile sponsor card. The High-Speed partner offer used to live only in
          the desktop rails (`xl:` and up), which nine out of ten visitors never
          see. In flow below the tool — never floating over a button, and never
          disguised as a download: the label says partner and the click leaves
          the site. */}
      {directLinkUrl ? (
        <a
          href={directLinkUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          className="mt-3 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 transition-colors duration-200 hover:border-amber-400/45 hover:bg-amber-500/[0.11] xl:hidden"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
            <Zap aria-hidden="true" className="size-3.5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--text)]">
              High-speed download partner
              <span className="rounded-full border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                {t.sponsored}
              </span>
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-3)]">
              Bonus offer from our partner — opens in a new tab.
            </span>
          </span>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-[var(--text-3)]" />
        </a>
      ) : null}
    </div>
  );
}
