"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";


import { PlatformSwitcher } from "@/components/platform-switcher";
import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";
import { ResultPanel } from "@/components/result-panel";
import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdGate } from "@/components/ads/VideoAdGate";
import { clientMirrorStreams, clientOembedMeta } from "@/lib/youtube-client";

import { ToastStack, type ToastItem } from "@/components/toast";
import { UrlField } from "@/components/url-field";
import { cn } from "@/lib/cn";
import { PLATFORMS, type Platform } from "@/lib/platforms";
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
const RESCUE_MIRROR_TIMEOUT_MS = 6_000;

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
  const [meta, mirror] = await Promise.all([
    clientOembedMeta(videoId),
    Promise.race([
      clientMirrorStreams(videoId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RESCUE_MIRROR_TIMEOUT_MS)),
    ]),
  ]);
  if (!mirror) return null;

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
  "Trying HD mirrors (1080p / 720p / MP3)",
  "Preparing instant download buttons",
] as const;

/**
 * Live resolve timeline. The three stages are revealed by real elapsed time
 * (the timer is a measurement, not decoration) so the user always sees
 * forward motion and a truthful duration — no frozen button, no mystery
 * spinner, no fake percentage.
 */
function LoadingConsole({ elapsedMs, platform }: { elapsedMs: number; platform: Platform }) {
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
          <span className="truncate text-sm font-medium">
            {isYouTube ? "Resolving high-speed stream…" : "Analyzing stream…"}
          </span>
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
        <AdSlot format="rectangle" eager alwaysReserve label="Sponsored — keeps LAMP TIK free" />
      </div>
    </div>
  );
}

interface DownloaderProps {
  /** Which platform page this shell lives on — default accent + copy. */
  platform?: Platform;
}

