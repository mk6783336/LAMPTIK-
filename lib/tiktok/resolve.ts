import { extractTikTokUrl, parseTikTokUrl, type ParsedTikTokUrl } from "@/lib/tiktok/parse";
import { timedFetch, MOBILE_UA } from "@/lib/http";

/**
 * Follow redirects on vt.tiktok.com / vm.tiktok.com short links. The resolved
 * URL is parsed again so the video id and username become available. If the
 * redirect cannot be followed (bot checks, network), the original short URL is
 * returned and the extractor providers attempt it directly.
 */
export async function resolveShortLink(parsed: ParsedTikTokUrl): Promise<ParsedTikTokUrl> {
  if (!parsed.isShort) return parsed;

  try {
    const response = await timedFetch(
      parsed.url,
      {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": MOBILE_UA,
        },
      },
      8_000,
    );

    const finalUrl = response.url;
    await response.body?.cancel();

    if (finalUrl && finalUrl !== parsed.url) {
      const reparsed = parseTikTokUrl(finalUrl);
      if (reparsed?.videoId) return reparsed;

      const embedded = extractTikTokUrl(finalUrl);
      if (embedded) {
        const fallback = parseTikTokUrl(embedded);
        if (fallback?.videoId) return fallback;
      }
    }
  } catch {
    // Best-effort resolution; providers can still handle the short URL.
  }

  return parsed;
}
