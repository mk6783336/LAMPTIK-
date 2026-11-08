"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Link2, Loader2, ShieldCheck } from "lucide-react";

interface TwitterVariant {
  url: string;
  label: string;
  width: number | null;
  height: number | null;
  bitrate: number | null;
}

interface TwitterMedia {
  id: string;
  canonicalUrl: string;
  title: string;
  author: string;
  nickname: string | null;
  thumbnail: string | null;
  duration: number;
  isGif: boolean;
  variants: TwitterVariant[];
}

function formatDuration(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return "0:00";
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  return `${minutes}:${String(seconds === 60 ? 0 : seconds).padStart(2, "0")}`;
}

/**
 * Download href for a rendition.
 *
 * The file is handed to the browser's own download manager by navigating to
 * the edge proxy, which answers `Content-Disposition: attachment` — the same
 * path the other four platforms use. Nothing is buffered in the page, and the
 * `video.twimg.com` URL is never exposed to the click: it stays inside the
 * query string, where the proxy re-validates it against the SSRF gate.
 */
function proxyHref(media: TwitterMedia, variant: TwitterVariant): string {
  const params = new URLSearchParams({
    kind: "video",
    platform: "twitter",
    u: variant.url,
    id: media.id,
  });
  return `/api/download?${params.toString()}`;
}

/**
 * The X/Twitter tool panel.
 *
 * Deliberately its own component rather than a fifth entry in the shared
 * `Downloader`: that component is built around the multi-platform
 * `/api/fetch` contract (one video + one audio track), while X returns a list
 * of renditions and no separate audio stream. Reusing it would mean teaching
 * the whole flow about a platform it was not designed for; this panel is ~200
 * lines and leaves that flow untouched.
 */
export function TwitterDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<TwitterMedia | null>(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * `?url=` deep link — the X half of the URL-prefix shortcut.
   *
   * X has its own resolver (`/api/twitter`) and its own panel, so a shared
   * `lamptik.online/<x.com link>` cannot ride the shared downloader's flow.
   * The bridge routes those links here instead, and this effect finishes the
   * job the other platforms get from `Downloader`: resolve on arrival.
   */
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("url");
    if (!incoming || !incoming.trim()) return;
    deepLinkHandled.current = true;

    params.delete("url");
    const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    try {
      window.history.replaceState(window.history.state, "", cleaned);
    } catch {
      // History API unavailable — the handled ref still prevents a re-fire.
    }

    setUrl(incoming.trim());
    void resolveUrl(incoming.trim());
    // Runs once per mount: a deep link describes the page the visitor opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resolve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolveUrl(url);
  }

  async function resolveUrl(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Paste an X (Twitter) post link first.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(`/api/twitter?url=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; media?: TwitterMedia; error?: { message?: string; hint?: string } }
        | null;

      if (!payload?.ok || !payload.media) {
        const message = payload?.error?.message ?? "That post couldn't be resolved.";
        const hint = payload?.error?.hint;
        setMedia(null);
        setError(hint ? `${message} ${hint}` : message);
        return;
      }

      setThumbnailFailed(false);
      setMedia(payload.media);
    } catch (cause) {
      setMedia(null);
      setError(
        cause instanceof Error && cause.name === "AbortError"
          ? "The resolver took too long. Try that link again."
          : "Couldn't reach the resolver. Check your connection and retry.",
      );
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* `data-ad-guard="tool"`: the fixed-position ad card is clamped off this
          box on mobile (see components/ads/AdScripts.tsx). */}
      <form
        onSubmit={resolve}
        data-ad-guard="tool"
        className="relative rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 sm:p-5"
      >
        <label htmlFor="twitter-url" className="text-sm font-medium text-[var(--text-2)]">
          X (Twitter) post link
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-3)]"
            />
            <input
              id="twitter-url"
              ref={inputRef}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://x.com/user/status/…"
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--field)] py-3 pl-9 pr-3 text-base text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-3)] focus:border-[var(--accent)] sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity disabled:opacity-70"
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            {loading ? "Resolving…" : "Get video"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-3)]">
          Works with x.com and twitter.com links to a single post. Profile links and
          login-walled posts can&apos;t be resolved.
        </p>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-sunken)] p-4 text-sm leading-relaxed text-[var(--text-2)]"
        >
          {error}
        </p>
      ) : null}

      {media ? (
        <div
          data-ad-guard="result"
          className="relative rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="relative size-[86px] shrink-0 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--bg-sunken)] sm:size-24">
              {media.thumbnail && !thumbnailFailed ? (
                // CDN poster from pbs.twimg.com. `next/image` would need a
                // remotePatterns entry plus an optimizer hop for an image the
                // CDN already serves at the right size. Same per-line exception
                // the other remote-thumbnail components use.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.thumbnail}
                  alt=""
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={() => setThumbnailFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-[var(--text-3)]">
                  X
                </div>
              )}
              <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-1 py-0.5 font-mono text-xs tabular-nums text-white">
                {formatDuration(media.duration)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight">
                {media.title}
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--text-2)]">
                <span className="font-medium text-[var(--accent-text)]">@{media.author}</span>
                {media.nickname ? (
                  <span className="text-[var(--text-3)]"> · {media.nickname}</span>
                ) : null}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--text-3)]">
                <ShieldCheck aria-hidden="true" className="size-3" />
                {media.isGif ? "GIF · plays as MP4" : "MP4 · no watermark"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {media.variants.map((variant) => (
              <a
                key={variant.url}
                href={proxyHref(media, variant)}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--accent)]"
              >
                <span className="inline-flex items-center gap-2">
                  <Download aria-hidden="true" className="size-4" />
                  Download {variant.label}
                </span>
                {variant.height ? (
                  <span className="font-mono text-xs tabular-nums text-[var(--text-3)]">
                    {variant.width}×{variant.height}
                  </span>
                ) : null}
              </a>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--text-3)]">
            Pick the smallest quality your screen needs — the 1080p file is the full
            upload, so it is also the biggest download.
          </p>
        </div>
      ) : null}
    </div>
  );
}
