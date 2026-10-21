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

/** Persist App Mode: localStorage + cookie so server/client both remember. */
export function markAppInstalled(): void {
  try {
    window.localStorage.setItem(APP_INSTALLED_KEY, "1");
  } catch {
    // Private mode — cookie still records the unlock for this session.
  }
  try {
    document.cookie = "lamptik_app=1; path=/; max-age=31536000; SameSite=Lax";
  } catch {
    // Cookie jar unavailable — localStorage is the source of truth.
  }
  try {
    window.dispatchEvent(new CustomEvent("lamptik:app-installed"));
  } catch {
    // Event dispatch is best-effort.
  }
}

/** True when the user is inside the installed app (or unlocked App Mode). */
export function isAppMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(APP_INSTALLED_KEY) === "1") return true;
  } catch {
    // Storage unavailable — fall through to display-mode checks.
  }
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    // matchMedia unavailable — fall through.
  }
  try {
    // iOS Safari standalone flag.
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
      return true;
    }
  } catch {
    // Ignore.
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "pwa") return true;
  } catch {
    // URL parsing failed — not in app mode.
  }
  return false;
}

/**
 * Global PWA installer. Mount once in the root layout: captures
 * `beforeinstallprompt` (Chrome/Edge/Android), marks App Mode when the user
 * installs or launches via `?source=pwa` / standalone, and exposes a
 * `lamptik:prompt-install` event + `window.__lamptikInstall()` helper so any
 * CTA on any page can trigger the native prompt without prop drilling.
 */
export function InstallPwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferred(event);
      (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent }).__lamptikDeferredPrompt =
        event;
    }
    function onInstalled() {
      markAppInstalled();
      setDeferred(null);
      (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null }).__lamptikDeferredPrompt =
        null;
    }
    function upgradeFromLaunch() {
      // Launched from the home-screen icon — the install already happened.
      if (isAppMode()) markAppInstalled();
    }

    (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null }).__lamptikDeferredPrompt =
      (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null }).__lamptikDeferredPrompt ??
      null;
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    upgradeFromLaunch();

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const stored =
      deferred ??
      (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null }).__lamptikDeferredPrompt;
    if (!stored) return false;
    try {
      await stored.prompt();
      const choice = await stored.userChoice;
      if (choice?.outcome === "accepted") markAppInstalled();
      return choice?.outcome === "accepted";
    } catch {
      return false;
    } finally {
      setDeferred(null);
      (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null }).__lamptikDeferredPrompt =
        null;
    }
  }, [deferred]);

  useEffect(() => {
    (window as Window & { __lamptikInstall?: () => Promise<boolean> }).__lamptikInstall = promptInstall;
    function onRequest() {
      void promptInstall();
    }
    window.addEventListener("lamptik:prompt-install", onRequest);
    return () => {
      window.removeEventListener("lamptik:prompt-install", onRequest);
      delete (window as Window & { __lamptikInstall?: unknown }).__lamptikInstall;
    };
  }, [promptInstall]);

  return null;
}

/** Fire-and-forget helper any CTA can call: native prompt or false. */
export async function promptAppInstall(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const direct = (window as Window & { __lamptikInstall?: () => Promise<boolean> }).__lamptikInstall;
  if (direct) return direct();
  const stored = (window as Window & { __lamptikDeferredPrompt?: BeforeInstallPromptEvent | null })
    .__lamptikDeferredPrompt;
  if (!stored) return false;
  try {
    await stored.prompt();
    const choice = await stored.userChoice;
    if (choice?.outcome === "accepted") markAppInstalled();
    return choice?.outcome === "accepted";
  } catch {
    return false;
  }
}
