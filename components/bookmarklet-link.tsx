"use client";

import { useEffect, useRef } from "react";

import { Glyph } from "@/components/glyph";

/**
 * Drag-to-bookmarks-bar bookmarklet.
 *
 * The `javascript:` URL is written in an effect, not in JSX: React 19 strips or
 * refuses a literal javascript: href, and the anchor has to carry the real URL
 * for the drag to put something usable on the bookmarks bar. Clicking it here
 * also runs it, which is the only way a touch device can install it.
 */
const CODE =
  "javascript:window.open('https://www.lamptik.online/'+encodeURIComponent(location.href),'_blank')";

export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    ref.current?.setAttribute("href", CODE);
  }, []);

  return (
    <div className="mt-4 rounded-xl border border-dashed border-[var(--glass-border)] p-3 sm:p-4">
      <p className="text-sm font-semibold tracking-tight">Drag this to your bookmarks bar</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">
        One bookmark, works on every video page, nothing installed. On a phone, long-press and
        copy the link instead.
      </p>
      <a
        ref={ref}
        draggable
        href="#bookmarklet"
        onClick={(event) => {
          // Keep a real click from navigating to "#" before the effect wrote the
          // javascript: URL (first paint, or a browser that strips it).
          if (!ref.current?.getAttribute("href")?.startsWith("javascript:")) {
            event.preventDefault();
          }
        }}
        className="btn mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 text-sm font-semibold text-[var(--accent-text)]"
      >
        <Glyph name="arrow-up-right" className="size-4" />
        ⚡ Download with LAMP TIK
      </a>
    </div>
  );
}
