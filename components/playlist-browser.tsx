"use client";

import { ArrowRight, ListVideo, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";

interface PlaylistItem {
  id: string;
  title: string;
  thumbnail: string | null;
  url: string;
}

interface PlaylistResponse {
  ok: true;
  playlist: {
    id: string;
    title: string;
    count: number;
    items: PlaylistItem[];
  };
}

interface PlaylistError {
  ok: false;
  error: { code: string; message: string; hint?: string };
}

/**
 * Playlist browser: lists the videos, then hands each one to the standard
 * YouTube downloader with the link already filled in. There is deliberately
 * no bulk/ZIP action — every file still goes through the normal resolve,
 * ad gate and 1080p/MP3 picker, one video at a time.
 */
export function PlaylistBrowser() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [playlist, setPlaylist] = useState<PlaylistResponse["playlist"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = input.trim();
    if (!url || status === "loading") return;

    setStatus("loading");
    setError(null);
    setPlaylist(null);

    try {
      const response = await fetch(
        `/api/youtube/playlist?url=${encodeURIComponent(url)}`,
      );
      const payload = (await response.json()) as PlaylistResponse | PlaylistError;

      if (!response.ok || !payload.ok) {
        const failure = payload as PlaylistError;
        setError(
          [failure.error?.message, failure.error?.hint].filter(Boolean).join(" ") ||
            "Couldn't load that playlist.",
        );
        setStatus("error");
        return;
      }

      setPlaylist(payload.playlist);
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
        <label htmlFor="playlist-url" className="text-sm font-semibold tracking-tight">
          Paste a public YouTube playlist link
        </label>
        <div className="field mt-2 flex h-[54px] items-center gap-2 rounded-xl px-3">
          <ListVideo className="size-4 shrink-0 text-[var(--text-3)]" aria-hidden="true" />
          <input
            id="playlist-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://www.youtube.com/playlist?list=PL…"
            className="h-11 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-[var(--text-3)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <p className="mt-2 text-sm text-[var(--text-3)]">
          The first 50 videos are listed. Each one opens in the downloader — no bulk ZIP.
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
              Reading the playlist…
            </>
          ) : (
            <>
              <Play className="size-4" />
              List the videos
              <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[var(--err)]/35 bg-[var(--err-soft)] px-3 py-2 text-sm text-[var(--err)]"
        >
          {error}
        </p>
      ) : null}

      {playlist ? (
        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="min-w-0 text-sm font-semibold tracking-tight">
              {playlist.title}
            </h2>
            <span className="text-xs tabular-nums text-[var(--text-3)]">
              {playlist.count} {playlist.count === 1 ? "video" : "videos"}
            </span>
          </div>

          <ol className="mt-3 space-y-2">
            {playlist.items.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={`/youtube-downloader?url=${encodeURIComponent(item.url)}`}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-2 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
                >
                  <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-[var(--text-3)]">
                    {index + 1}
                  </span>
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="aspect-video w-20 shrink-0 rounded-md bg-[var(--bg-sunken)] object-cover"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm font-medium leading-snug">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-3)]">
                      Open in the downloader
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--text-3)] transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ol>

          <p className="mt-3 text-xs leading-relaxed text-[var(--text-3)]">
            Playlists longer than 50 videos show the first 50. MP4 and MP3 are picked on
            the downloader page for each video.
          </p>
        </div>
      ) : null}
    </div>
  );
}
