"use client";

import { useEffect, useState } from "react";
import { Youtube } from "lucide-react";

import { Downloader } from "@/components/downloader";
import { isAppMode } from "@/components/install-pwa";
import { YouTubeLock } from "@/components/youtube-lock";

/**
 * Gate wrapper: renders the full YouTube downloader in App Mode, otherwise
 * the lock card. Listens for installs/unlocks so the tool appears the moment
 * App Mode turns on — no reload required.
 */
export function YoutubeGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnlocked(isAppMode());
    setReady(true);
    function onUnlock() {
      setUnlocked(true);
    }
    window.addEventListener("lamptik:app-installed", onUnlock);
    return () => window.removeEventListener("lamptik:app-installed", onUnlock);
  }, []);

  if (!ready) {
    return (
      <div className="panel p-6" aria-hidden="true">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton mt-3 h-[54px] w-full" />
      </div>
    );
  }

  if (!unlocked) {
    return <YouTubeLock onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div>
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-pill border border-[color-mix(in_srgb,var(--ok)_32%,transparent)] bg-[var(--ok-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ok)]">
        <Youtube className="size-3" />
        App Mode unlocked — unlimited YouTube HD &amp; MP3
      </p>
      <Downloader platform="youtube" />
    </div>
  );
}