export function Downloader({ platform = "tiktok" }: DownloaderProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [media, setMedia] = useState<MediaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [seed, setSeed] = useState({ value: "", nonce: 0 });
  /** Incremented on every resolve / reset so the ad slots re-auction for a
      fresh impression (see AdSlot's throttled `refreshKey`). */
  const [adRefreshKey, setAdRefreshKey] = useState(0);
  /** Shown during the single silent auto-retry (attempt 2/2). */
  const [backupNote, setBackupNote] = useState<string | null>(null);
  /** A user-submitted link waiting behind the HilltopAds video gate. */
  const [gateUrl, setGateUrl] = useState<string | null>(null);

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
  const reduceMotion = useReducedMotion();

  const isLoading = status === "loading";

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<ToastItem, "id">) => {
    setToasts((current) => [...current.slice(-2), { ...toast, id: createToastId() }]);
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
    if (new URLSearchParams(window.location.search).has("shared_url")) return;
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

  // Bring the expanded result into view on small screens, after the
  // expand animation settles. Suppressed on the cached Back/refresh
  // restore: the browser is already showing the exact spot the visitor
  // left — yanking the page down to the card would read as a hijack.
  useEffect(() => {
    if (status !== "success" || !video) return;
    if (skipNextResultScrollRef.current) {
      skipNextResultScrollRef.current = false;
      return;
    }
    const timer = window.setTimeout(
      () => {
        const node = resultRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
          window.scrollTo({
            top: Math.max(0, window.scrollY + rect.top - 112),
            behavior: reduceMotion ? "auto" : "smooth",
          });
        }
      },
      reduceMotion ? 0 : 420,
    );
    return () => window.clearTimeout(timer);
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
      title: "MP3 ready",
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
    if (isLoading || gateUrl) return;
    setError(null);
    setGateUrl(rawUrl);
  }

  function handleGateComplete() {
    const pendingUrl = gateUrl;
    setGateUrl(null);
    if (!pendingUrl) return;
    void handleSubmitUrl(pendingUrl);
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

    setError(null);
    setStatus("loading");
    setVideo(null);
    setMedia(null);
    setElapsedMs(0);
    setBackupNote(null);

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

    try {
      let payload: ApiSuccess | null = null;
      let lastApiError: { message?: string; hint?: string; code?: string } | null = null;
      let succeeded = false;
      // Smart client-side auto-healing: one silent background retry
      // (attempt 2/2) on transient hiccups before ever showing an error.
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
          const retriableCode =
            apiError?.code === "PROVIDER_UNAVAILABLE" || apiError?.code === "UPSTREAM_ERROR";
          if (attempt === 1 && (transient || retriableCode || !response.ok)) {
            // Silent retry once; the badge above reassures while we do.
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }
          const message = apiError?.message ?? "Couldn’t resolve this video.";
          // A verdict about the VIDEO (private / deleted / a livestream) is
          // final; only provider trouble earns a 6s mirror rescue.
          const definitiveVideoError =
            apiError?.code === "VIDEO_PRIVATE" ||
            apiError?.code === "VIDEO_NOT_FOUND" ||
            apiError?.code === "UNSUPPORTED_URL" ||
            apiError?.code === "INVALID_URL";
          if (isYouTube && !definitiveVideoError) {
            // Server engines exhausted (datacenter-IP blocks) — the visitor's
            // own residential IP takes over: browser-direct converter jobs +
            // CORS mirrors. This is the SaveFrom/Y2Mate architecture.
            setStatus("loading");
            const rescued = await rescueYouTubeFromBrowser({
              rawUrl: url,
              signal: controller.signal,
              onNote: (note) => setBackupNote(note),
              onMergeAudio: mergeAudioClaim,
              onMergeVideo: mergeVideoClaim,
            });
            if (rescued) {
              payload = rescued;
              succeeded = true;
              break;
            }
            setStatus("idle");
          }
          setStatus("idle");
          setBackupNote(null);
          setError(message);
          notify({ kind: "error", title: message, description: apiError?.hint });
          return;
        } catch (networkError) {
          if (networkError instanceof DOMException && networkError.name === "AbortError") throw networkError;
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }
          throw networkError;
        }
      }
      setBackupNote(null);
      if ((!succeeded || !payload || !payload.ok) && isYouTube) {
        const lastCode = lastApiError?.code;
        if (lastCode === "VIDEO_PRIVATE" || lastCode === "VIDEO_NOT_FOUND") {
          setStatus("idle");
          setError(lastApiError?.message ?? "Couldn’t resolve this video.");
          notify({ kind: "error", title: "Video unavailable", description: lastApiError?.hint });
          return;
        }
        // Last-resort browser-direct rescue for YouTube (see rescueYouTubeFromBrowser).
        setStatus("loading");
        const rescued = await rescueYouTubeFromBrowser({
          rawUrl: url,
          signal: controller.signal,
          onNote: (note) => setBackupNote(note),
          onMergeAudio: mergeAudioClaim,
          onMergeVideo: mergeVideoClaim,
        });
        if (rescued) {
          payload = rescued;
          succeeded = true;
        }
      }
      if (!succeeded || !payload || !payload.ok) {
        const message = lastApiError?.message ?? "Couldn’t resolve this video.";
        setStatus("idle");
        setError(message);
        notify({ kind: "error", title: message, description: lastApiError?.hint });
        return;
      }

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
      const timedOut =
        requestError instanceof DOMException && requestError.name === "AbortError";
      setStatus("idle");
      setBackupNote(null);
      if (timedOut) {
        setError("The resolver timed out. Try again in a moment.");
        notify({
          kind: "error",
          title: "Request timed out",
          description: "TikTok is responding slowly — retry shortly.",
        });
      } else {
        setError("Network error. Check your connection and try again.");
        notify({
          kind: "error",
          title: "Network error",
          description: "Check your connection, then retry.",
        });
      }
    } finally {
      stopTicker();
      if (timeout !== null) window.clearTimeout(timeout);
      abortRef.current = null;
    }
  }

  const expand = { duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] as const };

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

      <div className="panel mt-3 overflow-hidden p-4 sm:p-6">
        {/* Lit top edge — one hairline of neon, the only chrome on the card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent"
        />

        {/* Panel header: real system state, never fake telemetry. */}
        <div className="flex items-center justify-between gap-3 pb-4">
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
              {isLoading ? "Resolving" : status === "success" ? "Stream ready" : "Ready"}
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
          onNotify={notify}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-[var(--text-2)] sm:text-sm">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0 text-[var(--ok)]" />
            <span>Server-side · nothing stored</span>
          </span>
          <button
            type="button"
            onClick={loadSample}
            className="group inline-flex shrink-0 items-center gap-1 underline-offset-4 transition-colors duration-200 hover:text-[var(--text-2)] hover:underline"
          >
            Try a sample
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
            format="leaderboard"
            eager
            refreshKey={adRefreshKey}
            className="max-w-[340px] sm:max-w-none"
            label="Sponsored — keeps LAMP TIK free"
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={expand}
              className="overflow-hidden"
            >
              <LoadingConsole elapsedMs={elapsedMs} platform={platform} />
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
            </motion.div>
          ) : null}

          {/* Result reveal: transform + opacity ONLY — compositor-friendly
              60fps on mobile, no layout-driven height animation, no blur. */}
          {status === "success" && video && media ? (
            <motion.div
              key={`result-${video.id}`}
              ref={resultRef}
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="mt-5"
            >
              <div className="rule mb-5" />
              <ResultPanel
                media={media}
                video={video}
                onReset={reset}
                onNotify={notify}
                refreshKey={adRefreshKey}
                onReresolve={(url) => void submitRef.current(url, { force: true })}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Notifications render IN-FLOW below the tool buttons as solid opaque
          blocks — never a floating overlay on top of the form (on 390px
          screens the old fixed toast sat over the Download CTA with the
          button text bleeding through). */}
      <div className="mt-3">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>

      {/* HilltopAds VAST gate — opens on submit, closes on its own clock, then
          hands the paused link to the resolver above. */}
      <VideoAdGate open={gateUrl !== null} onComplete={handleGateComplete} />

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
    </div>
  );
}
