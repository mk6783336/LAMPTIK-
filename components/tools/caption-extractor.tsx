"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Copy, Hash, Loader2 } from "lucide-react";

import { signalAdIntent } from "@/lib/ad-intent";
import type { ApiResponse } from "@/lib/tiktok/types";

type Success = Extract<ApiResponse, { ok: true }>;

/** Unicode-aware: hashtags are not ASCII. */
const HASHTAG_RE = /#[\p{L}\p{N}_]{2,}/gu;

/**
 * Caption + hashtag reader.
 *
 * The caption is the post's own text; hashtags are parsed out of it because
 * TikTok keeps them inside that string rather than in a field. Copy buttons use
 * the clipboard API with a silent failure (older Safari), and the source MP4 /
 * MP3 links sit underneath so the page ends in a download rather than a dead end.
 */
export function CaptionExtractor() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Success | null>(null);
  const [copied, setCopied] = useState<"caption" | "tags" | null>(null);

  const caption = data ? data.video.title || data.media.title || "" : "";
  const hashtags = useMemo(() => {
    const found = caption.match(HASHTAG_RE) ?? [];
    return Array.from(new Set(found.map((tag) => tag.toLowerCase())));
  }, [caption]);

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
    setCopied(null);
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

  async function copy(kind: "caption" | "tags", text: string) {
    // Copying is the tool doing its job — the post-intent arm for this page.
    signalAdIntent("caption-copy");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard blocked: the text is still selectable on screen.
    }
  }

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Hash aria-hidden="true" className="size-4 text-[var(--accent-text)]" />
        <p className="text-sm font-semibold tracking-tight">Caption &amp; hashtag reader</p>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          inputMode="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://vt.tiktok.com/… or a Reel link"
          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <button type="submit" disabled={loading} className="btn btn-primary h-11 px-4 text-sm font-semibold">
          {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {loading ? "Reading post" : "Extract"}
        </button>
      </form>

      <div aria-live="polite" className="mt-3">
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger,#f87171)]">
            {error}
          </p>
        ) : null}

        {data ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="micro text-xs text-[var(--text-3)]">Caption</p>
                <button
                  type="button"
                  onClick={() => copy("caption", caption)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-text)]"
                >
                  {copied === "caption" ? <Check aria-hidden="true" className="size-3" /> : <Copy aria-hidden="true" className="size-3" />}
                  {copied === "caption" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="pretty mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)]">
                {caption || "This post has no caption."}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="micro text-xs text-[var(--text-3)]">
                  Hashtags · {hashtags.length}
                </p>
                <button
                  type="button"
                  disabled={hashtags.length === 0}
                  onClick={() => copy("tags", hashtags.join(" "))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-text)] disabled:opacity-40"
                >
                  {copied === "tags" ? <Check aria-hidden="true" className="size-3" /> : <Copy aria-hidden="true" className="size-3" />}
                  {copied === "tags" ? "Copied" : "Copy all"}
                </button>
              </div>
              {hashtags.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {hashtags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-xs text-[var(--text-2)]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--text-3)]">No hashtags in this caption.</p>
              )}
            </div>

            <dl className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
                <dt className="micro text-xs text-[var(--text-3)]">Author</dt>
                <dd className="mt-1 text-sm font-medium">
                  {data.video.author.nickname || data.media.author || "Unknown"}
                  {data.video.author.username ? (
                    <span className="text-[var(--text-3)]"> · @{data.video.author.username}</span>
                  ) : null}
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-3">
                <dt className="micro text-xs text-[var(--text-3)]">Audio track</dt>
                <dd className="mt-1 line-clamp-2 text-sm font-medium">
                  {data.video.musicTitle || "Not published"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              {data.media.videoHd ? (
                <a href={data.media.videoHd} download className="btn btn-primary h-9 px-3 text-xs font-semibold">
                  Download MP4
                </a>
              ) : null}
              {data.media.audioMp3 ? (
                <a href={data.media.audioMp3} download className="btn btn-ghost h-9 px-3 text-xs">
                  Download MP3
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {!data && !error ? (
          <p className="text-xs leading-relaxed text-[var(--text-3)]">
            TikTok, Instagram, Facebook and YouTube links are accepted. Nothing is stored.
          </p>
        ) : null}
      </div>
    </div>
  );
}
