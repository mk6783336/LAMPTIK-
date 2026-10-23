/* eslint-disable @next/next/no-img-element */
"use client";

import { AlertTriangle, Clock3, Download, Music2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { formatBytes, formatDuration } from "@/lib/format";
import type { ToastItem } from "@/components/toast";
import { AdSlot } from "@/components/ads/AdSlot";
import { PlatformIcon } from "@/components/platform-icons";
import { cn } from "@/lib/cn";
import { PLATFORMS } from "@/lib/platforms";
import { triggerDownloadDirectLink, monetagSmartlinkUrl } from "@/lib/monetization";
import { SocialShare } from "@/components/social-share";
import type { MediaPayload } from "@/lib/media";
import type { VideoInfo } from "@/lib/tiktok/types";

interface ResultPanelProps {
  /** Unified cross-platform payload — drives badges and download links. */
  media: MediaPayload;
  /** Full record (real TikTok data; synthesized for Instagram/Facebook). */
  video: VideoInfo;
  onReset: () => void;
  onNotify: (toast: Omit<ToastItem, "id">) => void;
  /** Bumped by the downloader on every resolve/reset; re-keys the banner
      slots for fresh impressions (throttled globally inside AdSlot). */
  refreshKey?: number;
}

/** One click's worth of sponsor theater. */
interface DownloadTheater {
  attemptId: number;
  secondsLeft: number;
  done: boolean;
  kind: string;
}

/**
 * SnapTik-style result card — instant, three servers, and a parallel
 * 10-second sponsor theater that never delays the file.
 *
 * Every download button is a real `<a>`: the browser's own navigation does
 * the work, and the file starts moving on the click itself (0 seconds of
 * waiting). In the SAME event, synchronously, the Monetag Direct Link opens
 * (popup blockers only honour `window.open` while the user activation is
 * alive) — and only after that does the panel transform, IN FLOW, into a
 * 10-second progress + center-stage banner theater that monetizes the wait
 * Chrome is already spending moving bytes in the background.
 *
 * By the time the response lands, every CDN URL the resolver returned has
 * been sorted into two transports:
 *   - Server 01 — the provider's own public CDN attachment (tikwm `play`/
 *     `hdplay`, loader.to `download_url`, instagram/facebook media CDN). It
 *     already sends `Content-Disposition: attachment`, so the visitor's own
 *     residential IP does the transfer from a `<a href={direct}>`.
 *   - Server 02 — this site's same-origin `/api/download?…` proxy stream,
 *     forced attachment, SSRF-checked, referer-corrected server-side.
 * If one transport ever refuses, the other button sits right below it.
 */
export function ResultPanel({ media, video, onReset, onNotify, refreshKey }: ResultPanelProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [theater, setTheater] = useState<DownloadTheater | null>(null);

  const platform = media.platform;
  const platformConfig = PLATFORMS[platform];

  /** Server 01: provider's own public CDN (falls back to the proxy). */
  const server01 = media.videoDirect ?? media.videoHd ?? video.downloads.video;
  const server01IsDirect = media.videoDirect !== null && media.videoDirect !== undefined;
  /** Server 02: the same-origin proxy — or a distinct SD rendition proxy. */
  const proxyVideo = media.videoHd ?? video.downloads.video;
  const server02 = server01IsDirect ? (media.videoSd ?? proxyVideo) : media.videoSd ?? null;
  const showServer02 = Boolean(server02 && server02 !== server01);
  /** MP3: direct music CDN when available, else the proxy. */
  const mp3Url = media.audioDirect ?? media.audioMp3 ?? null;

  const size = formatBytes(media.videoHdBytes ?? media.videoSdBytes ?? video.byteSize);
  const isAudioUnavailable = !mp3Url && platform === "tiktok";

  const codecBadge =
    media.videoCodec === "h264" ? (
      <span
        className="tool-pill"
        title="H.264 + AAC — plays in every phone gallery, WhatsApp status, and editor."
      >
        <ShieldCheck className="size-3 text-[var(--ok)]" />
        H.264
      </span>
    ) : media.videoCodec === "hevc" || media.videoCodec === "vp9" || media.videoCodec === "vp8" ? (
      <span
        className="tool-pill"
        title={`This clip is ${media.videoCodec.toUpperCase()} — some phone galleries cannot play it.`}
      >
        <AlertTriangle className="size-3 text-[var(--warn)]" />
        {media.videoCodec.toUpperCase()}
      </span>
    ) : null;

  /* ------------------------------------------------------------------
   * Parallel 10-second sponsor theater — UI only, never a gate.
   *
   * The click handler below does the download work FIRST (anchor default
   * navigation + synchronous Direct Link), then merely displays this panel
   * while Chrome moves the file. If a new download is clicked from the
   * quick links, a new attempt re-keys the countdown and the banner.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!theater || theater.done) return;
    const interval = window.setInterval(() => {
      setTheater((current) => {
        if (!current || current.done) return current;
        if (current.secondsLeft <= 1) return { ...current, secondsLeft: 0, done: true };
        return { ...current, secondsLeft: current.secondsLeft - 1 };
      });
    }, 1_000);
    return () => window.clearInterval(interval);
    // The countdown restarts per attempt; theater.* inside is intentionally
    // read through the ref-free updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theater?.attemptId]);

  /**
   * The one and only download click handler — order is load-bearing.
   * 1. Direct Link sponsor synchronously inside the user activation (30 s
   *    cap lives inside the trigger).
   * 2. The `<a>` default navigation hands the file to the browser's own
   *    download manager at t = 0 s — nothing here may preventDefault, block
   *    or await anything.
   * 3. THEN the theater opens; the file is already moving.
   */
  function startDownload(kind: string) {
    triggerDownloadDirectLink();
    onNotify({
      kind: "success",
      title: "Download started",
      description: `${kind} is downloading straight from the server — check your Downloads tray.`,
    });
    setTheater({ attemptId: Date.now(), secondsLeft: 10, done: false, kind });
  }

  const theaterProgress = theater ? ((10 - theater.secondsLeft) / 10) * 100 : 0;

  return (
    <div data-accent={platform} data-ad-guard="result" className="relative">
      {/* Compact header: thumbnail left, title + @author right. */}
      <div className="flex items-start gap-3">
        <div className="relative size-[86px] shrink-0 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--bg-sunken)] sm:size-24">
          {video.thumbnail && !thumbnailFailed ? (
            <img
              src={media.thumbnail ?? video.thumbnail}
              alt={`Thumbnail for: ${media.title.slice(0, 80)}`}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onError={() => setThumbnailFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-[var(--text-3)]">
              <Music2 className="size-6" />
            </div>
          )}
          <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md bg-black/70 px-1 py-0.5 font-mono text-xs tabular-nums text-white">
            <Clock3 className="size-2.5" />
            {formatDuration(video.duration)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="line-clamp-2 text-base font-semibold leading-snug tracking-tight"
            title={media.title}
          >
            {media.title}
          </h2>
          <p className="mt-1 truncate text-sm text-[var(--text-2)]">
            <span className="font-medium text-[var(--accent-text)]">@{media.author}</span>
            {video.author.nickname && video.author.nickname !== media.author ? (
              <span className="text-[var(--text-3)]"> · {video.author.nickname}</span>
            ) : null}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="tool-pill">
              <PlatformIcon platform={platform} className="size-3" />
              {platformConfig.pillLabel}
            </span>
            {codecBadge}
          </div>
        </div>
      </div>

      {theater ? (
        /* ---------------- 10-second parallel download theater ----------------
            In normal document flow (never an overlay, taps stay free), the
            file is already in the browser's download manager. Center stage:
            a freshly keyed 300×250 unit + the high-contrast sponsor CTA. */
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-sunken)] px-4 py-4"
        >
          {/* Animated progress header. */}
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold sm:text-base">
              {theater.done ? (
                <span>
                  ✅ Download Started in Your Browser!{" "}
                  <span className="font-normal text-[var(--text-3)]">
                    ({theater.kind} is in your Downloads tray.)
                  </span>
                </span>
              ) : (
                <span>
                  ⚡ Downloading your {theater.kind}…
                  <span className="font-normal text-[var(--text-3)]">
                    {" "}
                    Finishing stream handoff ({theater.secondsLeft}s)
                  </span>
                </span>
              )}
            </p>
            <span className="micro shrink-0 tabular-nums">{theater.secondsLeft}s</span>
          </div>

          {/* Progress bar 0% → 100% over the 10 seconds. */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--field)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${theaterProgress}%` }}
            />
          </div>

          {/* Center stage: fresh 300×250 on EVERY download attempt
              (`key` remounts the unit so each click earns a new impression),
              plus the high-contrast sponsored partner CTA below it. */}
          <div className="mt-3 flex justify-center">
            <AdSlot
              key={theater.attemptId}
              format="rectangle"
              eager
              label="Sponsored — keeps LAMP TIK free"
            />
          </div>
          <a
            href={monetagSmartlinkUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-500/15"
          >
            🔥 Sponsored High-Speed Partner — Check Out Today&apos;s Offer ↗
          </a>

          {theater.done ? (
            <div className="mt-3 grid gap-2">
              {/* Prominent post-download action — glowing pulse ring. */}
              <button
                type="button"
                onClick={onReset}
                className="btn btn-primary tool-cta group h-12 w-full gap-2 px-4 text-sm font-semibold"
              >
                <RefreshCw className="size-4 shrink-0" />
                Download Another Video
              </button>

              {/* Quick re-click links: each fires the same instant handler. */}
              <p className="text-center text-xs text-[var(--text-3)]">
                Want a different format? Tap again — instantly:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startDownload("Server 01")}
                  className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium underline-offset-4 hover:underline"
                >
                  Server 01
                </button>
                {showServer02 && server02 ? (
                  <button
                    type="button"
                    onClick={() => startDownload("Server 02")}
                    className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Server 02
                  </button>
                ) : null}
                {mp3Url ? (
                  <button
                    type="button"
                    onClick={() => startDownload("MP3 audio")}
                    className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    MP3
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setTheater(null)}
            className="mt-2 mx-auto block text-xs text-[var(--text-3)] underline-offset-4 hover:underline"
          >
            Back to download buttons
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {/* SnapTik-style stacked action buttons: full-width, instant click */}
          {/* Server 01 — direct provider CDN (or the proxy when none exists). */}
          <a
            href={server01}
            {...(server01IsDirect ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            download=""
            onClick={() => startDownload("Server 01")}
            className="btn btn-primary tool-cta h-[52px] w-full gap-3 px-4 text-sm font-semibold"
          >
            <Download className="size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span>{video.quality === "hd" ? "Download HD Video" : "Download Video"}</span>
              <span className="text-xs font-normal text-white/75">
                Server 01 — Fast{server01IsDirect ? " direct CDN" : ""}
              </span>
            </span>
            {size ? <span className="shrink-0 font-mono text-xs tabular-nums text-white/85">{size}</span> : null}
          </a>

          {/* Server 02 — backup transport (proxy or SD rendition). */}
          {showServer02 && server02 ? (
            <a
              href={server02}
              download=""
              onClick={() => startDownload("Server 02")}
              className="btn btn-secondary h-[52px] w-full gap-3 border-[color-mix(in_srgb,var(--ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--ok)_12%,var(--field))] px-4 text-sm font-medium text-[var(--ok)] hover:border-[color-mix(in_srgb,var(--ok)_50%,transparent)]"
            >
              <Download className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span>
                  {server01IsDirect ? "Download Video (Server 02 — Backup CDN)" : "Download Fast MP4 (SD)"}
                </span>
                <span className="text-xs font-normal text-[var(--text-3)]">Same-origin proxy stream</span>
              </span>
              {media.videoSdBytes ? (
                <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-3)]">
                  {formatBytes(media.videoSdBytes)}
                </span>
              ) : null}
            </a>
          ) : null}

          {/* MP3 audio — direct music CDN when the provider serves one. */}
          {mp3Url ? (
            <a
              href={mp3Url}
              {...(media.audioDirect ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              download=""
              onClick={() => startDownload("MP3 audio")}
              className="btn btn-ghost h-12 w-full gap-3 rounded-full border border-[var(--glass-border)] px-4 text-sm font-medium hover:border-[var(--glass-border-hover)]"
            >
              <Music2 className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span>Download Audio (MP3)</span>
                <span className="text-xs font-normal text-[var(--text-3)]">Original sound track</span>
              </span>
            </a>
          ) : isAudioUnavailable ? (
            <button
              type="button"
              disabled
              className="btn btn-ghost h-12 w-full rounded-full px-4 text-sm"
              title="No audio stream was exposed for this video."
            >
              <Music2 className="size-4" />
              Audio unavailable
            </button>
          ) : null}

          {/* Reset — instantly clears and re-focuses the link input. */}
          <button
            type="button"
            onClick={onReset}
            className="btn btn-ghost group h-11 w-full gap-2 px-4 text-sm"
          >
            <RefreshCw className="size-3.5 transition-transform duration-300 group-hover:rotate-180" />
            Download Another Video
          </button>
        </div>
      )}

      {video.musicTitle && !theater ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
          <Music2 className="size-3 shrink-0" />
          <span className="truncate" title={video.musicTitle}>
            {video.musicTitle}
          </span>
        </p>
      ) : null}

      {/* SnapTik "ad sandwich" — bottom slice: a dedicated 300×250 directly
          under the download buttons, so they sit between two slots. Hidden
          while the parallel theater is on stage: its center-stage 300×250
          carries monetization for those 10 seconds, never both at once. */}
      {!theater ? (
        <div className="mt-4">
          <AdSlot
            format="rectangle"
            eager
            refreshKey={refreshKey}
            label="Sponsored — keeps LAMP TIK free"
          />
        </div>
      ) : null}

      <div className="mt-3">
        <SocialShare />
      </div>

      <p className={cn("mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-3)]")}>
        <ShieldCheck className="mt-px size-3.5 shrink-0 text-[var(--ok)]" />
        <span>
          Saves straight to your browser&apos;s Downloads — nothing is stored on our
          servers and nothing is kept on this device by the site.
        </span>
      </p>
    </div>
  );
}
