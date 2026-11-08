import { notFound, redirect } from "next/navigation";

/**
 * `lamptik.online/<video url>` — the URL-prefix shortcut.
 *
 * SaveFrom grew on `sfrom.net/<url>` and SssTik on the same trick: a visitor
 * types the service's domain in front of a video address in the browser bar,
 * presses Enter, and lands on the tool with the link already resolving. It is
 * the cheapest shareable mechanic a downloader has, and it needs no extension
 * and no app.
 *
 * The path arrives as `/https://www.tiktok.com/@x/video/123`, which Next hands
 * over as segments. Joining them can collapse the scheme's `//` (a router may
 * drop empty segments), so the scheme is re-normalised before parsing rather
 * than assumed intact.
 *
 * Two hard rules:
 *
 * 1. Only a real video URL becomes a redirect. Anything else is a 404, so this
 *    route cannot be used as an open redirector.
 * 2. Only hosts this site can actually resolve are accepted. A redirect to a
 *    page that fails to resolve would be worse than not having the feature.
 */

/** Hosts with a resolver behind them (see `lib/detect.ts`). */
const RESOLVABLE_HOSTS = [
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
];

function resolvable(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  return RESOLVABLE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export default async function UrlPrefixBridge({
  params,
}: {
  params: Promise<{ target?: string[] }>;
}) {
  const { target } = await params;
  const joined = (target ?? []).join("/");
  if (!joined) notFound();

  // `/https:/x.com/a` → `https://x.com/a`; a correctly preserved `//` is kept.
  const candidate = decodeURIComponent(joined).replace(/^(https?:)\/*/i, "$1//");

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    notFound();
  }
  if (!/^https?:$/.test(parsed.protocol) || !resolvable(parsed)) notFound();

  redirect(`/?url=${encodeURIComponent(parsed.toString())}`);
}
