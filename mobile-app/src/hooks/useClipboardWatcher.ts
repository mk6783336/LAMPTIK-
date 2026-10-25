import * as Clipboard from "expo-clipboard";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { extractUrl, isSupportedUrl } from "../lib/api";

const POLL_MS = 1_500;

/**
 * "Copy a link anywhere → LampTik already has it."
 *
 * Polls the clipboard only while the app is in the foreground (a background
 * timer would burn battery for nothing), remembers the last handled URL so a
 * still-copied link is not re-resolved on every tick, and ignores anything that
 * is not a supported platform link.
 */
export function useClipboardWatcher(enabled: boolean, onUrl: (url: string) => void): void {
  const handled = useRef<string | null>(null);
  const handler = useRef(onUrl);
  handler.current = onUrl;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        const text = await Clipboard.getStringAsync();
        if (cancelled || !text) return;
        const url = extractUrl(text);
        if (!url || !isSupportedUrl(url)) return;
        if (handled.current === url) return;
        handled.current = url;
        handler.current(url);
      } catch {
        // Clipboard read denied (iOS shows a permission prompt on first use) —
        // sharing and pasting still work, so this is not an error worth showing.
      }
    };

    const start = () => {
      if (timer) return;
      void tick();
      timer = setInterval(tick, POLL_MS);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onStateChange = (state: AppStateStatus) => {
      if (state === "active") start();
      else stop();
    };

    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", onStateChange);

    return () => {
      cancelled = true;
      stop();
      subscription.remove();
    };
  }, [enabled]);
}
