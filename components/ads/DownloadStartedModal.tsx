"use client";

import { ArrowUpRight, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { AdSlot } from "@/components/ads/AdSlot";
import { ENGLISH_DOWNLOADER_COPY, type DownloaderCopy } from "@/lib/i18n/ui";

interface DownloadStartedModalProps {
  open: boolean;
  /** Localized title/body/CTA. Omitted on English pages. */
  copy?: DownloaderCopy;
  /** Dismiss, keeping the resolved video and its other formats intact. */
  onClose: () => void;
  /** Dismiss AND hand the visitor an empty, focused input for the next link. */
  onDownloadAnother: () => void;
}

/**
 * Post-download sponsor dialog — the highest-viewability moment on the site.
 *
 * The visitor has just pressed Download, so they are looking at the screen and
 * waiting for the file to appear in their tray. This is the only point in the
 * flow where a 300×250 is genuinely seen rather than scrolled past.
 *
 * Why this is safe where the old full-viewport ad layers were not (see
 * `.claude/rules/monetization-integrity.md`):
 *
 * - It opens ONLY from a download click, never on load, and only once per
 *   resolved video — so it can never sit between a visitor and the tool.
 * - The file hand-off has already happened by the time this mounts: the
 *   hidden same-origin iframe is appended to the DOM first, in the same
 *   gesture, so no ad can delay, gate or cancel a download.
 * - Every exit is local and instant: Escape, the ✕, the backdrop, or the CTA.
 *   Nothing here waits on a remote creative to become tappable — the failure
 *   mode that froze mobile input when the Vignette/Social Bar layers hung.
 * - It portals to <body> so an animated (transformed) ancestor cannot turn
 *   `position: fixed` into a full-page container, the way the video gate once
 *   landed a screen below the fold on a phone.
 */
export function DownloadStartedModal({
  open,
  copy,
  onClose,
  onDownloadAnother,
}: DownloadStartedModalProps) {
  const t = copy ?? ENGLISH_DOWNLOADER_COPY;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Lock the page behind the card, focus inside it, and release both on close.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  // Escape closes from anywhere, including after a click landed on the
  // backdrop (where focus is no longer inside the dialog).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], iframe"),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const canPortal = typeof document !== "undefined";
  if (!open || !canPortal) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6"
      style={{ zIndex: 2_147_483_647 }}
    >
      {/* Visible, opaque-enough backdrop. The dialog is the only thing above
          it, and it is always dismissable from the first frame. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#04050a]/85"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-started-title"
        aria-describedby="download-started-copy"
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[360px] flex-col overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#07080d] p-4 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)] outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="download-started-title"
              className="text-lg font-semibold leading-tight tracking-tight text-[var(--text-1)]"
            >
              {t.modalTitle} <span aria-hidden="true">⚡</span>
            </h2>
            <p
              id="download-started-copy"
              className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]"
            >
              {t.modalBody}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modalClose}
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-[var(--text-2)] transition-colors duration-200 hover:border-white/25 hover:text-[var(--text-1)]"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <AdSlot
            slot="modal"
            format="rectangle"
            eager
            alwaysReserve
            label="Sponsored — keeps LAMP TIK free"
          />
        </div>

        <button
          type="button"
          onClick={onDownloadAnother}
          className="btn btn-primary group mt-3 h-12 w-full gap-2 px-4 text-sm font-semibold shadow-[0_0_36px_-10px_var(--accent)]"
        >
          <RefreshCw
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-180"
          />
          {t.modalCta} <span aria-hidden="true">🔄</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 inline-flex items-center justify-center gap-1 text-xs text-[var(--text-3)] underline-offset-4 hover:underline"
        >
          {t.modalClose}
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
