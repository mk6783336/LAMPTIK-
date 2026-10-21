"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2, Lock, Zap } from "lucide-react";

import { isAppMode, promptAppInstall } from "@/components/install-pwa";

/** Strict YouTube lock: browser users see install guidance, not the resolver input. */
export function YouTubeLock() {
  const [busy, setBusy] = useState(false);

  const installNow = useCallback(async () => {
    setBusy(true);
    try {
      await promptAppInstall();
      if (isAppMode()) {
        window.dispatchEvent(new CustomEvent("lamptik:app-installed"));
      }
    } finally {
      setBusy(false);
    }
    document.getElementById("yt-lock-more")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        YouTube downloads are available in the installed LAMP TIK app.
      </h2>
      <p className="pretty mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
        Install from Chrome or add LAMP TIK to your home screen, then open this page in standalone app mode to use YouTube HD, Shorts and MP3 downloads.
      </p>
      <div className="mt-5 flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={installNow}
          disabled={busy}
          className="btn tool-cta h-[54px] w-full gap-2 px-6 text-[15px] font-semibold sm:w-auto sm:min-w-[300px]"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" fill="currentColor" strokeWidth={0} />}
          {busy ? "Opening install prompt…" : "Install LAMP TIK"}
        </button>
        <Link href="/app-download" className="btn btn-ghost h-11 gap-2 px-5 text-[13px]">
          <Download className="size-4" />
          PWA install &amp; Android wrapper guide
        </Link>
      </div>
      <div id="yt-lock-more" className="mx-auto mt-4 flex max-w-md scroll-mt-24 flex-wrap items-center justify-center gap-2 text-[12px] text-[var(--text-3)]">
        <span className="inline-flex items-center gap-1.5">
          <Check className="size-3.5 text-[var(--ok)]" />
          On iPhone? Safari → Share → Add to Home Screen.
        </span>
      </div>
    </div>
  );
}
