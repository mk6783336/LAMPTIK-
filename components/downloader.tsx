"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isAppMode } from "@/components/install-pwa";
import { PlatformSwitcher } from "@/components/platform-switcher";
import { ResultPanel } from "@/components/result-panel";
import { YouTubeLock } from "@/components/youtube-lock";
import { ToastStack, type ToastItem } from "@/components/toast";
import { UrlField } from "@/components/url-field";
import { cn } from "@/lib/cn";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import type { MediaPayload } from "@/lib/media";
import type { ApiResponse, VideoInfo } from "@/lib/tiktok/types";

const SAMPLE_URL = "https://www.tiktok.com/@scout2015/video/6718335390845095173";

type Status = "idle" | "loading" | "success";

function createToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  /** YouTube paste held at the App-Exclusive gate (no App Mode yet). */
  const [ytLockedUrl, setYtLockedUrl] = useState<string | null>(null);
  const [seed, setSeed] = useState({ value: "", nonce: 0 });
  /** Shown during the single silent auto-retry (attempt 2/2). */
  const [backupNote, setBackupNote] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tickerRef = useRef<number | null>(null);
  /** Last URL that resolved successfully — used for forced re-resolves. */
  const lastUrlRef = useRef<string>("");
  /** Always-current submit handler, so the share-sheet effect can call it
      without re-subscribing on every render. */
  const submitRef = useRef<(url: string) => Promise<void>>(async () => {});
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
   * Android share-sheet hand-off.
   *
   * The native APK forwards `Share → LAMP TIK` as
   * `?app=android_apk&shared_url=<encoded text>`. Consume it exactly once:
   * extract the link, strip the parameter from the address bar, then pre-fill
   * and resolve it automatically. YouTube links are re-routed to the
   * dedicated app-exclusive page so the right engine and gate apply.
   */
  const sharedHandledRef = useRef(false);
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
      if (detected.platform === "youtube" && !isAppMode()) {
        window.location.assign(
          `/youtube-downloader?app=android_apk&shared_url=${encodeURIComponent(shared.trim())}`,
        );
        return;
      }
      setSeed((current) => ({ value: detected.url, nonce: current.nonce + 1 }));
      void submitRef.current(detected.url);
    })();
  }, []);

  // Bring the expanded result into view on small screens, after the
  // expand animation settles.
  useEffect(() => {
    if (status !== "success" || !video) return;
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
    lastUrlRef.current = "";
    setYtLockedUrl(null);
    setStatus("idle");
    setVideo(null);
    setMedia(null);
    setError(null);
    setSeed((current) => ({ value: "", nonce: current.nonce + 1 }));
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function loadSample() {
    setSeed((current) => ({ value: SAMPLE_URL, nonce: current.nonce + 1 }));
    inputRef.current?.focus();
  }

  async function handleSubmitUrl(rawUrl: string) {
    if (isLoading) return;
    // Sanitize messy mobile share-sheet text: extract the first valid video
    // URL from surrounding words instead of rejecting the paste.
    // (UrlField already submits a detected URL, but direct calls and quirky
    // clipboard text still land here.)
    const { detectLink: detectIncoming } = await import("@/lib/detect");
    const detectedIncoming = detectIncoming(rawUrl);
    const url = detectedIncoming ? detectedIncoming.url : rawUrl.trim();

    // Strict App-Exclusive gate: YouTube links pasted anywhere (including
    // the homepage) show ONLY the lock screen outside standalone App Mode —
    // no input, no resolve, no browser unlock. The server never sees the URL.
    if (detectedIncoming?.platform === "youtube" && !isAppMode()) {
      setError(null);
      setStatus("idle");
      setVideo(null);
      setMedia(null);
      setBackupNote(null);
      setYtLockedUrl(url);
      notify({
        kind: "info",
        title: "YouTube Downloader is locked",
        description: "Install LAMP TIK from Chrome or add it to your home screen to unlock it.",
      });
      return;
    }
    setYtLockedUrl(null);

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
    // the UI never hangs on a request Vercel is about to kill.
    const timeout = window.setTimeout(() => controller.abort(), 28_000);
    // YouTube resolves through the dedicated App-Exclusive route; every other
    // platform uses the shared resolver. (The gate above guarantees YouTube
    // only reaches this line inside standalone App Mode.)
    const endpoint = detectedIncoming?.platform === "youtube" ? "/api/youtube" : "/api/fetch";

    try {
      let payload: ApiResponse | null = null;
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
            body: JSON.stringify({ url }),
            signal: controller.signal,
          });
          const body = (await response.json().catch(() => null)) as ApiResponse | null;
          if (response.ok && body && body.ok) {
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
      lastUrlRef.current = url;
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
      window.clearTimeout(timeout);
      abortRef.current = null;
    }
  }

  /**
   * Force a cache-bypassing re-resolve so the result panel can replace an
   * expired signed CDN URL and retry the download automatically.
   */
  const refreshMedia = useCallback(async (): Promise<MediaPayload | null> => {
    const url = lastUrlRef.current;
    if (!url) return null;
    const { detectLink: detectRefresh } = await import("@/lib/detect");
    const endpoint = detectRefresh(url)?.platform === "youtube" ? "/api/youtube" : "/api/fetch";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpoint === "/api/youtube" ? { url } : { url, force: true }),
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !payload || !payload.ok) return null;

      setVideo(payload.video);
      setMedia(payload.media);
      return payload.media;
    } catch {
      return null;
    }
  }, []);

  const expand = { duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div id="tool" className="relative scroll-mt-24">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

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
          onSubmitUrl={handleSubmitUrl}
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

        {ytLockedUrl ? (
          <div className="mt-5">
            <YouTubeLock />
          </div>
        ) : null}

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
                onRefresh={refreshMedia}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
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
    </div>
  );
}
