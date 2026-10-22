"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, Play, ShieldCheck } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import {
  adsterraBannerKey,
  adsterraRectangleKey,
  videoAdMp4Url,
} from "@/lib/monetization";

const COUNTDOWN_SECONDS = 10;

export function ThirdDownloadModal({
  open,
  filename,
  onClose,
  onRelease,
}: {
  open: boolean;
  filename: string | null;
  onClose: () => void;
  onRelease: () => void;
}) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const releasedRef = useRef(false);
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const release = useCallback(() => {
    if (releasedRef.current) return;
    releasedRef.current = true;
    onReleaseRef.current();
  }, []);

  const closeAfterRelease = useCallback(() => {
    if (releasedRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setRemaining(COUNTDOWN_SECONDS);
      return;
    }

    setRemaining(COUNTDOWN_SECONDS);
    releasedRef.current = false;
    // NOTE: the Monetag Vignette is deliberately NOT fired here. Its script
    // injects a fixed, full-viewport iframe at `z-index: 2147483647` the
    // moment it runs, so it would sit on top of this dialog and steal the
    // "Continue" click — the download could never start. The vignette is
    // fired once the file is already handed to the browser instead (see
    // `onRelease` in result-panel).

    const startedAt = Date.now();
    const ticker = window.setInterval(() => {
      const next = Math.max(0, COUNTDOWN_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(ticker);
        release();
      }
    }, 250);

    return () => window.clearInterval(ticker);
  }, [open, release]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && releasedRef.current) onClose();
      else if (event.key === "Escape") event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const ready = remaining === 0;
  const progress = ((COUNTDOWN_SECONDS - remaining) / COUNTDOWN_SECONDS) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sponsored video ad — your download starts after the ad"
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-3 sm:p-5"
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
        onClick={closeAfterRelease}
      />
      <section className="panel relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#090d14] p-4 text-left shadow-[0_30px_100px_-30px_rgba(0,0,0,0.9)] sm:p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-100">
            🎬 Sponsored Video Ad · Plays every 3rd download
          </span>
          <span role="status" aria-live="polite" className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-cyan-100">
            {ready ? "Your download is starting…" : `Your download starts in ${remaining}s…`}
          </span>
        </header>

        <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_35%,rgba(14,165,233,0.25),transparent_45%),linear-gradient(135deg,#08121f,#12131f_55%,#090b12)]">
          <div className="absolute inset-x-0 top-0 z-20 h-1 bg-white/10">
            <div className="h-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          {videoAdMp4Url ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={videoAdMp4Url}
              autoPlay
              muted
              playsInline
              loop
              controls
              preload="metadata"
              aria-label="Sponsored video advertisement"
            />
          ) : (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -left-1/4 top-1/3 h-40 w-40 animate-pulse rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -right-1/4 top-1/4 h-48 w-48 animate-pulse rounded-full bg-fuchsia-500/20 blur-3xl [animation-delay:700ms]" />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div className="mx-auto max-w-sm px-5">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-100/10 text-cyan-100 shadow-[0_0_50px_-10px_rgba(34,211,238,0.5)]">
                    <Play className="ml-0.5 size-6" fill="currentColor" />
                  </span>
                  <p className="mt-4 text-xs font-medium text-cyan-100/70">LAMP TIK · Sponsor spotlight</p>
                  <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">Your next video deserves unlimited speed.</h2>
                  <p className="mt-2 text-xs text-white/65 sm:text-sm">High-speed streaming · HD playback · no waiting</p>
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto">
              <AdSlot format="rectangle" label="Sponsored video theater ad" zoneId={adsterraRectangleKey} />
            </div>
            <div className="pointer-events-auto hidden sm:block">
              <AdSlot format="leaderboard" label="Sponsored video theater banner" zoneId={adsterraBannerKey} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{ready ? "Your download is ready" : "Preparing your download…"}</p>
            <p className="mt-0.5 truncate text-xs text-white/55">{filename ? `Queued: ${filename}` : "Your selected video is safely queued."}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {ready ? (
              <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-emerald-950">
                <Check className="size-4" /> Download Started! Close Window
              </button>
            ) : (
              <button type="button" disabled className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/50">
                <LockKeyhole className="size-3.5" /> ⏳ Preparing Your HD Video... (Wait {remaining}s)
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-white/40"><ShieldCheck className="size-3 text-emerald-300" /> Your queued file starts automatically when the timer completes.</p>
      </section>
    </div>
  );
}
