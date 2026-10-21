"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2, Lock, Smartphone } from "lucide-react";

import { isAppMode, markAppInstalled, promptAppInstall } from "@/components/install-pwa";

/** Consumer YouTube lock card with direct Android APK download + 1-Tap Web App install. */
export function YouTubeLock() {
  const [busy, setBusy] = useState(false);

  const installNow = useCallback(async () => {
    setBusy(true);
    try {
      const accepted = await promptAppInstall();
      if (accepted || isAppMode()) {
        markAppInstalled();
      }
    } finally {
      setBusy(false);
    }
  }, []);

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
        Unlock Built-in YouTube 1080p &amp; MP3 Downloader
      </h2>
      <p className="pretty mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
        Download the official LAMP TIK Android APK (v2.2) or install the 1-Tap Web App to unlock unlimited Full HD 1080p/720p YouTube videos, Shorts, and MP3 downloads.
      </p>
      <div className="mt-5 flex flex-col items-center gap-2.5">
        <a
          href="/downloads/lamptik-v2.2.apk"
          download="LAMP-TIK-v2.2.apk"
          onClick={() => markAppInstalled()}
          className="btn tool-cta h-[54px] w-full gap-2 px-6 text-[15px] font-semibold sm:w-auto sm:min-w-[310px]"
        >
          <Download className="size-4" />
          ⬇ Download LAMP TIK APK (Android)
        </a>
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={installNow}
            disabled={busy}
            className="btn btn-ghost h-11 gap-2 px-4 text-[13px]"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4 text-[var(--accent-text)]" />}
            {busy ? "Opening installer…" : "Install Instant Web App (1-Tap)"}
          </button>
          <Link href="/app-download" className="btn btn-ghost h-11 gap-2 px-4 text-[13px]">
            Official Android APK Hub →
          </Link>
        </div>
      </div>
      <div id="yt-lock-more" className="mx-auto mt-4 flex max-w-md scroll-mt-24 flex-wrap items-center justify-center gap-2 text-[12px] text-[var(--text-3)]">
        <span className="inline-flex items-center gap-1.5">
          <Check className="size-3.5 text-[var(--ok)]" />
          Version 2.2 · Signed Android APK · 100% Free
        </span>
      </div>
    </div>
  );
}
