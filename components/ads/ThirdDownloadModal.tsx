"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, ShieldCheck, X, Zap } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { adsterraBannerKey, monetagSmartlinkUrl, triggerDirectLinkMonetization } from "@/lib/monetization";

const COUNTDOWN_SECONDS = 10;
const COUNT_KEY = "lamptik_dl_count";

/**
 * Increment the lifetime download counter and report whether this download
 * is an interstitial one (every 3rd: #3, #6, #9, …). Storage failures
 * (private mode) fail open — the download is never blocked.
 */
export function recordDownloadAndCheckThird(): boolean {
  try {
    const raw = window.localStorage.getItem(COUNT_KEY);
    const count = (raw ? Number(raw) : 0) + 1;
    window.localStorage.setItem(COUNT_KEY, String(Number.isFinite(count) ? count : 1));
    const total = Number.isFinite(count) ? count : 1;
    return total % 3 === 0;
  } catch {
    return false;
  }
}

/**
 * "Every 3rd Download = 10-Second Sponsored Ad" interstitial. Opens
 * immediately on the qualifying download while the file itself keeps
 * streaming underneath — the modal NEVER gates, delays, or cancels the
 * download. A live 10s countdown, the Adsterra banner, and the sponsor CTA
 * fill the pause; closing early is always allowed.
 */
export function ThirdDownloadModal({
  open,
  filename,
  onClose,
}: {
  /** Controlled by the download flow (every 3rd download). */
  open: boolean;
  /** Real filename streaming underneath, for honest status copy. */
  filename: string | null;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const firedRef = useRef(false);

  // Reset + fire the Monetag zone each time the modal opens. The zone call
  // is fire-and-forget with its own cap; the download underneath is
  // unaffected either way.
  useEffect(() => {
    if (!open) return;
    setRemaining(COUNTDOWN_SECONDS);
    firedRef.current = false;
    const zoneTimer = window.setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        triggerDirectLinkMonetization();
      }
    }, 600);
    const ticker = window.setInterval(() => {
      setRemaining((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => {
      window.clearTimeout(zoneTimer);
      window.clearInterval(ticker);
    };
  }, [open ]);

  // Escape closes; the download underneath keeps streaming.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const ready = remaining <= 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sponsor break — your download is already streaming"
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4"
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="panel relative w-full max-w-md p-6 text-center sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sponsor break (download continues)"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[var(--text-3)] transition-colors duration-200 hover:text-[var(--text)]"
        >
          <X className="size-4" />
        </button>

        <p className="micro text-[var(--text-3)]">10-second sponsor break</p>
        <h2 className="balance mt-2 text-[1.25rem] font-semibold leading-tight tracking-headline">
          Supporting free unlimited HD downloads
        </h2>

        {/* Live countdown — measurement, never a fake loop. */}
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--accent)]/50 bg-[var(--accent-soft)] font-mono text-[1.1rem] font-bold tabular-nums text-[var(--accent-text)]"
        >
          {ready ? <Check className="size-6" /> : `${remaining}s`}
        </div>
        <p className="mt-2 text-[12.5px] text-[var(--text-2)]">
          {ready ? (
            <>Ready! Your file {filename ? <>“{filename}” </> : null}is downloading.</>
          ) : (
            <>Your download is streaming — {remaining}s…</>
          )}
        </p>

        <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--glass-border)] p-2.5">
          <p className="micro mb-2 text-center text-[9px] text-[var(--text-3)]/80">
            Sponsored · keeps LAMP TIK 100% free
          </p>
          <AdSlot
            format="leaderboard"
            label="Sponsored — keeps LAMP TIK 100% free"
            zoneId={adsterraBannerKey}
          />
          <a
            href={monetagSmartlinkUrl}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="group mt-2.5 flex items-center gap-2.5 rounded-[12px] border border-[var(--glass-border)] bg-[var(--field)] px-3 py-2.5 text-left transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform duration-200 group-hover:scale-110">
              <Zap className="size-4" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold tracking-tight">
                Support free HD downloads — visit sponsor ↗
              </span>
              <span className="block truncate text-[11px] text-[var(--text-3)]">
                Sponsored · opens in a new tab
              </span>
            </span>
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-primary mt-4 h-11 w-full gap-2 text-[13.5px] font-semibold"
        >
          {ready ? (
            <>
              <Check className="size-4" />
              Continue to my download
            </>
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" />
              Downloading… close anytime
            </>
          )}
        </button>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-3)]">
          <ShieldCheck className="size-3.5 text-[var(--ok)]" />
          Closing never cancels your file.
        </p>
      </div>
    </div>
  );
}
