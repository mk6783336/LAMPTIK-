"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Share, Smartphone, X, Youtube } from "lucide-react";
import Link from "next/link";

import { isAppMode, markAppInstalled, promptAppInstall } from "@/components/install-pwa";
import { triggerDownloadMonetization } from "@/lib/monetization";
import { androidApp } from "@/lib/site";

function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
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
 * Consumer Android APK & 1-Tap Web App installer hero for /app-download.
 *
 * Primary CTA: "⬇ Download LAMP TIK APK v<version> (4.2 MB)" — downloads the
 * signed native Android APK and sets the app session so returning users have
 * zero friction. The version label comes from `lib/site.ts`, never hardcoded.
 * Secondary CTA: "Install Instant Web App (1-Tap)" — triggers the native
 * browser PWA prompt or iPhone Add-to-Home-Screen sheet.
 */
export function AppInstallHero() {
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosModal, setIosModal] = useState(false);

  useEffect(() => {
    setUnlocked(isAppMode());
    function onSync() {
      setUnlocked(isAppMode());
    }
    window.addEventListener("appinstalled", onSync);
    window.addEventListener("lamptik:app-installed", onSync);
    return () => {
      window.removeEventListener("appinstalled", onSync);
      window.removeEventListener("lamptik:app-installed", onSync);
    };
  }, []);

  const onDownloadApk = useCallback(() => {
    triggerDownloadMonetization();
    markAppInstalled();
    setUnlocked(true);
    setTimeout(() => {
      document.getElementById("install-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
  }, []);

  const onInstantWebApp = useCallback(async () => {
    setBusy(true);
    try {
      const accepted = await promptAppInstall();
      if (accepted || isAppMode()) {
        markAppInstalled();
        setUnlocked(true);
        return;
      }
    } finally {
      setBusy(false);
    }
    if (isIosDevice()) {
      setIosModal(true);
      return;
    }
    document.getElementById("install-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-3.5">
      <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
        <a
          href={`/downloads/${androidApp.fileName}`}
          download={androidApp.downloadName}
          onClick={onDownloadApk}
          className="btn btn-primary tool-cta group h-[62px] w-full gap-2.5 px-7 text-base font-bold shadow-[0_20px_50px_-14px_rgba(34,211,238,0.65)] sm:w-auto sm:min-w-[330px]"
        >
          <Download className="size-5 transition-transform duration-200 group-hover:translate-y-0.5" />
          ⬇ Download LAMP TIK APK v{androidApp.version} ({androidApp.sizeLabel})
        </a>

        <button
          type="button"
          onClick={onInstantWebApp}
          disabled={busy}
          className="btn btn-ghost h-[62px] w-full gap-2 px-5 text-base font-semibold sm:w-auto"
        >
          {unlocked ? (
            <Check className="size-4 text-[var(--ok)]" />
          ) : (
            <Smartphone className="size-4 text-[var(--accent-text)]" />
          )}
          {busy ? "Opening installer…" : "Install Instant Web App (1-Tap)"}
        </button>
      </div>

      <p className="text-sm text-[var(--text-3)]">
        Official v{androidApp.version} Signed APK · {androidApp.sizeLabel} · {androidApp.minAndroid} · Native app, not a website wrapper
      </p>

      {unlocked ? (
        <Link
          href="/youtube-downloader?app=android_apk"
          className="group inline-flex items-center gap-2 rounded-full border border-[#ff0033]/40 bg-[#ff0033]/10 px-4 py-2 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:border-[#ff0033]/70"
        >
          <Youtube className="size-4 text-[#ff0033]" />
          App installed — open YouTube 1080p &amp; MP3 downloads →
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
              iPhone · Instant Web App
            </p>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">
              Add LAMP TIK to your Home Screen
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                {
                  title: "Open in Safari",
                  body: "Tap the Share icon in Safari's bottom toolbar.",
                },
                {
                  title: "Tap “Add to Home Screen”",
                  body: "Scroll down the share sheet and tap “Add to Home Screen”.",
                },
                {
                  title: "Tap Add & Launch",
                  body: "Open LAMP TIK from your home screen — every downloader is ready.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent-text)]"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--text-2)]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                markAppInstalled();
                setUnlocked(true);
                setIosModal(false);
              }}
              className="btn btn-primary mt-5 h-11 w-full text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
