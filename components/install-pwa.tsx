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

const APP_SESSION_COOKIE = "lamptik_app=1";
const APP_SESSION_COOKIE_PATTERN = /(?:^|;\s*)lamptik_app=1(?:;|$)/;

function isAndroidTwaContext(): boolean {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  if (!/Android/i.test(navigator.userAgent)) return false;
  try {
    return new URL(document.referrer).protocol === "android-app:";
  } catch {
    return false;
  }
}

function isStandaloneContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    // Fall back to the platform-specific display signal.
  }
  try {
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

function markAppSession(): void {
  if (typeof window === "undefined" || (!isStandaloneContext() && !isAndroidTwaContext())) return;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${APP_SESSION_COOKIE}; path=/; max-age=43200; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent("lamptik:app-installed"));
  } catch {
    // Standalone display mode remains authoritative if cookies are disabled.
  }
}

function registerAppServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // Browser policy may block service workers without blocking PWA installation.
  });
}

export function isAppMode(): boolean {
  if (isStandaloneContext() || isAndroidTwaContext()) return true;
  if (typeof document === "undefined") return false;
  try {
    return APP_SESSION_COOKIE_PATTERN.test(document.cookie);
  } catch {
    return false;
  }
}

/** Capture native install events and provide a common prompt API for CTAs. */
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
      setDeferred(null);
      globalWindow.__lamptikDeferredPrompt = null;
      // A browser-tab install is not proof that the current window is app mode.
      if (isStandaloneContext() || isAndroidTwaContext()) markAppSession();
    }

    globalWindow.__lamptikDeferredPrompt = globalWindow.__lamptikDeferredPrompt ?? null;
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    registerAppServiceWorker();
    if (isStandaloneContext() || isAndroidTwaContext()) markAppSession();
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
      return (await prompt.userChoice)?.outcome === "accepted";
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
    return (await prompt.userChoice)?.outcome === "accepted";
  } catch {
    return false;
  }
}
