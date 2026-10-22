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
  MonitorPlay,
  Music2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { formatBytes, formatCount, formatDuration, formatYear } from "@/lib/format";
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

type DownloadKind = "hd" | "sd" | "audio";
type Phase = "idle" | "preparing" | "sent";

/** Seconds of sponsor theater before the browser takes the file. */
const GATE_SECONDS = 10;

const KIND_LABELS: Record<DownloadKind, string> = {
  hd: "HD MP4",
  sd: "SD MP4",
  audio: "MP3",
};

/**
 * Hand a URL to the browser's own download manager.
 *
 * This is the whole point of the flow: the anchor points at our proxy, the
 * proxy answers with `Content-Disposition: attachment` (or a 302 to the CDN's
 * own attachment), and Chrome/Android saves the file in its native Downloads
 * tray. No byte ever passes through JavaScript, so a 232 MB video no longer
 * pins the tab in a `ReadableStream` loop, and the page is free the moment the
 * click happens.
 */
function saveUrl(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function DownloadAction({
  primary,
  disabled,
  icon,
  label,
  meta,
  note,
  onClick,
}: {
  primary?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  meta: string | null;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "btn h-[52px] w-full justify-between gap-3 px-4 text-left",
        primary
          ? "btn-primary tool-cta text-sm font-semibold"
          : "btn-ghost text-sm font-medium hover:border-[var(--glass-border-hover)]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full",
            primary ? "bg-white/15 ring-1 ring-white/20" : "bg-[var(--field-strong)]",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          <span
            className={cn(
              "mt-0.5 block truncate text-xs font-normal",
              primary ? "text-white/75" : "text-[var(--text-3)]",
            )}
          >
            {note ?? ""}
          </span>
        </span>
      </span>
      {meta ? (
        <span
          className={cn(
            "shrink-0 font-mono text-xs tabular-nums",
            primary ? "text-white/85" : "text-[var(--text-3)]",
          )}
        >
          {meta}
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
 *
 * Downloads are NEVER buffered in this component. A click starts a 10-second
 * sponsor gate, then the resolved URL is handed to the browser's download
 * manager, so the visitor can immediately fetch another video.
 */
export function ResultPanel({ media, video, onReset, onNotify }: ResultPanelProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(GATE_SECONDS);
  /** The URL actually handed to the browser (also the manual fallback link). */
  const [delivered, setDelivered] = useState<{ kind: DownloadKind; url: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<{ kind: DownloadKind; url: string } | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);

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

  function urlFor(kind: DownloadKind): string | null {
    if (kind === "hd") return hdUrl ?? null;
    if (kind === "sd") return media.videoSd ?? null;
    return media.audioMp3 ?? null;
  }

  /**
   * Click → sponsor tab → 10s gate → native browser download.
   *
   * The sponsor fires synchronously, inside the click's user activation, so
   * popup blockers allow it. The countdown never blocks the network: at 0s the
   * resolved stream URL is handed to the browser, which owns the transfer from
   * then on (Chrome's Downloads tray, Android's DownloadManager). Because no
   * bytes are held here, the user is free to start the next download instantly.
   */
  function startDownload(kind: DownloadKind) {
    if (phase !== "idle") return;

    const url = urlFor(kind);
    if (!url) {
      onNotify({
        kind: "error",
        title: "That format is unavailable",
        description: "Fetch the video again to load a fresh link.",
      });
      return;
    }

    triggerDownloadDirectLink();

    pendingRef.current = { kind, url };
    setPhase("preparing");
    setCountdown(GATE_SECONDS);
    setDelivered(null);

    let remaining = GATE_SECONDS;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(0, remaining));
      if (remaining > 0) return;

      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;

      const pending = pendingRef.current;
      if (!pending) return;

      saveUrl(pending.url);
      setDelivered(pending);
      setPhase("sent");
      onNotify({
        kind: "success",
        title: "Sent to Browser Downloads",
        description: `${KIND_LABELS[pending.kind]} is downloading in your browser — check your Downloads tray.`,
      });
    }, 1_000);
  }

  return (
    <div data-accent={platform} data-ad-guard="result" className="relative">
      {/* Header rail: success state, platform identity, codec truth. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--ok)_32%,transparent)] bg-[var(--ok-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ok)]">
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
          className="btn btn-ghost h-8 shrink-0 gap-1.5 px-2.5 text-sm"
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
        <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-sunken)]">
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
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/60 px-1.5 py-0.5 font-mono text-xs tabular-nums text-white backdrop-blur">
            <Clock3 className="size-3" />
            {formatDuration(video.duration)}
          </span>
          <span className="absolute bottom-2.5 right-2.5 rounded-lg border border-white/15 bg-black/60 px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider text-white/90">
            {video.quality === "hd" ? "HD" : "SD"}
          </span>
        </div>

        {/* Metadata + actions */}
        <div className="flex min-w-0 flex-col">
          <h2
            className="line-clamp-2 text-base font-semibold leading-snug tracking-tight"
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
              <span className="grid size-8 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)] text-sm font-semibold text-[var(--text-2)]">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">@{media.author}</p>
              <p className="truncate text-xs text-[var(--text-3)]">
                {video.author.nickname}
              </p>
            </div>
            {media.authorUrl ? (
              <a
                href={media.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open @${media.author} on ${platformConfig.name}`}
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--glass-border)] bg-[var(--field)] text-[var(--text-3)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
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
                className="min-w-0 rounded-lg border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1.5"
              >
                <dt className="flex min-w-0 items-center gap-1 text-[var(--text-3)]">
                  <span className="shrink-0 text-[var(--accent-text)]">{spec.icon}</span>
                  <span className="micro truncate text-xs">{spec.term}</span>
                </dt>
                <dd className="mt-0.5 truncate font-mono text-sm tabular-nums">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>

          {video.musicTitle ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
              <Music2 className="size-3.5 shrink-0" />
              <span className="truncate" title={video.musicTitle}>
                {video.musicTitle}
              </span>
            </p>
          ) : null}

          {/* Action hierarchy: HD primary, full width; SD + MP3 paired; then a
              clean reset. A click starts the sponsor gate, never a JS buffer. */}
          {phase === "idle" ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <DownloadAction
                  primary
                  icon={<Zap className="size-3.5" fill="currentColor" strokeWidth={0} />}
                  label={video.quality === "hd" ? "Download HD MP4" : "Download MP4"}
                  note="No watermark · straight to your browser Downloads"
                  meta={formatBytes(media.videoHdBytes ?? media.videoSdBytes ?? video.byteSize)}
                  onClick={() => startDownload("hd")}
                />
              </div>

              {hasSd ? (
                <DownloadAction
                  icon={<Film className="size-3.5" />}
                  label="Fast MP4 (SD)"
                  meta={formatBytes(media.videoSdBytes)}
                  onClick={() => startDownload("sd")}
                />
              ) : null}

              {hasAudio ? (
                <div className={cn("min-w-0", !hasSd && "sm:col-span-2")}>
                  <DownloadAction
                    icon={<Music2 className="size-3.5" />}
                    label="Audio only (MP3)"
                    meta={null}
                    onClick={() => startDownload("audio")}
                  />
                </div>
              ) : platform === "tiktok" ? (
                <button
                  type="button"
                  disabled
                  className="btn btn-ghost h-[52px] px-4 text-sm"
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
                  className="btn btn-ghost group h-11 w-full gap-2 px-4 text-sm"
                >
                  <RefreshCw className="size-3.5 transition-transform duration-300 group-hover:rotate-180" />
                  Download another video
                </button>
              </div>
            </div>
          ) : null}

          {/* Sponsor gate: the 10 seconds the exchange gets in exchange for a
              free HD download. The ad is one inline slot — never a stack — and
              hidden on lg+ because the left column already carries the
              showcase in result mode. */}
          {phase === "preparing" ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--bg-sunken)] p-4"
            >
              <div className="flex items-center gap-3">
                <span className="relative grid size-14 shrink-0 place-items-center rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] font-mono text-xl font-bold tabular-nums text-[var(--accent-text)]">
                  {countdown}
                  <span className="absolute -bottom-1 rounded-full bg-[var(--bg)] px-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
                    sec
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">
                    ⏳ Preparing your direct high-speed link…
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-2)]">
                    Your download starts in {countdown}s — keep this tab open.
                  </p>
                </div>
              </div>

              <div aria-hidden="true" className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#6366f1)] transition-[width] duration-1000 ease-linear"
                  style={{ width: `${((GATE_SECONDS - countdown) / GATE_SECONDS) * 100}%` }}
                />
              </div>

              {/* One theater, two in-flow units, never a floating pile: the
                  300×250 above the leaderboard on phones (desktop uses the
                  hero showcase instead). */}
              <div className="mt-4 space-y-3 lg:hidden">
                <AdSlot format="rectangle" label="Sponsored — keeps LAMP TIK free" />
                <AdSlot format="leaderboard" label="Sponsored — keeps LAMP TIK free" />
              </div>
            </div>
          ) : null}

          {/* Hand-off confirmed: the bytes are Chrome's now, so the visitor is
              free to queue the next video immediately. */}
          {phase === "sent" && delivered ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--ok)]/35 bg-[var(--ok-soft)] p-4 text-center">
              <p className="text-sm font-semibold tracking-tight text-[var(--ok)]">
                ✅ Sent to Browser Downloads!
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">
                {KIND_LABELS[delivered.kind]} is downloading in your browser — it appears in
                your Downloads tray, not on this page.
              </p>
              <a
                href={delivered.url}
                download=""
                className="mt-2 inline-block text-xs font-semibold text-[var(--accent-text)] underline-offset-4 hover:underline"
              >
                Download didn’t start? Tap here
              </a>
              <button
                type="button"
                onClick={onReset}
                className="btn btn-primary tool-cta mt-3 h-12 w-full gap-2 text-sm font-bold shadow-[0_20px_46px_-14px_rgba(34,211,238,0.75)]"
              >
                🔄 Download Another Video
              </button>
              <div className="mt-3">
                <SocialShare />
              </div>
            </div>
          ) : null}

          <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-3)]">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-[var(--ok)]" />
            <span>
              Saves straight to your browser’s Downloads — nothing is stored on our
              servers and nothing is kept on this device by the site.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
