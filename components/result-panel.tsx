/* eslint-disable @next/next/no-img-element */
"use client";

import { AlertTriangle, Clock3, Download, Music2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  /** Same-origin `/api/download` attachment URL handed to Chrome at 0s. */
  href: string;
}

/**
 * SnapTik-style result card — instant resolution, three servers, and a
 * 10-second sponsor theater that ends by handing the file to Chrome.
 *
 * The 2-stage flow (identical on TikTok / Instagram / Facebook / YouTube:
 * every platform page renders this exact component):
 *   Stage A — click: the Monetag Direct Link sponsor opens synchronously
 *   inside the user activation (popup blockers only honour `window.open`
 *   there), and the panel transforms IN FLOW into the 10-second countdown
 *   theater with a freshly keyed 300×250 banner on center stage.
 *   Stage B — t = 0s: a hidden same-origin iframe navigates to this site's
 *   `/api/download` attachment stream (`Content-Disposition: attachment`,
 *   forced server-side), which starts Chrome's NATIVE download manager on
 *   every attempt — no cross-origin `<a download>` (ignored by Chrome's
 *   policy), no `target="_blank"` CDN URL that inline-plays video in a new
 *   tab instead of downloading, and no popup-blocker cancellation of the
 *   file navigation. The page never navigates away; the user stays free to
 *   click "Download Another Video" while bytes move in the tray.
 *
 * Every click routes to the same-origin proxy (`/api/download?u=…`), even
 * for providers that expose their own public CDN attachment: the server
 * side streams the bytes (with platform-correct referers) and, when a CDNP
 * refuses server IPs or the file is huge, hands off via a verified 302.
 */
