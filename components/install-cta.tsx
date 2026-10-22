"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, BellPlus, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/**
 * Massive neon install CTA. Uses the real PWA `beforeinstallprompt` when
 * the browser offers it; otherwise smooth-scrolls to the manual
 * OS-specific instructions below. Never a fake button: the label always
 * describes what will actually happen.
 */
export function InstallCta() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferred(event);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onClick = useCallback(async () => {
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } finally {
        setDeferred(null);
        setBusy(false);
      }
      return;
    }
    document.getElementById("install-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [deferred]);

  if (installed) {
    return (
      <p
        role="status"
        className="btn btn-primary tool-cta h-[60px] w-full gap-2.5 px-6 text-base font-semibold sm:w-auto sm:min-w-[340px]"
      >
        <Smartphone className="size-5" />
        App installed — launch it from your home screen
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="btn btn-primary tool-cta group h-[60px] w-full gap-2.5 px-6 text-base font-semibold sm:w-auto sm:min-w-[340px]"
      >
        {deferred ? (
          <BellPlus className="size-5 transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <ArrowDown className="size-5 transition-transform duration-200 group-hover:translate-y-0.5" />
        )}
        {busy ? "Opening install prompt…" : deferred ? "Install Web App Now" : "Add to Home Screen"}
      </button>
      <p className="text-sm text-[var(--text-3)]">
        {deferred
          ? "One tap — no app store, no sign-up, free forever."
          : "Tap to jump to the 3-step guide for your phone below."}
      </p>
    </div>
  );
}
