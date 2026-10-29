"use client";

import { Images, Loader2, Music2, ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";

interface PhotoSlide {
  index: number;
  url: string;
  download: string;
}

interface PhotoPostResponse {
  ok: true;
  post: {
    id: string;
    title: string;
    author: string;
    thumbnail: string | null;
    images: PhotoSlide[];
    music: { url: string; download: string } | null;
    musicTitle: string | null;
  };
}

interface PhotoErrorResponse {
  ok: false;
  error: { code: string; message: string; hint?: string };
}

/**
 * TikTok slideshow / photo-mode tool.
 *
 * A photo post has no playable stream, so the video downloader correctly
 * refuses it. This panel calls the dedicated photo endpoint and lists every
 * slide with its own attachment URL — each click is one image file, not a
 * gallery tab. Nothing about the video flow changes.
 */
export function PhotoDownloader() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [post, setPost] = useState<PhotoPostResponse["post"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = input.trim();
    if (!url || status === "loading") return;

    setStatus("loading");
    setError(null);
    setPost(null);

    try {
      const response = await fetch("/api/tiktok/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as PhotoPostResponse | PhotoErrorResponse;

      if (!response.ok || !payload.ok) {
        const failure = payload as PhotoErrorResponse;
        setError(
          [failure.error?.message, failure.error?.hint].filter(Boolean).join(" ") ||
            "Couldn't load that photo post.",
        );
        setStatus("error");
        return;
      }

      setPost(payload.post);
      setStatus("success");
    } catch {
      setError("The request failed. Check your connection and try again.");
      setStatus("error");
    }
  }

  const loading = status === "loading";

  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 sm:p-5">
      <form onSubmit={handleSubmit}>
        <label htmlFor="photo-url" className="text-sm font-semibold tracking-tight">
          Paste a TikTok photo post link
        </label>
        <div className="field mt-2 flex h-[54px] items-center gap-2 rounded-xl px-3">
          <Images className="size-4 shrink-0 text-[var(--text-3)]" aria-hidden="true" />
          <input
            id="photo-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://www.tiktok.com/@user/photo/…"
            className="h-11 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-[var(--text-3)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <p className="mt-2 text-sm text-[var(--text-3)]">
          Photo-mode posts only — each slide is saved as its own image file.
        </p>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={cn(
            "btn btn-primary tool-cta group mt-3 h-[54px] w-full gap-2.5 px-5 text-base font-semibold tracking-tight",
            loading && "opacity-70",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading slides…
            </>
          ) : (
            <>
              <Images className="size-4" />
              Show the slides
              <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-[var(--err)]/35 bg-[var(--err-soft)] px-3 py-2 text-sm text-[var(--err)]">
          {error}
        </p>
      ) : null}

      {post ? (
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <div className="flex items-start gap-3">
            {post.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="size-16 shrink-0 rounded-xl border border-[var(--glass-border)] object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">@{post.author}</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                {post.images.length} {post.images.length === 1 ? "photo" : "photos"}
              </p>
            </div>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {post.images.map((slide) => (
              <li key={slide.index}>
                <a
                  href={slide.download}
                  className="bento-card group flex flex-col gap-2 p-2"
                  aria-label={`Save photo ${slide.index}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.url}
                    alt={`Slide ${slide.index}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="aspect-[9/16] w-full rounded-lg bg-[var(--bg-sunken)] object-cover"
                  />
                  <span className="flex items-center justify-between gap-2 px-1 pb-1 text-xs font-semibold">
                    Photo {slide.index}
                    <ArrowRight className="size-3.5 text-[var(--text-3)] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>

          {post.music ? (
            <a
              href={post.music.download}
              className="btn btn-secondary mt-4 h-11 w-full gap-2 px-4 text-sm"
            >
              <Music2 className="size-4" />
              Save the original sound
              {post.musicTitle ? (
                <span className="truncate font-normal text-[var(--text-3)]">
                  · {post.musicTitle}
                </span>
              ) : null}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
