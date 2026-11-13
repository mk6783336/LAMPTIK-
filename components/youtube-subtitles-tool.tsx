"use client";

import { useCallback, useState } from "react";
import { Captions, Download, Loader2 } from "lucide-react";

/**
 * The subtitles tool panel.
 *
 * It shows exactly what the API returned: the languages this video actually
 * has. There is no optimistic "we are transcribing" state, because nothing here
 * transcribes — a video without tracks gets a plain sentence and no buttons.
 */

interface CaptionTrack {
  lang: string;
  label: string;
  auto: boolean;
}

interface Listing {
  videoId: string;
  title: string;
  author: string;
  tracks: CaptionTrack[];
}

const FORMATS = [
  { format: "srt", hint: "Editors, Premiere, CapCut" },
  { format: "vtt", hint: "Web players, <track>" },
  { format: "txt", hint: "Plain transcript" },
] as const;

export function YouTubeSubtitlesTool({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const value = url.trim();
    if (!value || pending) return;

    setPending(true);
    setMessage(null);
    setListing(null);

    try {
      const response = await fetch("/api/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; video: Listing; tracks: CaptionTrack[] }
        | { ok: false; error?: { message?: string; hint?: string } }
        | null;

      if (!payload) {
        setMessage("The caption service answered something this page could not read. Please try again.");
        return;
      }

      if (!payload.ok) {
        const text = [payload.error?.message, payload.error?.hint].filter(Boolean).join(" ");
        setMessage(text || "This video's captions could not be read. Please try again.");
        return;
      }

      setListing(payload.video);
      if (payload.tracks.length === 0) {
        setMessage(
          "YouTube lists no caption track for this video — no manual subtitles and no auto-generated ones. There is nothing to download, and this page will not invent a transcript.",
        );
      }
    } catch {
      setMessage("The request did not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }, [pending, url]);

  const downloadHref = (lang: string, format: string) =>
    `/api/subtitles?url=${encodeURIComponent(url.trim())}&lang=${encodeURIComponent(lang)}&format=${format}`;

  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 sm:p-5">
      <label htmlFor="subtitles-url" className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
        YouTube link
      </label>
      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          id="subtitles-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          // `flex-1` is row-only: in the stacked mobile form it is a column,
          // where flex-basis overrides `height` and the field collapsed to 19px.
          className="h-11 w-full min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)] sm:w-auto sm:flex-1"
        />
        <button
          type="submit"
          disabled={pending || url.trim().length === 0}
          className="btn btn-primary h-11 shrink-0 gap-2 px-5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Captions className="size-4" aria-hidden />}
          {pending ? "Reading captions" : "Find subtitles"}
        </button>
      </form>

      {message ? (
        <p role="status" className="pretty mt-3 text-sm leading-relaxed text-[var(--text-2)]">
          {message}
        </p>
      ) : null}

      {listing && listing.tracks.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold leading-snug text-[var(--text-1)]">{listing.title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">
            {listing.author ? `${listing.author} · ` : ""}
            {listing.tracks.length} caption {listing.tracks.length === 1 ? "track" : "tracks"} on YouTube
          </p>

          <ul className="mt-3 space-y-2">
            {listing.tracks.map((track) => (
              <li
                key={`${track.lang}-${track.auto ? "asr" : "manual"}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-[var(--text-1)]">{track.label}</span>
                  <span className="font-mono text-xs text-[var(--text-3)]">{track.lang}</span>
                  {track.auto ? <span className="tool-pill text-xs">auto-generated</span> : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {FORMATS.map(({ format, hint }) => (
                    <a
                      key={format}
                      href={downloadHref(track.lang, format)}
                      className="btn h-9 gap-1.5 px-3 text-xs font-semibold"
                      title={hint}
                    >
                      <Download className="size-3.5" aria-hidden />
                      {format.toUpperCase()}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <p className="pretty mt-3 text-xs leading-relaxed text-[var(--text-3)]">
            Auto-generated tracks follow YouTube&apos;s speech recognition, so names and punctuation can
            be wrong. Edit before publishing; the timing is kept in SRT and VTT.
          </p>
        </div>
      ) : null}
    </div>
  );
}
