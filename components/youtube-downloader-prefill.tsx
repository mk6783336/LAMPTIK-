"use client";

import { useSearchParams } from "next/navigation";

import { Downloader } from "@/components/downloader";

/**
 * `?url=` prefill for /youtube-downloader, read in the browser.
 *
 * The route used to read `searchParams` on the server, which made the whole page
 * `ƒ Dynamic` — every visit paid a function invocation and a `Cache: MISS`
 * instead of the prerendered HTML every other tool page gets. The parameter only
 * prefills an input, so it belongs in the client: the page is now static and
 * this island reads the query after hydration.
 *
 * Only an 11-character YouTube id survives the match: the parameter can never
 * smuggle another platform or an arbitrary URL into the resolver.
 */
function prefilledVideoUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  const match = value.match(
    /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[&?#].*)?$/,
  );
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : undefined;
}

export function YouTubeDownloaderWithPrefill() {
  const params = useSearchParams();
  return <Downloader platform="youtube" initialUrl={prefilledVideoUrl(params.get("url"))} />;
}
