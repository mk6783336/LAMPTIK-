"use client";

import { useCallback, useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const APP_INSTALLED_KEY = "lamptik_app_installed";
const APP_SESSION_COOKIE = "lamptik_app=1";
const APP_SESSION_COOKIE_PATTERN = /(?:^|;\s*)lamptik_app=1(?:;|$)/;

/** Persist App Mode in both localStorage and cookie so client & API routes recognize it immediately. */
export function markAppInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_INSTALLED_KEY, "1");
  } catch {
    // Ignore private-mode storage errors.
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${APP_SESSION_COOKIE}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  } catch {
    // Ignore cookie errors.
  }
  try {
    window.dispatchEvent(new CustomEvent("lamptik:app-installed"));
  } catch {
    // Ignore dispatch errors.
  }
}

function isAndroidAppUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/LampTikAndroidApp|;\s*wv\)/i.test(ua)) return true;
  if (typeof document !== "undefined" && /Android/i.test(ua)) {
    try {
      if (new URL(document.referrer).protocol === "android-app:") return true;
    } catch {
      // Ignore referrer parse errors.
    }
  }
  return false;
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    // Ignore.
  }
  try {
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  } catch {
    // Ignore.
  }
  return false;
}

function hasAppQueryParam(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("app") === "android_apk" || params.get("source") === "pwa";
  } catch {
    return false;
  }
}

function registerAppServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // Service worker registration is non-blocking.
  });
}

/**
 * Automatically unlock YouTube Downloader when ANY of these are true:
 *   1. User-Agent contains `LampTikAndroidApp` or Android WebView (`; wv)`),
 *   2. URL has `?app=android_apk` or `?source=pwa` (which sets cookie `lamptik_app=1`
 *      and `localStorage.setItem('lamptik_app_installed', '1')`),
 *   3. Browser is in `display-mode: standalone`, or `lamptik_app=1` / `lamptik_app_installed` is set.
 */
export function isAppMode(): boolean {
  if (typeof window === "undefined") return false;

  if (isAndroidAppUserAgent() || isStandaloneDisplayMode() || hasAppQueryParam()) {
    try {
      window.localStorage.setItem(APP_INSTALLED_KEY, "1");
    } catch {
      // Ignore.
    }
    try {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${APP_SESSION_COOKIE}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    } catch {
      // Ignore.
    }
    return true;
  }

  try {
    if (window.localStorage.getItem(APP_INSTALLED_KEY) === "1") {
      try {
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${APP_SESSION_COOKIE}; path=/; max-age=31536000; SameSite=Lax${secure}`;
      } catch {
        // Ignore.
      }
      return true;
    }
  } catch {
    // Ignore.
  }

  try {
    if (typeof document !== "undefined" && APP_SESSION_COOKIE_PATTERN.test(document.cookie)) {
      return true;
    }
  } catch {
    // Ignore.
  }

  return false;
}

/** Capture native install events and synchronize App Mode on launch. */
export function InstallPwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const globalWindow = window as Window & {
      __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    function onPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferred(event);
      globalWindow.__lamptikDeferredPrompt = event;
    }
    function onInstalled() {
      markAppInstalled();
      setDeferred(null);
      globalWindow.__lamptikDeferredPrompt = null;
    }

    globalWindow.__lamptikDeferredPrompt = globalWindow.__lamptikDeferredPrompt ?? null;
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    registerAppServiceWorker();
    if (isAppMode()) {
      markAppInstalled();
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const globalWindow = window as Window & {
      __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null;
    };
    const prompt = deferred ?? globalWindow.__lamptikDeferredPrompt;
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        markAppInstalled();
      }
      return choice?.outcome === "accepted";
    } catch {
      return false;
    } finally {
      setDeferred(null);
      globalWindow.__lamptikDeferredPrompt = null;
    }
  }, [deferred]);

  useEffect(() => {
    const globalWindow = window as Window & { __lamptikInstall?: () => Promise<boolean> };
    globalWindow.__lamptikInstall = promptInstall;
    const onRequest = () => void promptInstall();
    window.addEventListener("lamptik:prompt-install", onRequest);
    return () => {
      window.removeEventListener("lamptik:prompt-install", onRequest);
      delete globalWindow.__lamptikInstall;
    };
  }, [promptInstall]);

  return null;
}

export async function promptAppInstall(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const globalWindow = window as Window & {
    __lamptikInstall?: () => Promise<boolean>;
    __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null;
  };
  if (globalWindow.__lamptikInstall) return globalWindow.__lamptikInstall();
  const prompt = globalWindow.__lamptikDeferredPrompt;
  if (!prompt) return false;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice?.outcome === "accepted") {
      markAppInstalled();
    }
    return choice?.outcome === "accepted";
  } catch {
    return false;
  }
}