export function ResultPanel({ media, video, onReset, onNotify, refreshKey }: ResultPanelProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [theater, setTheater] = useState<DownloadTheater | null>(null);
  /** Guard: the 0s hand-off fires exactly once per attempt. */
  const firedAttemptRef = useRef<number>(0);

  const platform = media.platform;
  const platformConfig = PLATFORMS[platform];

  /** Same-origin attachment URL for any https upstream (SSRF-checked server-side). */
  const proxyHref = (
    kind: "video" | "audio",
    upstream: string,
    server: "1" | "2" = "2",
  ) =>
    `/api/download?${new URLSearchParams({
      kind,
      u: upstream,
      id: media.id,
      author: media.author,
      platform,
      server,
    }).toString()}`;

  /** Server 01: always the proxy attachment (direct CDN upstream when known). */
  const directUpstream = media.videoDirect ?? null;
  const server01Href = directUpstream
    ? proxyHref("video", directUpstream, "1")
    : (media.videoHd ?? video.downloads.video ?? "");
  /** Server 02: the SD rendition proxy — or the alternate transport when
   *  Server 01 rides the provider's own CDN. */
  const server02Href =
    media.videoSd && media.videoSd !== server01Href
      ? media.videoSd
      : directUpstream
        ? (media.videoHd ?? video.downloads.video ?? "")
        : "";
  const showServer02 = Boolean(server02Href && server02Href !== server01Href);
  /** MP3: proxy attachment covers both direct and proxied upstreams. */
  const mp3Href = media.audioDirect
    ? proxyHref("audio", media.audioDirect, "2")
    : (media.audioMp3 ?? "");
  const mp3Url = mp3Href || null;

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
   * 10-second sponsor theater that ENDS in a real download.
   *
   * t = click → the Direct Link opens (inside the user activation) and the
   *   countdown starts over a freshly keyed 300×250 banner.
   * t = 10s → 0s → the hidden same-origin iframe navigates to the
   *   `/api/download` attachment stream: Chrome's native download bar
   *   starts, the page stays put, and "Download Another Video" appears so
   *   the next paste can happen while bytes are still moving.
   * ---------------------------------------------------------------- */
  const theaterAttemptId = theater?.attemptId;
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
    // The countdown restarts per attempt; theater state itself is read via
    // the ref-free updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theaterAttemptId]);

  /**
   * Stage B — the actual file hand-off at t = 0s.
   * A display:none iframe is the one mechanism that reaches Chrome's native
   * download manager 100% of the time for a same-origin attachment stream:
   * no user-activation conflict with the sponsor tab, no popup blocker, no
   * navigation away from the page, and no cross-origin `download` attribute
   * being ignored.
   */
  useEffect(() => {
    if (!theater || theater.secondsLeft !== 0) return;
    if (firedAttemptRef.current === theater.attemptId) return;
    firedAttemptRef.current = theater.attemptId;

    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "Starting download");
    frame.src = theater.href;
    document.body.appendChild(frame);
    // Live until the proxied stream has had its full 300s window — removing
    // the frame earlier aborts a still-streaming download.
    window.setTimeout(() => frame.remove(), 300_000);
  }, [theater]);

  /**
   * The one and only download click handler — order is load-bearing.
   * 1. Direct Link sponsor synchronously inside the user activation (30 s
   *    cap lives inside the trigger).
   * 2. The panel becomes the 10-second theater; the CDN link is handed to
   *    Chrome's download manager the moment the countdown reaches 0s.
   */
  function startDownload(kind: string, href: string) {
    if (!href) return;
    triggerDownloadDirectLink();
    setTheater({ attemptId: Date.now(), secondsLeft: 10, done: false, kind, href });
    onNotify({
      kind: "success",
      title: "Download starting",
      description: `${kind} will land in your Downloads tray in 10 seconds — keep this tab open.`,
    });
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
            <p className="min-w-0 text-sm font-semibold sm:text-base">                {theater.done ? (
                <span>
                  ✅ Download Started in Your Browser!{" "}
                  <span className="font-normal text-[var(--text-3)]">
                    ({theater.kind} is in your Downloads tray.)
                  </span>
                </span>
              ) : (
                <span>
                  ⚡ Preparing your {theater.kind}…
                  <span className="font-normal text-[var(--text-3)]">
                    {" "}
                    Securing CDN stream ({theater.secondsLeft}s)
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
              alwaysReserve
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
                  onClick={() => startDownload("Server 01", server01Href)}
                  className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium underline-offset-4 hover:underline"
                >
                  Server 01
                </button>
                {showServer02 ? (
                  <button
                    type="button"
                    onClick={() => startDownload("Server 02", server02Href)}
                    className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Server 02
                  </button>
                ) : null}
                {mp3Url ? (
                  <button
                    type="button"
                    onClick={() => startDownload("MP3 audio", mp3Href)}
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
          {/* SnapTik-style stacked action buttons: full-width. Each button
              routes through the same-origin proxy attachment — Chrome's own
              download manager does the receiving, never an inline tab. */}
          {/* Server 01 — primary: direct CDN upstream via the proxy stream. */}
          <button
            type="button"
            onClick={() => startDownload("Server 01", server01Href)}
            className="btn btn-primary tool-cta h-[52px] w-full gap-3 px-4 text-sm font-semibold"
          >
            <Download className="size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span>{video.quality === "hd" ? "Download HD Video" : "Download Video"}</span>
              <span className="text-xs font-normal text-white/75">
                Server 01 — Fast{directUpstream ? " direct CDN" : ""}
              </span>
            </span>
            {size ? <span className="shrink-0 font-mono text-xs tabular-nums text-white/85">{size}</span> : null}
          </button>

          {/* Server 02 — backup transport (other upstream or SD rendition). */}
          {showServer02 ? (
            <button
              type="button"
              onClick={() => startDownload("Server 02", server02Href)}
              className="btn btn-secondary h-[52px] w-full gap-3 border-[color-mix(in_srgb,var(--ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--ok)_12%,var(--field))] px-4 text-sm font-medium text-[var(--ok)] hover:border-[color-mix(in_srgb,var(--ok)_50%,transparent)]"
            >
              <Download className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span>
                  {directUpstream ? "Download Video (Server 02 — Backup CDN)" : "Download Fast MP4 (SD)"}
                </span>
                <span className="text-xs font-normal text-[var(--text-3)]">Same-origin proxy stream</span>
              </span>
              {media.videoSdBytes ? (
                <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-3)]">
                  {formatBytes(media.videoSdBytes)}
                </span>
              ) : null}
            </button>
          ) : null}

          {/* MP3 audio — routed through the forced-attachment proxy so the
              music file lands in the Downloads tray, never an inline player. */}
          {mp3Url ? (
            <button
              type="button"
              onClick={() => startDownload("MP3 audio", mp3Href)}
              className="btn btn-ghost h-12 w-full gap-3 rounded-full border border-[var(--glass-border)] px-4 text-sm font-medium hover:border-[var(--glass-border-hover)]"
            >
              <Music2 className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span>Download Audio (MP3)</span>
                <span className="text-xs font-normal text-[var(--text-3)]">Original sound track</span>
              </span>
            </button>
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
