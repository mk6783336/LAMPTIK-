"use client";

import { ArrowRight, ClipboardPaste, Link2, Loader2, X, Zap } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

import type { ToastItem } from "@/components/toast";
import { PlatformIcon } from "@/components/platform-icons";
import { cn } from "@/lib/cn";
import { detectLink, extractLinkText, type DetectedLink } from "@/lib/detect";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { ENGLISH_DOWNLOADER_COPY, type DownloaderCopy } from "@/lib/i18n/ui";

interface UrlFieldProps {
  /** Owned by the parent (focus management) but the state lives HERE. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** Programmatic value set from outside (sample link, reset). */
  seed: { value: string; nonce: number };
  /** Fetch in progress — disables input and shows the busy CTA. */
  busy: boolean;
  /** Server/submit error owned by the parent, shown inline. */
  error: string | null;
  /** The page's platform — the default accent until a pasted link wins. */
  platform: Platform;
  /** Valid video link (any platform) ready to resolve. */
  onSubmitUrl: (url: string) => void;
  /** Inline recovery after a failed resolve (skips the ad gate). */
  onRetry?: () => void;
  onNotify: (toast: Omit<ToastItem, "id">) => void;
  /** Localized control labels. Omitted on English pages, which keep their
   *  per-platform placeholder and the copy they already had. */
  copy?: DownloaderCopy;
}

/**
 * The URL input is intentionally isolated from the rest of the downloader:
 * typing or pasting only re-renders this small component — never the whole
 * page, the result panel, or the toast stack. Keystroke latency stays at one
 * frame on mobile.
 *
 * Multi-platform: detection runs live against TikTok / Instagram / Facebook
 * shapes. A link from ANY platform is greeted (badge + accent shift), never
 * rejected — /api/fetch resolves all three.
 */
