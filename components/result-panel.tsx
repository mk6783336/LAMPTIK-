/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Download,
  Music2,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { trackEvent, type DownloadEventMeta } from "@/lib/analytics";
import { formatBytes, formatDuration } from "@/lib/format";
import type { ToastItem } from "@/components/toast";
import { AdSlot } from "@/components/ads/AdSlot";
import { CreatorToolkitBar } from "@/components/creator-toolkit-bar";
import { PlatformIcon } from "@/components/platform-icons";
import { cn } from "@/lib/cn";
import { PLATFORMS } from "@/lib/platforms";
import { directLinkUrl, smartlinkUrl } from "@/lib/monetization";
import { ENGLISH_DOWNLOADER_COPY, type DownloaderCopy } from "@/lib/i18n/ui";

import { isKnownLoaderInterstitialUrl } from "@/lib/youtube-stream-url";
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
  /** Fire the cache-busting re-resolve (POST /api/fetch {force:true}) for a
      canonical URL — shown on the theater's failure card so an expired
      signed CDN link re-signs itself without re-pasting. */
  onReresolve?: (url: string) => void;
  /** Localized control labels; omitted on English pages. */
  copy?: DownloaderCopy;
}

/**
 * What the last click handed to the browser.
 *
 * This used to be a 10-second "sponsor theater": a countdown that replaced the
 * download buttons and told the visitor to wait before the next download. On a
 * phone that was the most complained-about surface on the site — the file was
 * already moving in the Downloads tray, and the page still refused to show a
 * button for ten seconds. A hand-off needs one line of feedback, not a gate.
 */
interface DownloadStarted {
  attemptId: number;
  kind: string;
  /** Raw upstream CDN URL (the proxy's `u` param) for the never-stuck fallback link. */
  fallbackUrl: string | null;
}

/**
 * SnapTik-style result card — instant resolution, three servers, and zero
 * waiting after a click.
 *
 * The flow (identical on TikTok / Instagram / Facebook / YouTube — every
 * platform page renders this exact component):
 *   0ms — click: a hidden same-origin sandboxed iframe navigates to
 *   `/api/download` inside the same gesture — attachment downloads
 *   only, no script execution, no top-frame movement. Chrome's NATIVE
 *   download manager starts at ~0s —
 *   the old 10-second delayed hand-off died to Chrome twice over: the user
 *   activation had expired and the cross-origin CDN refused iframe
 *   delivery. No post-timeout downloads, ever.
 *   0ms+ — a one-line "in your Downloads tray" confirmation appears in flow and
 *   every button stays live: another format, another server, or the next
 *   video. There is no countdown, no full-screen dialog and no sponsor tab
 *   opened for the visitor. IP-bound converter URLs (loader.to/pacific-cdn
 *   and client-claimed googlevideo links are authorized for the USER'S OWN
 *   IP) open straight from the gesture via a real anchor click — never
 *   through the datacenter proxy, whose IP the CDN rejects (the exact
 *   thing that produced `download.html` instead of an .mp4).
 */
