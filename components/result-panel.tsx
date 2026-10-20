/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  ExternalLink,
  Film,
  HardDrive,
  Heart,
  Loader2,
  MonitorPlay,
  Music2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { formatBytes, formatCount, formatDuration, formatYear } from "@/lib/format";
import type { ToastItem } from "@/components/toast";
import { refreshLibraryBadge } from "@/components/library";
import { AdSlot } from "@/components/ads/AdSlot";
import { PlatformIcon } from "@/components/platform-icons";
import { cn } from "@/lib/cn";
import {
  LibraryError,
  notifyLibraryChanged,
  saveToLibrary,
  shouldBuffer,
} from "@/lib/library";
import { PLATFORMS } from "@/lib/platforms";
import {
  monetagSmartlinkUrl,
  triggerDirectLinkMonetization,
  triggerDownloadMonetization,
} from "@/lib/monetization";
import type { MediaPayload } from "@/lib/media";
import type { VideoInfo } from "@/lib/tiktok/types";

interface ResultPanelProps {
  /** Unified cross-platform payload — drives badges and download links. */
  media: MediaPayload;
  /** Full record (real TikTok data; synthesized for Instagram/Facebook). */
  video: VideoInfo;
  onReset: () => void;
  onNotify: (toast: Omit<ToastItem, "id">) => void;
  /** Re-resolve upstream (bypassing the cache) to replace expired CDN URLs. */
  onRefresh: () => Promise<MediaPayload | null>;
}

type DownloadKind = "hd" | "sd" | "audio";

/**
 * HEAD probe against our own proxy: verifies the signed CDN URL still serves
 * media before the browser is allowed to navigate to it. Returns false for
 * expired/403 links and JSON error payloads.
 */
async function probeDownload(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!response.ok) return false;
    const type = (response.headers.get("content-type") ?? "").toLowerCase();
    return type.startsWith("video/") || type.startsWith("audio/");
  } catch {
    return false;
  }
}

/** Programmatic same-origin download — the server supplies the filename. */
function saveUrl(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function DownloadAction({
  primary,
  busy,
  progress,
  disabled,
  icon,
  label,
  meta,
  note,
  onClick,
}: {
  primary?: boolean;
  busy: boolean;
  /** Live byte count — turns the button into a real, measurable progress bar. */
  progress?: { loaded: number; total: number | null } | null;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  meta: string | null;
  note?: string;
  onClick: () => void;
}) {
  const percent =
    progress && progress.total && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : null;

  const statusLabel = progress
    ? percent === null
      ? `Downloading… ${formatBytes(progress.loaded)}`
      : `Downloading… ${percent}%`
    : "Starting high-speed download…";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || (busy && !progress)}
      aria-busy={busy}
      className={cn(
        "btn h-[52px] w-full justify-between gap-3 px-4 text-left",
        primary
          ? "tool-cta text-[14px] font-semibold"
          : "btn-ghost text-[13.5px] font-medium hover:border-[var(--glass-border-hover)]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full",
            primary ? "bg-white/15 ring-1 ring-white/20" : "bg-[var(--field-strong)]",
          )}
        >
          {busy ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate">{busy ? statusLabel : label}</span>
          <span
            className={cn(
              "mt-0.5 block truncate text-[11px] font-normal",
              primary ? "text-white/75" : "text-[var(--text-3)]",
            )}
          >
            {busy ? (progress ? "Tap to cancel" : "Verifying the stream…") : (note ?? "")}
          </span>
        </span>
      </span>
      {meta && !busy ? (
        <span
          className={cn(
            "shrink-0 font-mono text-[11px] tabular-nums",
            primary ? "text-white/85" : "text-[var(--text-3)]",
          )}
        >
          {meta}
        </span>
      ) : null}

      {/* Real measured progress, not a fake loop: width follows the bytes
          actually read off the wire. */}
      {progress ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/20"
        >
          <span
            className="block h-full bg-white/90 transition-[width] duration-150 ease-out"
            style={{ width: `${percent ?? 100}%` }}
          />
        </span>
      ) : null}
    </button>
  );
}