export function UrlField({
  inputRef,
  seed,
  busy,
  error,
  platform,
  onSubmitUrl,
  onRetry,
  onNotify,
  copy,
}: UrlFieldProps) {
  const t = copy ?? ENGLISH_DOWNLOADER_COPY;
  // A page can arrive with a link already chosen (the playlist browser) —
  // it is shown, not submitted: the visitor keeps the final click.
  const [input, setInput] = useState(seed.value);
  const [isPasting, setIsPasting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);


  /** Live detection: null until the text contains a supported video link. */
  const detected = useMemo(() => detectLink(input), [input]);
  /** Accent priority: detected platform > page platform. */
  const accent = detected?.platform ?? platform;
  const accentConfig = PLATFORMS[accent];

  const seedNonce = useRef(seed.nonce);
  /** Tap-to-paste fires at most once per mount (see `handleFocusAutopaste`). */
  const clipboardTriedRef = useRef(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Apply programmatic value changes (sample link / reset) from the parent.
  useEffect(() => {
    if (seed.nonce === seedNonce.current) return;
    seedNonce.current = seed.nonce;
    setInput(seed.value);
    setLocalError(null);
  }, [seed]);

  function submitLink(link: DetectedLink) {
    if (link.isPhoto) {
      setLocalError("Photo posts can’t be downloaded as video.");
      onNotify({
        kind: "error",
        title: "That’s a photo post",
        description: "LAMP TIK downloads video posts only.",
      });
      return;
    }
    setLocalError(null);
    onSubmitUrl(link.url);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const link = detectLink(input);
    if (!link) {
      setLocalError("That isn’t a TikTok, Instagram, Facebook, or YouTube video link.");
      onNotify({
        kind: "error",
        title: "Invalid video link",
        description:
          "Expected a TikTok, Instagram, Facebook, or YouTube video or share link (reels, fb.watch, Shorts, youtu.be…).",
      });
      inputRef.current?.focus();
      return;
    }

    submitLink(link);
  }

  // In-field paste: fill AND auto-fetch the moment a valid link from ANY
  // platform lands — mobile users never see a keyboard, so the extra tap
  // must disappear.
  async function handlePasteFromClipboard() {
    setIsPasting(true);
    try {
      if (!navigator.clipboard?.readText) throw new Error("unsupported");
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        onNotify({
          kind: "info",
          title: "Clipboard is empty",
          description: "Copy a video link first, then paste it here.",
        });
        return;
      }

      const link = detectLink(text);
      const value = extractLinkText(text);
      setInput(value);
      setLocalError(null);
      inputRef.current?.focus();

      if (link) {
        onNotify({
          kind: "success",
          title: "Link pasted",
          description: `Fetching the clean ${PLATFORMS[link.platform].videoNoun} stream…`,
        });
        submitLink(link);
      } else {
        onNotify({
          kind: "error",
          title: "No supported video link in the clipboard",
          description: "Copy a TikTok, Instagram, Facebook, or YouTube video link, then try again.",
        });
      }
    } catch {
      inputRef.current?.focus();
      onNotify({
        kind: "error",
        title: "Clipboard access blocked",
        description: "Allow clipboard permission, or paste manually with Ctrl/Cmd + V.",
      });
    } finally {
      setIsPasting(false);
    }
  }

  /**
   * Tap-to-paste. A phone keyboard makes pasting a two-step chore — long-press,
   * then Paste — so the FIRST focus of an empty field quietly asks the
   * clipboard for a link and, when one is there, fills and fetches it.
   *
   * Deliberately narrow: once per mount, only while the field is still empty,
   * only for a recognised video link, and every failure is silent. A browser
   * that needs a clipboard permission prompt must never turn one tap on the
   * input into a dialog, and typing is never overwritten (`inputRef` is read
   * again after the await, so a fast typist wins).
   */
  async function handleFocusAutopaste() {
    if (clipboardTriedRef.current) return;
    clipboardTriedRef.current = true;
    if (busy || input.trim() || !navigator.clipboard?.readText) return;

    try {
      const text = await navigator.clipboard.readText();
      // The visitor may have started typing while the clipboard was read.
      if (!text.trim() || inputRef.current?.value) return;
      const link = detectLink(text);
      if (!link) return;

      setInput(extractLinkText(text));
      setLocalError(null);
      onNotify({
        kind: "success",
        title: "Link pasted",
        description: `Fetching the clean ${PLATFORMS[link.platform].videoNoun} stream…`,
      });
      submitLink(link);
    } catch {
      // Blocked, empty or unsupported: the field simply stays idle.
    }
  }

  // Native paste (long-press / Ctrl+V into the field): same auto-fetch rule.
  function handleInputPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.trim()) return;

    const link = detectLink(text);
    const value = extractLinkText(text);

    event.preventDefault();
    setInput(value);
    setLocalError(null);

    if (link) {
      onNotify({
        kind: "success",
        title: "Link pasted",
        description: `Fetching the clean ${PLATFORMS[link.platform].videoNoun} stream…`,
      });
      submitLink(link);
    }
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (localError) setLocalError(null);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && input) {
      event.preventDefault();
      handleInputChange("");
    }
  }

  const displayError = localError ?? error;

  /** Glowing platform badge — icon + mandated detection copy. The pop-in is
   *  a CSS keyframe (`badge-pop`); reduced motion is flattened globally in
   *  globals.css, so no JS branch is needed. */
  const renderBadge = (key: string) => (
    <span key={key} className="tool-badge badge-pop">
      <PlatformIcon platform={accent} className="size-3.5" />
      {accentConfig.detectedLabel}
    </span>
  );

  /** Desktop status detail under the field (the badge lives in the bar). */
  const statusDetail = detected
    ? detected.platform === "tiktok" && detected.videoId
      ? `Detected TikTok ${detected.isShort ? "short link" : "video"} · id ${detected.videoId.slice(0, 8)}…`
      : `Detected ${accentConfig.videoNoun}${detected.isShort ? " short link" : " link"} · ready to fetch`
    : "TikTok · Instagram · Facebook · YouTube";

  return (
    <form onSubmit={handleFormSubmit} noValidate data-accent={accent}>
      <label htmlFor="video-url" className="sr-only">
        {t.inputLabel}
      </label>

      <div
        className={cn(
          "field tool-field min-h-[56px] gap-2 px-3 py-1.5 sm:h-14 sm:px-3.5",
          displayError && "border-[var(--err)] shadow-[0_0_0_4px_var(--err-soft)]",
        )}
      >
        {detected ? (
          // sm+: badge replaces the link icon inside the bar.
          <span key="badge-in-bar" className="hidden shrink-0 sm:inline-flex">
            {renderBadge("badge-in-bar")}
          </span>
        ) : (
          <span
            key="link-icon"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--field)] text-[var(--text-3)]"
          >
            <Link2 className="size-4" />
          </span>
        )}

        <input
          ref={inputRef}
          id="video-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={handleFocusAutopaste}
          onKeyDown={handleInputKeyDown}
          onPaste={handleInputPaste}
          placeholder={copy?.placeholder ?? accentConfig.placeholder}
          aria-invalid={Boolean(displayError)}
          aria-describedby="url-status"
          className="h-11 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-[var(--text-3)] disabled:cursor-not-allowed disabled:opacity-50"
        />

        {input && !busy ? (
          <button
            type="button"
            onClick={() => {
              handleInputChange("");
              inputRef.current?.focus();
            }}
            aria-label="Clear link"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--text-3)] transition-colors duration-200 hover:bg-[var(--field-strong)] hover:text-[var(--text)]"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {/* The label is visible on phones too. An icon-only square read as
            decoration next to a 54px primary CTA, and Clarity's dead-click
            list was full of taps that landed beside it. A bordered button that
            says "Paste" is the affordance; `type="button"` keeps it out of
            form submission, and the handler fills the field and submits in one
            tap when the clipboard holds a supported link. */}
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          disabled={isPasting || busy}
          aria-busy={isPasting}
          aria-label={t.pasteHint}
          title={t.pasteHint}
          className="btn btn-ghost h-9 shrink-0 gap-1.5 border border-[var(--glass-border)] bg-[var(--field)] px-2 text-xs sm:h-10 sm:px-2.5 sm:text-sm"
        >
          {isPasting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ClipboardPaste className="size-3.5" />
          )}
          <span className="whitespace-nowrap">{t.paste}</span>
        </button>
      </div>

      {/* Status line: live feedback — badge on mobile (<sm, where the bar
          can't fit the full copy), platform detail on sm+. */}
      <div
        id="url-status"
        aria-live="polite"
        className="mt-2 flex min-h-[18px] items-center justify-between gap-3 px-0.5 text-sm"
      >
        <span
          title={displayError ?? undefined}
          className={cn(
            "min-w-0",
            displayError ? "text-[var(--err)]" : "truncate",
            !displayError && !detected && "text-[var(--text-3)]",
            !displayError && detected && "text-[var(--text-2)]",
          )}
        >
          {displayError ? (
            displayError
          ) : detected ? (
            <>
              <span className="sm:hidden">{renderBadge("badge-in-strip")}</span>
              <span className="hidden sm:inline">{statusDetail}</span>
            </>
          ) : (
            <>
              {/* Phones get a short, never-truncated prompt; the full four
                  platform list only renders where it fits. */}
              <span className="sm:hidden">{t.idleHint}</span>
              <span className="hidden sm:inline">{statusDetail}</span>
            </>
          )}
        </span>
        {displayError && error && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-lg border border-[var(--err)]/35 bg-[var(--err-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--err)] transition-colors hover:border-[var(--err)]/60"
          >
            Retry now
          </button>
        ) : (
          <span className="micro hidden shrink-0 items-center gap-1 text-[var(--text-3)] sm:flex">
            ⌘V paste
          </span>
        )}
      </div>

      {/* A provider-blocked YouTube video must never be a dead end: the ad
          gate stays intact, but the visitor can verify the link on the source
          page from the same screen. Rendered only for a server failure with an
          identified video id, never for a local typo. Traffic never leaves for
          a competitor downloader. */}
      {error && detected?.platform === "youtube" && detected.videoId ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(detected.videoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text)]"
          >
            Watch on YouTube <span aria-hidden="true">↗</span>
          </a>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy || !isHydrated}
        aria-busy={busy}
        className={cn(
          "btn btn-primary tool-cta group mt-3 h-[54px] w-full gap-2.5 px-5 text-base font-semibold tracking-tight",
          busy && "opacity-70",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t.analyzing}
          </>
        ) : (
          <>
            <span className="grid size-6 place-items-center rounded-full bg-white/15">
              <Zap className="size-3.5" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="whitespace-nowrap">
              <span className="sm:hidden">{t.submitShort}</span>
              <span className="hidden sm:inline">{t.submit}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