export function ResultPanel({
  media,
  video,
  onReset,
  onNotify,
  refreshKey,
  onReresolve,
  copy,
}: ResultPanelProps) {
  const t = copy ?? ENGLISH_DOWNLOADER_COPY;
  /** The high-CPM partner card: an explicit Smartlink wins, otherwise the
   *  HilltopAds Direct Link the rails already use — so the card is live on
   *  mobile without any extra configuration. */
  const sponsorUrl = smartlinkUrl || directLinkUrl;
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [started, setStarted] = useState<DownloadStarted | null>(null);

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
      // The saved file is named after the video, not after this site (see
      // `filenameFor` in /api/download). The server sanitises and caps it.
      title: media.title,
    }).toString()}`;

  /** Raw upstream CDN URL embedded in a same-origin proxy href (`u` param)
   *  so the theater always has a never-stuck fallback link of last resort. */
  const rawUpstreamOf = (href: string): string | null => {
    if (!href) return null;
    if (!href.startsWith("/api/download")) return href; // already a raw CDN link
    const params = new URLSearchParams(href.split("?")[1] ?? "");
    return params.get("u") ?? params.get("url") ?? href;
  };

  /** Server 01: always the proxy attachment (direct CDN upstream when known). */
  const directUpstream = media.videoDirect ?? null;
  const server01Href = directUpstream
    ? proxyHref("video", directUpstream, "1")
    : (media.videoHd ?? video.downloads.video ?? "");
  /** YouTube payloads carry IP-bound converter CDN URLs (loader.to's
   *  pacific-cdn / client-claimed googlevideo) — these only answer the
   *  browser's own IP, so Server 01 and MP3 open them DIRECTLY from the
   *  real user gesture instead of routing through /api/download on Vercel
   *  (whose datacenter IP gets HTML error pages → `download.html`).
   *  TikTok / Instagram / Facebook CDNs are public and keep the proxy,
   *  which forces `Content-Disposition: attachment` for free. */
  const youtubeDirectVideo =
    platform === "youtube" && directUpstream ? directUpstream : null;
  const youtubeDirectAudio =
    platform === "youtube" && media.audioDirect ? media.audioDirect : null;
  /** Server 02: the SD rendition proxy — or the alternate transport when
   *  Server 01 rides the provider's own CDN. */
  const server02Href =
    media.videoSd && media.videoSd !== server01Href
      ? media.videoSd
      : directUpstream
        ? (media.videoHd ?? video.downloads.video ?? "")
        : "";
  const showServer02 = Boolean(server02Href && server02Href !== server01Href);
  /** Audio: proxy attachment covers both direct and proxied upstreams. */
  const mp3Href = media.audioDirect
    ? proxyHref("audio", media.audioDirect, "2")
    : (media.audioMp3 ?? "");
  const mp3Url = mp3Href || null;
  /**
   * Label with the container the user will actually receive. `/api/download`
   * names the file from the upstream content type, so a bridge stream saves as
   * `.m4a` (AAC) — calling that button "MP3" was a promise the file did not
   * keep. Unknown containers fall back to the neutral word "Audio".
   */
  const audioFormatLabel = media.audioFormat === "m4a" ? "M4A" : media.audioFormat === "mp3" ? "MP3" : "Audio";
  /**
   * A true MP3, encoded by the bridge's ffmpeg on first request. Offered as a
   * SECOND audio button: the source track keeps its original quality, and the
   * MP3 exists for players that cannot open AAC.
   */
  const encodedMp3Href = media.audioMp3Encoded ?? null;
  const encodedMp3Url = encodedMp3Href || null;

  const size = formatBytes(media.videoHdBytes ?? media.videoSdBytes ?? video.byteSize);
  const isAudioUnavailable = !mp3Url && platform === "tiktok";

  /**
   * GA4 parameters per button, computed beside the hrefs they describe so the
   * event can never drift from what was actually handed to the browser.
   * `delivery` distinguishes a direct CDN gesture from the same-origin proxy
   * and from the bridge encode.
   */
  const videoMeta: DownloadEventMeta = {
    format: "mp4",
    delivery: youtubeDirectVideo ? "direct" : "proxy",
    quality: "hd",
  };
  const server02Meta: DownloadEventMeta = {
    format: "mp4",
    delivery: "proxy",
    quality: media.videoSd && media.videoSd !== server01Href ? "sd" : "hd",
  };
  const audioMeta: DownloadEventMeta = {
    format:
      media.audioFormat === "m4a" ? "m4a" : media.audioFormat === "mp3" ? "mp3" : "audio",
    delivery: youtubeDirectAudio ? "direct" : "proxy",
  };
  const encodedMp3Meta: DownloadEventMeta = { format: "mp3", delivery: "bridge" };

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
   * Hand-off, then one line of feedback. No timer, no gate, no second tab.
   *
 * t = 0ms → the hidden same-origin iframe hands the file to Chrome's
 *   download manager in the SAME gesture as the click, and the buttons stay
 *   live. There is nothing to wait for: the visitor can start the next
 *   download, or the audio of this one, immediately.
 * ---------------------------------------------------------------- */

  /**
   * Unlocks the push ad networks, which now load only after a real download
   * (see `components/ads/AdScripts.tsx`). Dispatched AFTER the file hand-off
   * — the iframe has already navigated or the anchor has already clicked — so
   * nothing in this path can delay the download.
   */
  function signalDownloadIntent(kind: string) {
    try {
      document.dispatchEvent(new CustomEvent("lamptik:intent", { detail: { kind } }));
    } catch {
      // Very old browser: the push networks simply stay unarmed.
    }
  }

  function rejectKnownYouTubeInterstitial(url: string | null): boolean {
    if (platform !== "youtube" || !url || !isKnownLoaderInterstitialUrl(url)) return false;
    setStarted(null);
    onNotify({
      kind: "error",
      title: "This YouTube stream is stale",
      description: "Refreshing the video link before starting another download.",
    });
    onReresolve?.(media.canonicalUrl);
    return true;
  }

  /**
   * The one and only download click handler — order is load-bearing.
   * 1. The file hand-off fires in THE SAME GESTURE (hidden iframe to the
   *    same-origin attachment stream) — Chrome's native download manager
   *    starts at ~0s. Downloads never wait for a timer again.
   * 2. The panel becomes the 10-second post-download sponsor theater.
   *
   * Clicking Download produces exactly one thing: the media file. No
   * Direct Link tab, no pop-under — a download button that also opens an
   * unrelated tab is what made trust scanners and users read the site as
   * adware.
   */
  function startDownload(
    kind: string,
    href: string,
    meta: DownloadEventMeta,
    fallbackUrl: string | null = null,
  ) {
    if (!href) return;
    if (rejectKnownYouTubeInterstitial(rawUpstreamOf(href))) return;
    // Click intent, not completion: the browser owns the transfer once it
    // starts, so no client code can observe the last byte (see the privacy
    // page — nothing about the file is tracked).
    trackEvent("download_start", { platform, ...meta });
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "Starting download");
    frame.setAttribute(
      "sandbox",
      // Downloads (attachment navigations) only — NO allow-scripts and NO
      // allow-top-navigation: even a 302 to an external CDN cannot execute a
      // script in our frame or move the top-level tab. The CDN's own
      // `Content-Disposition: attachment` is what reaches Chrome's download
      // manager; an HTML ad response is dead on arrival here.
      "allow-downloads allow-same-origin",
    );
    frame.src = href;
    document.body.appendChild(frame);
    // No sponsor tab: a download click produces the file and nothing else. An
    // auto-opened third-party tab is what every visitor reads as a redirect,
    // and it is the pattern ad networks themselves classify as forced traffic.
    signalDownloadIntent(kind);
    // Live until the proxied stream has had its full 300s window — removing
    // the frame earlier aborts a still-streaming download.
    window.setTimeout(() => frame.remove(), 300_000);
    setStarted({
      attemptId: Date.now(),
      kind,
      fallbackUrl: fallbackUrl ?? rawUpstreamOf(href),
    });
    onNotify({
      kind: "success",
      title: "Download started",
      description: `${kind} is already moving in your Downloads tray.`,
    });
  }

  /**
   * DIRECT user-gesture hand-off for IP-bound CDN URLs (YouTube converter
   * downloads). loader.to's pacific-cdn and claimed googlevideo links are
   * authorized for THIS browser's IP — proxying them through the server's
   * datacenter IP is what produced `download.html` instead of the .mp4.
   * The synchronously-clicked anchor rides the REAL gesture into _blank:
   * the current lamptik.online tab NEVER navigates away, the CDN's own
   * `Content-Disposition: attachment` hands the file to Chrome's download
   * manager, then the same 10-second theater runs in flow.
   */
  function startDownloadDirect(kind: string, directUrl: string, meta: DownloadEventMeta) {
    if (!directUrl || rejectKnownYouTubeInterstitial(directUrl)) return;
    trackEvent("download_start", { platform, ...meta });
    const anchor = document.createElement("a");
    anchor.href = directUrl;
    // Keep the origin tab in place. Known job URLs are rejected before this
    // point; if a provider changes behavior and returns HTML, a same-tab
    // navigation is still the wrong failure mode. A new tab is therefore
    // required, and the browser's download manager owns attachment handling.
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    signalDownloadIntent(kind);
    window.setTimeout(() => anchor.remove(), 30_000);
    setStarted({
      attemptId: Date.now(),
      kind,
      fallbackUrl: directUrl,
    });
    onNotify({
      kind: "success",
      title: "Download requested",
      description: `${kind} was handed to your browser — check the Downloads tray for the file.`,
    });
  }

  return (
    /* Order is CSS, not markup: on a phone the buttons come before the banner.
       Measured at 390×844, the 300×250 sat between the title and the primary
       button and put 288px of ad — a third of the screen — in front of the one
       control the visitor came for. Desktop has the room, so there the banner
       keeps its place above the buttons. */
    <div data-accent={platform} data-ad-guard="result" className="relative flex flex-col">
      {/* Compact header: thumbnail left, title + @author right. */}
      <div className="order-1 flex items-start gap-3">
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

      {/* SnapTik sandwich — TOP slice. Between the thumbnail/title header and
          the first Download button: the creative sits exactly on the line a
          thumb travels between "is this my video?" and "save it", which is
          the most-viewed band of the card.

          `alwaysReserve` is not cosmetic. Without it the slot starts at 0px
          and grows to 250px when the auction fills ~1–2 s later, shoving the
          primary button down under the thumb that is already moving — the
          measured CLS on this exact panel. Reserving first means the creative
          paints INTO space that already exists and nothing below moves. A
          blocked auction still collapses to the 56px sponsor line at 20 s. */}
      <div className="order-4 mt-4 sm:order-2">
        <AdSlot
          slot="result-top"
          format="rectangle"
          eager
          alwaysReserve
          /* ~60px sponsor row on a phone instead of a 288px rectangle: the
             panel is the one place the visitor is mid-task. */
          compactOnMobile
          refreshKey={refreshKey}
          label="Sponsored — keeps LAMP TIK free"
          sponsoredLabel={t.sponsored}
        />
      </div>

      {started ? (
        /* One line of confirmation, in flow. This replaced a 10-second
            countdown that hid every download button and told the visitor to
            wait: the file was already in their tray, so the timer only cost
            ten seconds of a phone screen. The buttons below never lock. */
        <div
          role="status"
          aria-live="polite"
          className="order-2 mt-3 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-sunken)] px-4 py-3 sm:order-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold">✅ {started.kind} is in your Downloads tray</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-3)]">
              Nothing is blocked — every button below works right now, for this video or the next one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStarted(null)}
            className="shrink-0 text-xs text-[var(--text-3)] underline-offset-4 hover:underline"
          >
            Hide
          </button>

          <div className="min-w-0 basis-full">
            {/* Never-stuck fallback: if Chrome's tray shows nothing, one click
                on the RAW CDN attachment URL still starts the file — handed
                from a real user gesture, so no activation can block it. */}
            {started.fallbackUrl ? (
              <p className="text-center text-xs">
                <a
                  href={started.fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-text)] underline underline-offset-4 hover:underline"
                >
                  Didn&apos;t start automatically? Click here for Direct Stream ↗
                </a>
              </p>
            ) : null}

            {onReresolve ? (
              <p className="mt-1 text-center text-xs">
                <button
                  type="button"
                  onClick={() => onReresolve(media.canonicalUrl)}
                  className="text-[var(--text-3)] underline-offset-4 hover:underline"
                >
                  Stream expired? Re-resolve a fresh CDN link
                </button>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="order-3 mt-4 grid gap-2 sm:order-4">
          {/* SnapTik-style stacked action buttons: full-width. Each button
              routes through the same-origin proxy attachment — Chrome's own
              download manager does the receiving, never an inline tab. */}
          {/* Server 01 — primary: IP-bound converter CDN URLs open DIRECTLY
              from the real user gesture (no datacenter proxy hop); public
              TikTok/IG/FB CDNs keep the forced-attachment proxy stream. */}
          <button
            type="button"
            onClick={() =>
              youtubeDirectVideo
                ? startDownloadDirect("Server 01", youtubeDirectVideo, videoMeta)
                : startDownload("Server 01", server01Href, videoMeta, rawUpstreamOf(server01Href))
            }
            className="btn btn-primary tool-cta h-[52px] w-full gap-3 px-4 text-sm font-semibold"
          >
            <Download className="size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span>{video.quality === "hd" ? t.downloadHd : t.downloadVideo}</span>
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
              onClick={() => startDownload("Server 02", server02Href, server02Meta, rawUpstreamOf(server02Href))}
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

          {/* Audio — IP-bound converter links open directly from the
              gesture, everything else rides the forced-attachment proxy so
              the music file lands in the Downloads tray, never an inline
              player. */}
          {mp3Url ? (
            <button
              type="button"
              onClick={() =>
                youtubeDirectAudio
                  ? startDownloadDirect(`${audioFormatLabel} audio`, youtubeDirectAudio, audioMeta)
                  : startDownload(`${audioFormatLabel} audio`, mp3Href, audioMeta, rawUpstreamOf(mp3Href))
              }
              className="btn btn-ghost h-12 w-full gap-3 rounded-full border border-[var(--glass-border)] px-4 text-sm font-medium hover:border-[var(--glass-border-hover)]"
            >
              <Music2 className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span>
                  {t.downloadAudio} ({audioFormatLabel})
                </span>
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

          {/* Real MP3 — the bridge downloads the audio pick and encodes it with
              ffmpeg on the first click, then serves the cached file. Its size
              is bigger than the AAC source, so it stays a secondary option. */}
          {encodedMp3Url ? (
            <button
              type="button"
              onClick={() => startDownload("MP3 audio", encodedMp3Url, encodedMp3Meta, rawUpstreamOf(encodedMp3Url))}
              className="btn btn-ghost h-12 w-full gap-3 rounded-full border border-[var(--glass-border)] px-4 text-sm font-medium hover:border-[var(--glass-border-hover)]"
            >
              <Music2 className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span>
                  {t.downloadAudio} (MP3)
                </span>
                <span className="text-xs font-normal text-[var(--text-3)]">
                  Encoded on our bridge — plays in any MP3 player
                </span>
              </span>
            </button>
          ) : null}

          {/* Optional high-CPM partner link, env-gated (`NEXT_PUBLIC_SMARTLINK_URL`).
              Rendered as a clearly sponsored anchor, not as a second download
              button: it opens someone else's offer in a new tab, and labelling
              that "mirror" would promise a file it cannot deliver — the exact
              pattern that gets a downloader flagged as adware. The visitor's
              file is already streaming from the buttons above. */}
          {sponsorUrl ? (
            <a
              href={sponsorUrl}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="mt-1 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-left transition-colors duration-200 hover:border-amber-400/45 hover:bg-amber-500/[0.11]"
            >
              <Zap aria-hidden="true" className="size-4 shrink-0 text-amber-300" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--text)]">
                  High-speed download partner
                  <span className="rounded-full border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                    {t.sponsored}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-3)]">
                  Opens a partner offer in a new tab — your file above is already downloading.
                </span>
              </span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-[var(--text-3)]" />
            </a>
          ) : null}

          {/* Second pageview from the same visit: the four creator tools sit
              right under a visitor who has already saved a file. */}
          <CreatorToolkitBar className="mt-1" />

          {/* ONE banner in this panel, above the button stack.

              There used to be two 300×250s — "sandwiched" around the buttons
              the way SnapTik does it. On a phone that put a second rectangle
              between the save options and the partner card, so the panel read
              as an ad page with a downloader attached. The top slice stays
              because it sits on the line a thumb travels between "is this my
              video?" and "save it"; the bottom one is gone and the creator
              tools move straight up under the buttons. */}

          {/* Reset — instantly clears and re-focuses the link input. */}
          <button
            type="button"
            onClick={onReset}
            className="btn btn-ghost group h-11 w-full gap-2 px-4 text-sm"
          >
            <RefreshCw className="size-3.5 transition-transform duration-300 group-hover:rotate-180" />
            {t.another}
          </button>
      </div>

      {video.musicTitle ? (
        <p className="order-5 mt-2 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
          <Music2 className="size-3 shrink-0" />
          <span className="truncate" title={video.musicTitle}>
            {video.musicTitle}
          </span>
        </p>
      ) : null}

      <div className="order-6 mt-3">
        {/* Compact: the chips alone. The titled card was 144px of a phone
            screen asking for a share before the visitor had watched the file. */}
        <SocialShare compact />
      </div>

      <p
        className={cn(
          "order-7 mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-3)]",
        )}
      >
        <ShieldCheck className="mt-px size-3.5 shrink-0 text-[var(--ok)]" />
        <span>
          Saves straight to your browser&apos;s Downloads — nothing is stored on our
          servers and nothing is kept on this device by the site.
        </span>
      </p>

    </div>
  );
}
