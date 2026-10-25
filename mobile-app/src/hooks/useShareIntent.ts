import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";

import { extractUrl } from "../lib/api";

/**
 * Android share sheet → LampTik.
 *
 * The `SEND` intent declared in `app.json` arrives as a deep link
 * (`lamptik://share?text=<shared text>`), and the shared text is usually the
 * video URL plus the app's own promo copy. Cold starts surface it through
 * `getInitialURL()`; later shares arrive as a `url` event, so both paths are
 * wired.
 */
function pickUrl(input: string): string | null {
  if (!input) return null;
  try {
    const parsed = new URL(input);
    const shared =
      parsed.searchParams.get("text") ??
      parsed.searchParams.get("url") ??
      parsed.searchParams.get("content");
    if (shared) return extractUrl(shared);
    // A bare `lamptik://<https url>` payload arrives as the host + path.
    const bare = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
    return extractUrl(bare) ?? extractUrl(input);
  } catch {
    return extractUrl(input);
  }
}

export function useShareIntent(onUrl: (url: string) => void): void {
  // Keep the latest callback without re-subscribing to the Linking listener on
  // every render (the handler identity changes as App state changes).
  const handler = useRef(onUrl);
  handler.current = onUrl;

  useEffect(() => {
    let active = true;

    void Linking.getInitialURL().then((initial) => {
      if (!active || !initial) return;
      const url = pickUrl(initial);
      if (url) handler.current(url);
    });

    const subscription = Linking.addEventListener("url", (event) => {
      const url = pickUrl(event.url);
      if (url) handler.current(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
