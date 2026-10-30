"use client";

import { ExternalLink, Loader2, Play, Timer, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import {
  bumpVideoGateCount,
  hilltopVastUrl,
  readVideoGateCount,
  videoGateSeconds,
} from "@/lib/monetization";

/**
 * HilltopAds VAST video gate.
 *
 * Opens on submit, runs a 10 s countdown for the first three resolves of the
 * session and 30 s afterwards, then calls `onComplete()` exactly once. The
 * countdown is a wall-clock deadline, not a chain of timeouts tied to the ad:
 * a blocked / empty / slow VAST response can only change what is painted
 * inside the card, never whether (or when) the gate closes. That is the one
 * rule this component must never break — an ad failure that traps the tool is
 * the exact production failure the old overlay ads caused.
 *
 * No remote script runs here. The VAST XML is parsed with DOMParser, the
 * creative plays in a plain <video>, and the only network effects are the
 * ad's own impression / tracking pixels.
 */

const VAST_FETCH_TIMEOUT_MS = 8_000;
const MAX_WRAPPER_HOPS = 3;
/** A parsed creative is reusable for this long; long enough for a paste, short
 *  enough that a paused campaign cannot keep serving a stale media URL. */
const VAST_CACHE_MS = 90_000;

interface VastCreative {
  mediaUrl: string;
  mediaType: string;
  impressions: string[];
  trackings: Record<string, string[]>;
  clickThrough: string | null;
  clickTrackings: string[];
}

interface VastPixels {
  impressions: string[];
  trackings: Record<string, string[]>;
}

type GatePhase = "loading" | "ready" | "fallback";

/** Namespace-agnostic tag lookup (`<VAST xmlns=…>` prefixes vary by vendor). */
function xmlTags(root: Document | Element, tag: string): Element[] {
  const namespaced = root.getElementsByTagNameNS("*", tag);
  if (namespaced.length > 0) return Array.from(namespaced);
  return Array.from(root.getElementsByTagName(tag));
}

function textOf(node: Element | undefined): string {
  return (node?.textContent ?? "").trim();
}

/** Tracking beacons are raw URLs — never normalise away their signature. */
function beaconUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 4_096) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/^http:\/\//i, "https://") : null;
}

/** A playable creative URL (http CDNs are upgraded; CSP does the same). */
function mediaUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_048) return null;
  const upgraded = trimmed.replace(/^http:\/\//i, "https://");
  return /^https:\/\//i.test(upgraded) ? upgraded : null;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function pixelUrls(root: Document | Element, tag: string): string[] {
  return unique(
    xmlTags(root, tag)
      .map((node) => beaconUrl(textOf(node)))
      .filter((url): url is string => Boolean(url)),
  );
}

function trackingPixels(root: Document | Element): Record<string, string[]> {
  const events: Record<string, string[]> = {};
  for (const node of xmlTags(root, "Tracking")) {
    const event = (node.getAttribute("event") ?? "").trim().toLowerCase();
    const url = beaconUrl(textOf(node));
    if (!event || !url) continue;
    events[event] = unique([...(events[event] ?? []), url]);
  }
  return events;
}

function mergePixels(base: VastPixels, root: Document | Element): VastPixels {
  const trackings = { ...base.trackings };
  for (const [event, urls] of Object.entries(trackingPixels(root))) {
    trackings[event] = unique([...(trackings[event] ?? []), ...urls]);
  }
  return {
    impressions: unique([...base.impressions, ...pixelUrls(root, "Impression")]),
    trackings,
  };
}

function creativeFromInline(inline: Element, inherited: VastPixels): VastCreative | null {
  const candidates = xmlTags(inline, "MediaFile")
    .map((node) => ({
      url: mediaUrl(textOf(node)),
      type: (node.getAttribute("type") ?? "").toLowerCase(),
      height: Number(node.getAttribute("height") ?? 0) || 0,
      bitrate: Number(node.getAttribute("bitrate") ?? 0) || 0,
    }))
    .filter(
      (entry): entry is { url: string; type: string; height: number; bitrate: number } =>
        Boolean(entry.url) && (entry.type.startsWith("video/mp4") || entry.type.startsWith("video/webm")),
    )
    .sort(
      (a, b) =>
        Number(b.type.includes("mp4")) - Number(a.type.includes("mp4")) ||
        b.height - a.height ||
        b.bitrate - a.bitrate,
    );

  const best = candidates[0];
  if (!best) return null;

  const pixels = mergePixels(inherited, inline);
  return {
    mediaUrl: best.url,
    mediaType: best.type,
    impressions: pixels.impressions,
    trackings: pixels.trackings,
    clickThrough: beaconUrl(textOf(xmlTags(inline, "ClickThrough")[0])),
    clickTrackings: pixelUrls(inline, "ClickTracking"),
  };
}

