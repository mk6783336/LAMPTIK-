"use client";

import { useState, type FormEvent } from "react";
import { ImageDown, Loader2 } from "lucide-react";

import type { ApiResponse } from "@/lib/tiktok/types";

type Success = Extract<ApiResponse, { ok: true }>;

/**
 * Thumbnail / cover extractor.
 *
 * One POST to the existing unified resolver — the same SSRF-guarded endpoint
 * the downloader uses — and the largest cover the platform publishes is shown
 * with a one-click save. The video and audio links sit beside it so a visitor
 * who came for the poster is not sent to a second page for the file.
 */
export function ThumbnailExtractor() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Success | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = url.trim();
    if (!value) {
      setError("Paste a video link first.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!payload.ok) {
        setError(payload.error.hint ?? payload.error.message);
        return;
      }
      setData(payload);
    } catch {
      setError("The resolver did not answer. Check the link and try again.");
    } finally {
      setLoading(false);
    }
  }

  const cover = data?.media.thumbnail ?? data?.video.thumbnail ?? null;

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ImageDown aria-hidden="true" className="size-4 text-[var(--accent-text)]" />
        <p className="text-sm font-semibold tracking-tight">Cover extractor</p>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          inputMode="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.tiktok.com/@user/video/…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <button type="submit" disabled={loading} className="btn btn-primary h-11 px-4 text-sm font-semibold">
          {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {loading ? "Reading post" : "Get the cover"}
        </button>
      </form>

      <div aria-live="polite" className="mt-3">
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger,#f87171)]">
            {error}
          </p>
        ) : null}

        {data ? (
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--field)]">
              {cover ? (
                // Remote cover from the platform CDN: next/image would need the
                // host allowlisted and would proxy bytes for no benefit here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={data.video.title ? `Cover for ${data.video.title}` : "Video cover"}
                  className="aspect-[9/16] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="grid aspect-[9/16] place-items-center px-3 text-center text-xs text-[var(--text-3)]">
                  No cover is published for this post.
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold tracking-tight">
                {data.video.title || data.media.title || "Untitled post"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                {data.video.author.nickname || data.media.author || "Unknown author"}
                {data.video.author.username ? ` · @${data.video.author.username}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {cover ? (
                  <a
                    href={cover}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary h-9 px-3 text-xs font-semibold"
                  >
                    Download image
                  </a>
                ) : null}
                {data.media.videoHd ? (
                  <a
                    href={data.media.videoHd}
                    download
                    className="btn btn-ghost h-9 px-3 text-xs"
                  >
                    Video (HD)
                  </a>
                ) : null}
                {data.media.audioMp3 ? (
                  <a href={data.media.audioMp3} download className="btn btn-ghost h-9 px-3 text-xs">
                    Audio
                  </a>
                ) : null}
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-3)]">
                Saved at the largest size the platform serves — never upscaled.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {!data && !error ? (
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-3)]">
          TikTok, Instagram, Facebook, YouTube and X links are accepted.
        </p>
      ) : null}
    </div>
  );
}