/**
 * Rich SaaS result card. Hero thumbnail (no-referrer for IG/FB CDNs) with a
 * skeleton underneath so the frame never jumps, platform badge pill, creator
 * handle, real specs as chips, and a clear action hierarchy: HD primary,
 * then SD / MP3, then a clean reset.
 */
export function ResultPanel({ media, video, onReset, onNotify, onRefresh }: ResultPanelProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [busyKind, setBusyKind] = useState<DownloadKind | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number | null } | null>(null);
  const busyRef = useRef<DownloadKind | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Fires the Direct Link exactly once per download, at stream start. */
  const monetizedRef = useRef(false);

  const platform = media.platform;
  const platformConfig = PLATFORMS[platform];

  const size = formatBytes(media.videoHdBytes ?? media.videoSdBytes ?? video.byteSize);
  const year = formatYear(video.createdAt);
  const initial = (video.author.nickname || video.author.username).charAt(0).toUpperCase();

  // Real stats exist for TikTok; IG/FB synthesize them to zero — showing
  // "Plays 0" would be a lie, so those rows appear only where real.
  const statsAreReal = platform === "tiktok";

  const specs: Array<{ term: string; value: string; icon: ReactNode }> = [
    { term: "Duration", value: formatDuration(media.duration), icon: <Clock3 className="size-3" /> },
    {
      term: "Quality",
      value: video.quality === "hd" ? "HD source" : "Standard",
      icon: <MonitorPlay className="size-3" />,
    },
    {
      term: "Codec",
      value:
        media.videoCodec === "h264"
          ? "H.264 / AAC"
          : media.videoCodec === "hevc"
            ? "HEVC"
            : media.videoCodec === "vp9" || media.videoCodec === "vp8"
              ? media.videoCodec.toUpperCase()
              : "MP4",
      icon: <Film className="size-3" />,
    },
    { term: "Watermark", value: "None", icon: <ShieldCheck className="size-3" /> },
    ...(size ? [{ term: "Size", value: size, icon: <HardDrive className="size-3" /> }] : []),
    ...(year ? [{ term: "Posted", value: year, icon: <CalendarDays className="size-3" /> }] : []),
    ...(statsAreReal
      ? [
          { term: "Plays", value: formatCount(video.stats.plays), icon: <Play className="size-3" /> },
          { term: "Likes", value: formatCount(video.stats.likes), icon: <Heart className="size-3" /> },
        ]
      : []),
  ];

  const hdUrl = media.videoHd ?? video.downloads.video;
  // A distinct SD rendition only exists when it points somewhere other than
  // the primary button — otherwise two buttons save the exact same file.
  const hasSd = Boolean(media.videoSd && media.videoSd !== hdUrl);
  const hasAudio = Boolean(media.audioMp3);

  const codecBadge =
    media.videoCodec === "h264" ? (
      <span
        className="tool-pill"
        title="H.264 + AAC — plays in every phone gallery, WhatsApp status, and editor."
      >
        <ShieldCheck className="size-3 text-[var(--ok)]" />
        Universal H.264
      </span>
    ) : media.videoCodec === "hevc" ? (
      <span
        className="tool-pill"
        title="This clip is HEVC — some older Android galleries cannot play it."
      >
        <AlertTriangle className="size-3 text-[var(--warn)]" />
        HEVC
      </span>
    ) : media.videoCodec === "vp9" || media.videoCodec === "vp8" ? (
      <span
        className="tool-pill"
        title={`This clip is ${media.videoCodec.toUpperCase()} — iPhone galleries and WhatsApp may not play it. Best-effort source only.`}
      >
        <AlertTriangle className="size-3 text-[var(--warn)]" />
        {media.videoCodec.toUpperCase()} · limited support
      </span>
    ) : null;

  /** Bytes the CDN reported for this rendition — a truncation guard for saves. */
  function expectedBytesFor(kind: DownloadKind): number | null {
    if (kind === "hd") return media.videoHdBytes ?? video.byteSize ?? null;
    if (kind === "sd") return media.videoSdBytes ?? null;
    return null;
  }

  function cancelDownload() {
    abortRef.current?.abort();
  }

  /**
   * Download flow: probe the signed URL, re-resolve once when it expired,
   * then stream the bytes through our own proxy, where they are validated
   * (content type, sniffing, declared length, container signature), handed
   * back to the browser under the video's ORIGINAL title, and kept in this
   * device's offline Library. A failure can never become a saved, corrupt file.
   */
  async function startDownload(kind: DownloadKind) {
    if (busyRef.current) return;

    const initial =
      kind === "hd" ? hdUrl : kind === "sd" ? media.videoSd : media.audioMp3;
    if (!initial) return;

    // Monetization is deliberately NOT started here. It runs only once the
    // file has been handed to the browser (see `monetize()` below): some
    // in-app browsers coerce a new-tab click into navigating the current
    // tab, and doing that before the byte stream starts would cancel the
    // user's download. After the hand-off, navigating away cannot hurt it.
    const monetize = () => {
      if (kind !== "audio") triggerDownloadMonetization();
    };

    busyRef.current = kind;
    monetizedRef.current = false;
    setBusyKind(kind);
    setProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    onNotify({
      kind: "info",
      title: "Preparing your download…",
      description: "Checking the stream link before any bytes move.",
    });

    let target = initial;

    try {

      if (!(await probeDownload(target))) {
        const refreshed = await onRefresh();
        target =
          (kind === "hd"
            ? refreshed?.videoHd ?? refreshed?.videoSd
            : kind === "sd"
              ? refreshed?.videoSd
              : refreshed?.audioMp3) ?? "";

        if (!target || !(await probeDownload(target))) {
          onNotify({
            kind: "error",
            title: "The CDN link has expired",
            description:
              "We refreshed the stream, but the media server is still blocking it. Fetch the video again.",
          });
          return;
        }

        onNotify({
          kind: "info",
          title: "Stream refreshed",
          description: "Downloading from a freshly signed CDN link.",
        });
      }

      const declared = expectedBytesFor(kind);

      // Very large files (1 GB+ Facebook uploads) are handed straight to the
      // browser instead of being buffered — we never hold them in memory.
      if (!shouldBuffer(declared)) {
        saveUrl(target);
        onNotify({
          kind: "success",
          title: "Downloading straight to disk",
          description: "This file is too large to keep offline in the Library.",
        });
        // Bytes are with the browser — the safe moment for the Direct Link.
        monetizedRef.current = true;
        triggerDirectLinkMonetization();
        monetize();
        return;
      }

      const result = await saveToLibrary({
        url: target,
        id: `${video.id}${kind === "sd" ? "-sd" : kind === "audio" ? "-audio" : ""}`,
        title: media.title || PLATFORMS[media.platform].videoNoun,
        platform: media.platform,
        kind,
        expectedBytes: declared,
        thumbnail: media.thumbnail ?? video.thumbnail ?? null,
        author: media.author,
        duration: media.duration,
        canonicalUrl: media.canonicalUrl,
        signal: controller.signal,
        onProgress: (state) => {
          setProgress(state);
          // First bytes are moving — the stream has started, so this is the
          // safe moment for the Direct Link (3-minute cap, fire-and-forget).
          if (!monetizedRef.current) {
            monetizedRef.current = true;
            triggerDirectLinkMonetization();
          }
        },
      });

      notifyLibraryChanged();
      refreshLibraryBadge();

      onNotify({
        kind: "success",
        title: "Download started",
        description: result.persisted
          ? `Saved as “${result.filename}” — a copy stays in your Library.`
          : `Saved as “${result.filename}”.`,
      });

      // Bytes are safely with the browser now — this is the safe moment.
      monetize();
    } catch (requestError) {
      if (controller.signal.aborted) {
        onNotify({
          kind: "info",
          title: "Download cancelled",
          description: "Nothing was saved to this device.",
        });
        return;
      }

      if (requestError instanceof LibraryError) {
        // No streaming support here: fall back to the plain, server-named
        // download rather than failing the user outright.
        if (requestError.code === "UNSUPPORTED" && target) {
          saveUrl(target);
          onNotify({
            kind: "success",
            title: "Download started",
            description: "This browser can’t stream, so the file saves directly.",
          });
          monetizedRef.current = true;
          triggerDirectLinkMonetization();
          monetize();
          return;
        }
        onNotify({
          kind: "error",
          title: requestError.message,
          description: requestError.hint ?? "Try again in a moment.",
        });
        return;
      }

      onNotify({
        kind: "error",
        title: "Download couldn't start",
        description: "Please try again in a moment.",
      });
    } finally {
      busyRef.current = null;
      setBusyKind(null);
      setProgress(null);
      abortRef.current = null;
    }
  }

  return (
    <div data-accent={platform} className="relative">
      {/* Header rail: success state, platform identity, codec truth. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-[color-mix(in_srgb,var(--ok)_32%,transparent)] bg-[var(--ok-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ok)]">
            <Sparkles className="size-3" />
            Stream ready
          </span>
          <span className="tool-pill">
            <PlatformIcon platform={platform} className="size-3" />
            {platformConfig.pillLabel}
          </span>
          {codecBadge}
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label="Fetch another video"
          className="btn btn-ghost h-8 shrink-0 gap-1.5 px-2.5 text-[12px]"
        >
          <RefreshCw className="size-3.5" />
          New<span className="hidden sm:inline">&nbsp;video</span>
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {/* Media preview: one wide hero frame. A fixed aspect box with a
            shimmer beneath the image means the card never reflows while the
            CDN responds. Width-agnostic, so it fits the tool column and a
            phone alike. */}
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-[16px] border border-[var(--glass-border)] bg-[var(--bg-sunken)]">
          {!thumbnailLoaded && !thumbnailFailed ? (
            <div aria-hidden="true" className="skeleton absolute inset-0 rounded-none" />
          ) : null}
          {video.thumbnail && !thumbnailFailed ? (
            <img
              src={media.thumbnail ?? video.thumbnail}
              alt={`Thumbnail for: ${media.title.slice(0, 80)}`}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              onLoad={() => setThumbnailLoaded(true)}
              onError={() => setThumbnailFailed(true)}
              className={cn(
                "h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.03]",
                thumbnailLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          ) : (
            <div className="grid h-full place-items-center text-[var(--text-3)]">
              <Music2 className="size-7" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md border border-white/15 bg-black/60 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white backdrop-blur">
            <Clock3 className="size-3" />
            {formatDuration(video.duration)}
          </span>
          <span className="absolute bottom-2.5 right-2.5 rounded-md border border-white/15 bg-black/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/90">
            {video.quality === "hd" ? "HD" : "SD"}
          </span>
        </div>

        {/* Metadata + actions */}
        <div className="flex min-w-0 flex-col">
          <h2
            className="line-clamp-2 text-[15.5px] font-semibold leading-snug tracking-tight"
            title={media.title}
          >
            {media.title}
          </h2>

          <div className="mt-3 flex items-center gap-2.5">
            {video.author.avatar && !avatarFailed ? (
              <img
                src={video.author.avatar}
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setAvatarFailed(true)}
                className="size-8 rounded-full object-cover ring-1 ring-[var(--glass-border)]"
              />
            ) : (
              <span className="grid size-8 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)] text-[13px] font-semibold text-[var(--text-2)]">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">@{media.author}</p>
              <p className="truncate text-[11.5px] text-[var(--text-3)]">
                {video.author.nickname}
              </p>
            </div>
            {media.authorUrl ? (
              <a
                href={media.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open @${media.author} on ${platformConfig.name}`}
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-[10px] border border-[var(--glass-border)] bg-[var(--field)] text-[var(--text-3)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
              >
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </div>

          {/* Spec chips: real, icon-labelled facts — scannable in one look. */}
          <dl className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {specs.map((spec) => (
              <div
                key={spec.term}
                className="min-w-0 rounded-[11px] border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1.5"
              >
                <dt className="flex min-w-0 items-center gap-1 text-[var(--text-3)]">
                  <span className="shrink-0 text-[var(--accent-text)]">{spec.icon}</span>
                  <span className="micro truncate text-[9.5px]">{spec.term}</span>
                </dt>
                <dd className="mt-0.5 truncate font-mono text-[12px] tabular-nums">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>

          {video.musicTitle ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
              <Music2 className="size-3.5 shrink-0" />
              <span className="truncate" title={video.musicTitle}>
                {video.musicTitle}
              </span>
            </p>
          ) : null}

          {/* Action hierarchy: HD primary, full width; SD + MP3 paired;
              then a clean reset. Every button probes the signed URL first and
              re-resolves once if it expired. */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <DownloadAction
                primary
                busy={busyKind === "hd"}
                progress={busyKind === "hd" ? progress : null}
                disabled={busyKind !== null && busyKind !== "hd"}
                icon={<Zap className="size-3.5" fill="currentColor" strokeWidth={0} />}
                label={video.quality === "hd" ? "Download HD MP4" : "Download MP4"}
                note="No watermark · saved under its original title"
                meta={formatBytes(media.videoHdBytes ?? media.videoSdBytes ?? video.byteSize)}
                onClick={busyKind === "hd" && progress ? cancelDownload : () => startDownload("hd")}
              />
            </div>

            {hasSd ? (
              <DownloadAction
                busy={busyKind === "sd"}
                progress={busyKind === "sd" ? progress : null}
                disabled={busyKind !== null && busyKind !== "sd"}
                icon={<Film className="size-3.5" />}
                label="Fast MP4 (SD)"
                meta={formatBytes(media.videoSdBytes)}
                onClick={busyKind === "sd" && progress ? cancelDownload : () => startDownload("sd")}
              />
            ) : null}

            {hasAudio ? (
              <div className={cn("min-w-0", !hasSd && "sm:col-span-2")}>
                <DownloadAction
                  busy={busyKind === "audio"}
                  progress={busyKind === "audio" ? progress : null}
                  disabled={busyKind !== null && busyKind !== "audio"}
                  icon={<Music2 className="size-3.5" />}
                  label="Audio only (MP3)"
                  meta={null}
                  onClick={busyKind === "audio" && progress ? cancelDownload : () => startDownload("audio")}
                />
              </div>
            ) : platform === "tiktok" ? (
              <button
                type="button"
                disabled
                className="btn btn-ghost h-[52px] px-4 text-[13.5px]"
                title="No audio stream was exposed for this video."
              >
                <Music2 className="size-4" />
                Audio unavailable
              </button>
            ) : null}

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={onReset}
                className="btn btn-ghost group h-11 w-full gap-2 px-4 text-[13px]"
              >
                <RefreshCw className="size-3.5 transition-transform duration-300 group-hover:rotate-180" />
                Download another video
              </button>
            </div>
          </div>

          {/* In-download sponsor unit: visible only while a download is
              actively streaming, directly below the progress indicator. The
              URL input and Fetch button live in the panel above and are never
              touched by this block. */}
          {busyKind ? (
            <div className="mt-3 overflow-hidden rounded-[16px] border border-white/[0.07] bg-white/[0.015] p-3">
              <p className="micro mb-2 text-center text-[9px] text-[var(--text-3)]/70">
                Sponsored download partner
              </p>
              <AdSlot format="leaderboard" label="Sponsored download partner" />
              <a
                href={monetagSmartlinkUrl}
                target="_blank"
                rel="sponsored nofollow noopener"
                className="group mt-2.5 flex items-center gap-2.5 rounded-[12px] border border-[var(--glass-border)] bg-[var(--field)] px-3 py-2.5 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform duration-200 group-hover:scale-110">
                  <Zap className="size-4" fill="currentColor" strokeWidth={0} />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13px] font-semibold tracking-tight">
                    High-speed mirror · bonus offer
                  </span>
                  <span className="block truncate text-[11px] text-[var(--text-3)]">
                    While your file downloads — sponsored
                  </span>
                </span>
              </a>
            </div>
          ) : null}

          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--text-3)]">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-[var(--ok)]" />
            <span>
              Saved under its original title — a copy stays in your Library on this
              device, never on a server.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