/**
 * One VAST document → either a creative or the wrapper's next URL. Wrapper
 * pixels are inherited by the wrapped creative, which is how the network
 * counts an impression served through a resold tag.
 */
function readVast(
  xml: string,
  inherited: VastPixels,
): { creative: VastCreative; } | { nextUrl: string; pixels: VastPixels } {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("VAST XML could not be parsed.");
  }

  const inline = xmlTags(doc, "InLine")[0];
  if (inline) {
    const creative = creativeFromInline(inline, inherited);
    if (creative) return { creative };
    throw new Error("VAST in-line ad has no playable media.");
  }

  const wrapper = xmlTags(doc, "Wrapper")[0];
  if (!wrapper) throw new Error("VAST response has no ad.");
  const pixels = mergePixels(inherited, wrapper);
  const nextUrl = beaconUrl(textOf(xmlTags(wrapper, "VASTAdTagURI")[0]));
  if (!nextUrl) throw new Error("VAST wrapper has no ad tag URI.");
  return { nextUrl, pixels };
}

async function loadVast(url: string, signal: AbortSignal): Promise<VastCreative> {
  let current = url;
  let inherited: VastPixels = { impressions: [], trackings: {} };

  for (let hop = 0; hop < MAX_WRAPPER_HOPS; hop += 1) {
    const response = await fetch(current, {
      cache: "no-store",
      signal,
      headers: { Accept: "text/xml, application/xml, */*" },
    });
    if (!response.ok) throw new Error(`VAST request answered ${response.status}.`);
    const xml = await response.text();
    if (!xml.includes("<VAST")) throw new Error("VAST response was empty.");

    const result = readVast(xml, inherited);
    if ("creative" in result) return result.creative;
    inherited = result.pixels;
    current = result.nextUrl;
  }
  throw new Error("VAST wrapper chain is too deep.");
}

interface VastCacheEntry {
  at: number;
  promise: Promise<VastCreative>;
}

/** One in-memory creative per page, shared by the prefetch and the gate. */
let vastCache: VastCacheEntry | null = null;

/** Fetch + parse with its own timeout, independent of any component mount. */
function requestVast(): Promise<VastCreative> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), VAST_FETCH_TIMEOUT_MS);
  return loadVast(hilltopVastUrl, controller.signal).finally(() => window.clearTimeout(timeout));
}

/**
 * Warm the VAST request on the first real interaction.
 *
 * The gate used to start its request only after Submit, so the visitor watched
 * "Loading sponsored video…" for the network round trip. Prefetching on the
 * first tap or keypress moves that round trip into the time the visitor is
 * already spending pasting a link. Parsing is side-effect free: impressions,
 * quartiles and clicks are still fired only by the actual playback in the
 * gate, so no impression is counted twice.
 */
export function prefetchVideoAd(): void {
  if (typeof window === "undefined") return;
  if (vastCache && Date.now() - vastCache.at < VAST_CACHE_MS) return;
  const entry: VastCacheEntry = { at: Date.now(), promise: requestVast() };
  vastCache = entry;
  void entry.promise.catch(() => {
    if (vastCache === entry) vastCache = null;
  });
}

/** Ad pixels are fire-and-forget; CORS never blocks a no-cors GET. */
function firePixel(url: string): void {
  try {
    void fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", keepalive: true }).catch(
      () => undefined,
    );
  } catch {
    // Blocked by the browser / an extension: the gate must not care.
  }
}

interface VideoAdGateProps {
  open: boolean;
  /** Fired exactly once, when the countdown reaches zero (or immediately after 0). */
  onComplete: () => void;
}

