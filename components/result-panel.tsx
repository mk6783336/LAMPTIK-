/* eslint-disable @next/next/no-img-element */
"use client";

import { AlertTriangle, Clock3, Download, Music2, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { formatBytes, formatDuration } from "@/lib/format";
import type { ToastItem } from "@/components/toast";
import { AdSlot } from "@/components/ads/AdSlot";
import { PlatformIcon } from "@/components/platform-icons";
import { cn } from "@/lib/cn";
import { PLATFORMS } from "@/lib/platforms";
import { triggerDownloadDirectLink } from "@/lib/monetization";
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
}

/**
 * SnapTik-style result card — instant, three servers, zero timers.
 *
 * Every download button is a real `<a>`: the browser's own navigation does
 * the work, and the file starts moving on the click itself (0 seconds of
 * waiting — the old 10-second sponsor gate is gone on purpose). The Monetag
 * Direct Link opens in the same event, synchronously, because popup blockers
 * only honour `window.open` while the user activation is alive.
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
export function ResultPanel({ media, video, onReset, onNotify }: ResultPanelProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

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

  /**
   * Fire the Direct Link sponsor synchronously inside the click's user
   * activation (60-second cap inside the trigger itself), then let the
   * anchor's default navigation start the transfer. No awaiting, no timers —
   * the download is a browser operation from this exact instant.
   */
  function sponsorAndConfirm(kind: string) {
    triggerDownloadDirectLink();
    onNotify({
      kind: "success",
      title: "Download started",
      description: `${kind} is downloading straight from the server — check your Downloads tray.`,
    });
  }

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

      {/* SnapTik-style stacked action buttons: full-width, instant click */}
      <div className="mt-4 grid gap-2">
        {/* Server 01 — direct provider CDN (or the proxy when none exists). */}
        <a
          href={server01}
          {...(server01IsDirect ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          download=""
          onClick={() => sponsorAndConfirm("Server 01")}
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
            onClick={() => sponsorAndConfirm("Server 02")}
            className="btn btn-secondary h-[52px] w-full gap-3 border-[color-mix(in_srgb,var(--ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--ok)_12%,var(--field))] px-4 text-sm font-medium text-[var(--ok)] hover:border-[color-mix(in_srgb,var(--ok)_50%,transparent)]"
          >
            <Download className="size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span>{server01IsDirect ? "Download Video (Server 02 — Backup CDN)" : "Download Fast MP4 (SD)"}</span>
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
            onClick={() => sponsorAndConfirm("MP3 audio")}
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

      {video.musicTitle ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
          <Music2 className="size-3 shrink-0" />
          <span className="truncate" title={video.musicTitle}>
            {video.musicTitle}
          </span>
        </p>
      ) : null}

      {/* One clean in-flow slot under the card — the only theater here. */}
      <div className="mt-4">
        <AdSlot format="rectangle" label="Sponsored — keeps LAMP TIK free" />
      </div>

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
