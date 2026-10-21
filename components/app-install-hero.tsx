"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, BellPlus, Check, Download, Share, X, Youtube } from "lucide-react";
import Link from "next/link";

import { isAppMode, promptAppInstall } from "@/components/install-pwa";

function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh — detect via touch points.
  if (/Macintosh/.test(ua) && typeof window !== "undefined") {
    try {
      return navigator.maxTouchPoints > 1;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Install hero for /app-download. Android/Chrome/Edge gets the real native
 * `beforeinstallprompt`; iOS gets a visual Share → Add to Home Screen modal
 * (Apple exposes no prompt). Strict rule: nothing here unlocks YouTube in a
 * browser — unlocking happens only via a real install or app launch.
 */
export function AppInstallHero() {
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosModal, setIosModal] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  useEffect(() => {
    setUnlocked(isAppMode());
    function onPrompt() {
      setNativeAvailable(true);
    }
    function onInstalled() {
      setUnlocked(true);
      setNativeAvailable(false);
    }
    function onUnlock() {
      setUnlocked(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("lamptik:app-installed", onUnlock);
    if (
      (window as Window & { __lamptikDeferredPrompt?: unknown }).__lamptikDeferredPrompt
    ) {
      setNativeAvailable(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("lamptik:app-installed", onUnlock);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (unlocked) {
      document.getElementById("youtube-perk")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setBusy(true);
    try {
      const accepted = await promptAppInstall();
      if (accepted) {
        setUnlocked(true);
        return;
      }
    } finally {
      setBusy(false);
    }
    // No native prompt (or dismissed): iOS gets the visual guide, everyone
    // else jumps to the 3-step instructions below.
    if (isIosDevice()) {
      setIosModal(true);
      return;
    }
    document.getElementById("install-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [unlocked]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full flex-col items-center gap-2.5 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={onInstall}
          disabled={busy}
          className="btn tool-cta group h-[60px] w-full gap-2.5 px-6 text-[16px] font-semibold sm:w-auto sm:min-w-[340px]"
        >
          {unlocked ? (
            <Check className="size-5" />
          ) : nativeAvailable ? (
            <BellPlus className="size-5 transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <ArrowDown className="size-5 transition-transform duration-200 group-hover:translate-y-0.5" />
          )}
          {busy
            ? "Opening install prompt…"
            : unlocked
              ? "App Installed — Open YouTube HD"
              : "Install LAMP TIK App (Android & iOS)"}
        </button>
        {!unlocked ? (
          <a
            href="/downloads/lamp-tik-v2.1.apk"
            download="lamp-tik-v2.1.apk"
            className="btn btn-ghost h-[60px] w-full gap-2 px-5 text-[14px] sm:w-auto"
          >
            <Download className="size-4" />
            Download APK (v2.1)
          </a>
        ) : null}
      </div>
      <p className="text-[12px] text-[var(--text-3)]">
        {unlocked
          ? "App Mode is on — YouTube 1080p / 720p / MP3 is unlocked in the installed app."
          : "One tap — no Play Store account, no sign-up, free forever. YouTube unlocks inside the installed app only."}
      </p>
      {unlocked ? (
        <Link
          href="/youtube-downloader"
          className="group inline-flex items-center gap-2 rounded-pill border border-[var(--glass-border)] bg-[var(--field)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
        >
          <Youtube className="size-4 text-[#ff0033]" />
          Open the App-Exclusive YouTube HD Downloader
        </Link>
      ) : null}

      {iosModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install on iPhone — step by step"
          className="fixed inset-0 z-50 grid place-items-center p-4"
        >
          <button
            type="button"
            aria-label="Close install guide"
            onClick={() => setIosModal(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />
          <div className="panel relative w-full max-w-md p-6 text-left">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setIosModal(false)}
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[var(--text-3)] transition-colors hover:text-[var(--text)]"
            >
              <X className="size-4" />
            </button>
            <p className="tool-badge">
              <Share className="size-3.5" />
              iPhone / iPad · Safari
            </p>
            <h2 className="mt-3 text-[18px] font-semibold tracking-tight">
              Add LAMP TIK to your Home Screen
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                {
                  title: "Open this page in Safari",
                  body: "Installation only works from Safari on iOS — not Chrome.",
                },
                {
                  title: "Tap the Share button ⎋",
                  body: "Tap the square-with-arrow icon in Safari's bottom toolbar.",
                },
                {
                  title: "Scroll down → Add to Home Screen",
                  body: "Tap “Add to Home Screen”, rename it if you like, then tap Add.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-[12px] font-bold text-[var(--accent-text)]"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold">{step.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                setIosModal(false);
                document.getElementById("install-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="btn btn-primary mt-5 h-11 w-full text-[13.5px] font-semibold"
            >
              Got it — show me the install steps
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
