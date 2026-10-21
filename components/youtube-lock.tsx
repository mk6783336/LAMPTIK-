"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Lock, Smartphone, Zap } from "lucide-react";

import { markAppInstalled, promptAppInstall } from "@/components/install-pwa";

/**
 * Luxury lock screen for the App-Exclusive YouTube downloader. Shown wherever
 * a YouTube link lands without App Mode — the dedicated /youtube-downloader
 * page and any YouTube paste on the homepage.
 */
export function YouTubeLock({ onUnlocked }: { onUnlocked?: () => void }) {
  const [busy, setBusy] = useState(false);

  const installAndUnlock = useCallback(async () => {
    setBusy(true);
    try {
      const accepted = await promptAppInstall();
      if (accepted) {
        onUnlocked?.();
        return;
      }
    } finally {
      setBusy(false);
    }
    // No native prompt (iOS / dismissed): the app page explains the 3 taps.
    document.getElementById("yt-lock-more")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [onUnlocked]);

  const unlockNow = useCallback(() => {
    markAppInstalled();
    onUnlocked?.();
  }, [onUnlocked]);

  return (
    <div className="panel relative overflow-hidden p-6 text-center sm:p-8" data-accent="youtube">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ff0033]/70 to-transparent"
      />
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#ff0033]/15 text-[#ff5c7a]">
        <Lock className="size-5" />
      </span>
      <h2 className="balance mx-auto mt-4 max-w-md text-[1.4rem] font-semibold leading-tight tracking-headline">
        🔒 YouTube 1080p &amp; Long-Video Downloader is an App-Exclusive Feature
      </h2>
      <p className="pretty mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
        Install the free LAMP TIK Web App in 1 click to unlock unlimited YouTube HD
        1080p / 720p, Shorts &amp; MP3 downloads — no Play Store, no sign-up.
      </p>
      <div className="mt-5 flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={installAndUnlock}
          disabled={busy}
          className="btn tool-cta h-[54px] w-full gap-2 px-6 text-[15px] font-semibold sm:w-auto sm:min-w-[300px]"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" fill="currentColor" strokeWidth={0} />}
          {busy ? "Opening install prompt…" : "Install & Unlock Now"}
        </button>
        <button
          type="button"
          onClick={unlockNow}
          className="btn btn-ghost h-10 gap-2 px-4 text-[12.5px]"
        >
          <Smartphone className="size-3.5" />
          Already installed — Unlock here
        </button>
      </div>
      <div id="yt-lock-more" className="mx-auto mt-4 flex max-w-md scroll-mt-24 flex-wrap items-center justify-center gap-2 text-[12px] text-[var(--text-3)]">
        <span className="inline-flex items-center gap-1.5">
          <Check className="size-3.5 text-[var(--ok)]" />
          On iPhone? Safari → Share → Add to Home Screen.
        </span>
        <Link href="/app-download" className="font-semibold text-[var(--accent-text)] underline-offset-4 hover:underline">
          See the 3-tap install guide →
        </Link>
      </div>
    </div>
  );
}