export function VideoAdGate({ open, onComplete }: VideoAdGateProps) {
  const [phase, setPhase] = useState<GatePhase>("loading");
  const [creative, setCreative] = useState<VastCreative | null>(null);
  const [totalMs, setTotalMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [muted, setMuted] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  /** False until the deadline is armed — avoids a one-frame "0s" flash. */
  const [countdownStarted, setCountdownStarted] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const deadlineRef = useRef(0);
  const finishedRef = useRef(false);
  const firedRef = useRef<Set<string>>(new Set());
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Wall-clock countdown. Independent of the VAST request on purpose: the
  // modal closes after 10 s / 30 s even when every ad request is blocked.
  useEffect(() => {
    if (!open) return;
    const total = videoGateSeconds(readVideoGateCount()) * 1_000;
    deadlineRef.current = Date.now() + total;
    finishedRef.current = false;
    setTotalMs(total);
    setRemainingMs(total);
    setCountdownStarted(true);

    const tick = () => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(left);
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        window.clearInterval(interval);
        bumpVideoGateCount();
        onCompleteRef.current();
      }
    };
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [open]);

  // Reset per-open state and lock the page behind the card.
  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setCreative(null);
    setNeedsTap(false);
    setVideoFailed(false);
    setMuted(true);
    firedRef.current = new Set();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  // Disarm only when the gate closes: disarming inside the open-reset effect
  // would run AFTER the countdown effect and leave the label frozen at its
  // first value while the timer silently ran out.
  useEffect(() => {
    if (!open) setCountdownStarted(false);
  }, [open]);

  // Fetch + parse the tag, reusing the interaction-time prefetch when it is
  // still fresh. Any failure (ad-blocker, 404, empty, wrapper loop) paints the
  // house sponsor card; the countdown above is untouched.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    let entry = vastCache && Date.now() - vastCache.at < VAST_CACHE_MS ? vastCache : null;
    if (!entry) {
      entry = { at: Date.now(), promise: requestVast() };
      const created = entry;
      vastCache = created;
      void created.promise.catch(() => {
        if (vastCache === created) vastCache = null;
      });
    }

    void entry.promise.then(
      (found) => {
        if (cancelled) return;
        setCreative(found);
        setPhase("ready");
      },
      () => {
        if (!cancelled) setPhase("fallback");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Warm one creative per page on the first real interaction. The listener is
  // removed after it fires, so a long visit never refetches the tag.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const warm = () => prefetchVideoAd();
    window.addEventListener("pointerdown", warm, { once: true, passive: true });
    window.addEventListener("keydown", warm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", warm);
      window.removeEventListener("keydown", warm);
    };
  }, []);

  useEffect(() => {
    if (phase !== "ready" || videoFailed) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const attempt = video.play();
    if (attempt) {
      void attempt.catch(() => setNeedsTap(true));
    }
  }, [phase, creative, videoFailed]);

  const markFired = useCallback((event: string, urls: string[] | undefined) => {
    if (!urls?.length) return;
    for (const url of urls) {
      const key = `${event}:${url}`;
      if (firedRef.current.has(key)) continue;
      firedRef.current.add(key);
      firePixel(url);
    }
  }, []);

  const openSponsor = useCallback(() => {
    if (!creative?.clickThrough) return;
    markFired("click", creative.clickTrackings);
    window.open(creative.clickThrough, "_blank", "noopener,noreferrer");
  }, [creative, markFired]);

  const toggleMuted = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
    if (!next) {
      void video.play().catch(() => {
        video.muted = true;
        setMuted(true);
        setNeedsTap(true);
      });
    }
  }, [muted]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Portal to <body>: the downloader sits inside animated (transformed)
  // wrappers, and a transformed ancestor makes `position: fixed` measure
  // against itself — on a phone that parked this gate a full screen below the
  // fold while `overflow: hidden` locked the page. The portal removes every
  // transformed ancestor from the containing-block chain.
  const canPortal = typeof document !== "undefined";
  if (!open || !canPortal) return null;

  const secondsLeft = countdownStarted
    ? Math.ceil(remainingMs / 1_000)
    : videoGateSeconds(readVideoGateCount());
  const progress =
    countdownStarted && totalMs > 0
      ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100))
      : 0;
  const showVideo = phase === "ready" && creative !== null && !videoFailed;

  return createPortal(
    // The site header pins itself at the CSS max z-index; a plain z-50 gate
    // would sit under it. The portal is the last body child, so this same
    // max value wins by document order and the header cannot be tapped
    // through the gate.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" style={{ zIndex: 2_147_483_647 }}>
      <div aria-hidden="true" className="absolute inset-0 bg-[#04050a]/85" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-gate-title"
        aria-describedby="video-gate-copy"
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[560px] flex-col overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#07080d] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)] outline-none"
      >
        <div aria-hidden="true" className="h-1 w-full shrink-0 bg-white/[0.06]">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <span className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
            Sponsored
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-[var(--text-2)]"
            aria-live="polite"
          >
            <Timer aria-hidden="true" className="size-3.5" />
            {secondsLeft}s
          </span>
        </div>

        <div className="px-4 pb-4 pt-3">
          <h2 id="video-gate-title" className="text-base font-semibold text-[var(--text-1)]">
            Your download starts in {secondsLeft}s
          </h2>
          <p id="video-gate-copy" className="mt-1 text-sm leading-relaxed text-[var(--text-2)]">
            This short sponsor break keeps LAMP TIK free. The timer keeps running even if the ad
            can’t load.
          </p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black">
            {showVideo ? (
              <div className="relative aspect-video w-full">
                {/* The creative is the click target, exactly like a normal
                    instream player. Muted autoplay keeps browser policy happy. */}
                <video
                  ref={videoRef}
                  src={creative.mediaUrl}
                  autoPlay
                  muted={muted}
                  playsInline
                  preload="auto"
                  onClick={openSponsor}
                  onPlaying={() => {
                    markFired("impression", creative.impressions);
                    markFired("start", creative.trackings.start);
                  }}
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
                    const fraction = video.currentTime / video.duration;
                    if (fraction >= 0.25) markFired("firstquartile", creative.trackings.firstquartile);
                    if (fraction >= 0.5) markFired("midpoint", creative.trackings.midpoint);
                    if (fraction >= 0.75) markFired("thirdquartile", creative.trackings.thirdquartile);
                  }}
                  onEnded={() => markFired("complete", creative.trackings.complete)}
                  onError={() => setVideoFailed(true)}
                  className="h-full w-full cursor-pointer object-contain"
                />
                {needsTap ? (
                  <button
                    type="button"
                    onClick={() => {
                      const video = videoRef.current;
                      if (!video) return;
                      video.muted = true;
                      setMuted(true);
                      void video.play().then(
                        () => setNeedsTap(false),
                        () => undefined,
                      );
                    }}
                    className="absolute inset-0 grid place-items-center bg-black/55 text-white"
                  >
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/55 px-4 py-2 text-sm font-medium">
                      <Play aria-hidden="true" className="size-4" />
                      Tap to play
                    </span>
                  </button>
                ) : null}
              </div>
            ) : phase === "loading" ? (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-[#080a12] text-[var(--text-2)]">
                <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                <p className="text-sm">Loading sponsored video…</p>
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 bg-[radial-gradient(120%_120%_at_50%_0%,#12203a_0%,#080a12_62%,#05060a_100%)] px-6 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/80">
                  House sponsor
                </span>
                <p className="text-sm font-medium text-white">Your video is almost ready.</p>
                <p className="max-w-[320px] text-xs leading-relaxed text-slate-300/80">
                  No extra clicks needed — the download begins automatically when the timer ends.
                </p>
              </div>
            )}
          </div>

          {showVideo ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleMuted}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--text-1)] transition-colors hover:bg-white/[0.08]"
              >
                {muted ? (
                  <Volume2 aria-hidden="true" className="size-3.5" />
                ) : (
                  <VolumeX aria-hidden="true" className="size-3.5" />
                )}
                {muted ? "Unmute sound" : "Mute"}
              </button>
              {creative.clickThrough ? (
                <button
                  type="button"
                  onClick={openSponsor}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/15"
                >
                  Visit sponsor
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-3)]">
              Your download begins automatically when the timer ends.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
