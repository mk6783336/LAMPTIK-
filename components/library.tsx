/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Film, FolderDown, Inbox, Loader2, Music2, ShieldCheck, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import {
  clearLibrary,
  deleteLibraryItem,
  exportLibraryItem,
  libraryBus,
  libraryUsage,
  listLibrary,
  notifyLibraryChanged,
  type LibraryItem,
} from "@/lib/library";
import { PLATFORMS } from "@/lib/platforms";

/** Ask every LibraryButton in the tree to re-read storage. */
export function refreshLibraryBadge(): void {
  libraryBus?.dispatchEvent(new Event("change"));
}

export function LibraryButton() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadCount = useCallback(async () => {
    const items = await listLibrary();
    setCount(items.length);
  }, []);

  useEffect(() => {
    setMounted(true);
    void loadCount();
    const onChange = () => void loadCount();
    libraryBus?.addEventListener("change", onChange);
    return () => libraryBus?.removeEventListener("change", onChange);
  }, [loadCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Saved on this device${count > 0 ? `: ${count}` : ""}`}
        title="Library — saved on this device"
        className="btn btn-ghost relative h-9 gap-1.5 px-2.5 text-sm sm:h-9"
      >
        <FolderDown className="size-4 text-[var(--accent-text)]" />
        <span className="hidden lg:inline">Library</span>
        {count > 0 ? (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[linear-gradient(120deg,#22d3ee,#6366f1)] px-1 font-mono text-xs font-semibold tabular-nums text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {mounted ? (
        <AnimatePresence>
          {open ? <LibraryModal onClose={() => setOpen(false)} onCount={loadCount} /> : null}
        </AnimatePresence>
      ) : null}
    </>
  );
}

interface LibraryModalProps {
  onClose: () => void;
  onCount: () => void | Promise<void>;
}

function LibraryModal({ onClose, onCount }: LibraryModalProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [usage, setUsage] = useState<{ usage: number | null; quota: number | null }>({
    usage: null,
    quota: null,
  });
  const reduceMotion = useReducedMotion();

  const reload = useCallback(async () => {
    const [next, figures] = await Promise.all([listLibrary(), libraryUsage()]);
    setItems(next);
    setUsage(figures);
    void onCount();
  }, [onCount]);

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    libraryBus?.addEventListener("change", onChange);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      libraryBus?.removeEventListener("change", onChange);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [reload, onClose]);

  const transition = {
    duration: reduceMotion ? 0 : 0.22,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <motion.button
        type="button"
        aria-label="Close library"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Saved on this device"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.985 }}
        transition={transition}
        className="panel relative z-10 flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-text)]">
              <FolderDown className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                Saved on this device
              </p>
              <p className="micro text-xs text-[var(--text-3)]">
                offline library · nothing on our servers
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {items && items.length > 0 ? (
              <ClearAllButton onCleared={reload} />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close library"
              className="grid size-8 place-items-center rounded-lg text-[var(--text-3)] transition-colors duration-200 hover:bg-[var(--field-strong)] hover:text-[var(--text)]"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5">
          {items === null ? (
            <div className="grid place-items-center gap-2 py-14 text-[var(--text-3)]">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <LibraryEmpty />
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <LibraryRow key={item.key} item={item} onChange={reload} />
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--glass-border)] px-4 py-2.5 sm:px-5">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-[var(--text-3)]">
            <ShieldCheck className="size-3.5 shrink-0 text-[var(--ok)]" />
            Kept in this browser only
          </span>
          {usage.quota ? (
            <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-3)]">
              {formatBytes(usage.usage ?? 0)} / {formatBytes(usage.quota)}
            </span>
          ) : null}
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}

const KIND_LABEL: Record<LibraryItem["kind"], string> = {
  hd: "HD MP4",
  sd: "SD MP4",
  audio: "MP3",
};

function ClearAllButton({ onCleared }: { onCleared: () => void | Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setConfirming(false);
        try {
          await clearLibrary();
          notifyLibraryChanged();
          await onCleared();
        } catch {
          // Storage refused the wipe — the list stays as it is.
        }
      }}
      className="btn btn-ghost h-8 gap-1.5 px-2.5 text-xs"
    >
      <Trash2 className="size-3.5" />
      {confirming ? "Clear everything?" : "Clear all"}
    </button>
  );
}

function LibraryRow({
  item,
  onChange,
}: {
  item: LibraryItem;
  onChange: () => void | Promise<void>;
}) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exported) return;
    const timer = window.setTimeout(() => setExported(false), 2200);
    return () => window.clearTimeout(timer);
  }, [exported]);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      // A silent save feels broken: confirm the hand-off immediately.
      await exportLibraryItem(item.key);
      setExported(true);
    } catch {
      setError("Couldn’t re-open that file — fetch it again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteLibraryItem(item.key);
      notifyLibraryChanged();
      await onChange();
    } catch {
      setError("Couldn’t delete that file.");
    }
  }

  return (
    <li className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-2.5">
      <div className="flex gap-3">
        <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--bg-sunken)]">
          {item.thumbnail && !failed ? (
            <img
              src={item.thumbnail}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center text-[var(--text-3)]">
              {item.kind === "audio" ? (
                <Music2 className="size-3.5" />
              ) : (
                <Film className="size-3.5" />
              )}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="line-clamp-2 text-sm font-medium leading-snug tracking-tight">
            {item.title}
          </p>
          <p className="mt-1 truncate font-mono text-xs tabular-nums text-[var(--text-3)]">
            {PLATFORMS[item.platform].name} · {KIND_LABEL[item.kind]} · {formatBytes(item.bytes)} ·{" "}
            {new Date(item.savedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="btn btn-primary h-7 gap-1.5 px-2.5 text-xs"
            >
              {exporting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : exported ? (
                <Check className="size-3" />
              ) : (
                <FolderDown className="size-3" />
              )}
              {exporting ? "Opening…" : exported ? "Saved to device" : "Save to device"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setConfirming(false);
                void handleDelete();
              }}
              className={cn(
                "btn h-7 gap-1.5 px-2.5 text-xs transition-colors duration-200",
                confirming ? "btn-ghost border-[color-mix(in_srgb,var(--err)_45%,transparent)] text-[var(--err)]" : "btn-ghost",
              )}
            >
              <Trash2 className="size-3" />
              {confirming ? "Delete?" : "Delete"}
            </button>
          </div>

          <p className="mt-1.5 truncate font-mono text-xs text-[var(--text-3)]" title={item.filename}>
            {item.filename}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-[var(--err)]" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function LibraryEmpty() {
  return (
    <div className="grid place-items-center gap-3 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-xl border border-[var(--glass-border)] bg-[var(--field)] text-[var(--text-3)]">
        <Inbox className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium">Nothing saved yet</p>
        <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-[var(--text-3)]">
          Every file you download is kept here automatically — under its original
          title, in this browser only.
        </p>
      </div>
    </div>
  );
}
