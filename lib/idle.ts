/**
 * Run `task` when the browser is genuinely idle, not merely hydrated.
 *
 * `afterInteractive` is the earliest Next.js can hydrate a component; it is
 * still inside the window a visitor spends reading the URL field, and a tag
 * that skins a chart or rewrites a config in that window competes for the main
 * thread with the input handlers. `requestIdleCallback` moves the work to the
 * first gap after paint, and the `timeout` guarantees it still runs on a busy
 * phone (Safari below 15.4 has no `requestIdleCallback`, so a 1-frame timeout
 * stands in for it).
 *
 * Returns a cancel function so a StrictMode unmount (or a route change) cannot
 * leave the task queued twice.
 */
type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function whenIdle(task: () => void, timeoutMs = 2_000): () => void {
  if (typeof window === "undefined") return () => {};

  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(task, { timeout: timeoutMs });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, 1);
  return () => window.clearTimeout(handle);
}
