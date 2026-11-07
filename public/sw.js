/*
 * LAMP TIK service worker — deliberately does almost nothing.
 *
 * It used to be a two-line `importScripts('https://3nbf4.com/…')` shim that
 * handed this origin's worker scope to a third-party push SDK. Whatever that
 * script cached, it controlled every navigation and every /_next/static
 * request on the site, so returning visitors could be served an old JS bundle
 * against a new HTML document — the "7.4s LCP" Clarity reports for sessions
 * that are not cold. A worker cannot be removed remotely once it is installed,
 * so the fix has to be a new script at the same URL: the browser byte-compares
 * this file on every navigation, installs it, and the activate handler below
 * deletes every cache the previous worker created.
 *
 * There is no `fetch` handler on purpose. With none, the browser's default is a
 * plain network request: HTML and hashed `_next/static` chunks are never
 * intercepted, never served stale, and never cached by us.
 */

const VERSION = "lamptik-2026-11-07";

self.addEventListener("install", () => {
  // Take over immediately instead of waiting for every tab to close — the
  // point of this release is to get the old worker out of the way.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (error) {
        // Cache storage blocked or empty: nothing to clean.
      }
      await self.clients.claim();
    })(),
  );
});

// Registration passes no version, so answer a message ping with the build id:
// it is the one way to confirm from the page which worker is in control.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "VERSION") {
    event.source?.postMessage({ type: "VERSION", version: VERSION });
  }
});
