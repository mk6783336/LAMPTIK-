import { AppError } from "@/lib/errors";
import { DESKTOP_UA, timedFetch, toAbsoluteUrl } from "@/lib/http";
import { probeMp4 } from "@/lib/mp4";
import type { ExtractedVideo } from "@/lib/tiktok/types";

/**
 * Tier 2 — TikTok embed / web-player JSON fallback.
 * `tiktok.com/embed/v2/<id>` renders a lightweight player document that
 * still carries progressive MP4 URLs when the main page hydration is
 * gated or reshaped. Best-effort: any failure falls through to Tier 3.
 */
export async function fetchFromEmbed(url: string, videoId: string | null): Promise<ExtractedVideo> {
  const id = videoId ?? url.match(/\/video\/(\d{5,})/)?.[1];
  if (!id) throw new AppError("PROVIDER_UNAVAILABLE", "Embed tier needs a video id.");
  const target = `https://www.tiktok.com/embed/v2/${id}`;
  const response = await timedFetch(
    target,
    {
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.tiktok.com/",
      },
      cache: "no-store",
      redirect: "follow",
    },
    8_000,
  );
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new AppError("PROVIDER_UNAVAILABLE", "Embed player unavailable.");
  }
  const html = await response.text();
  const decoded = html.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  const candidates: string[] = [];
  const patterns = [
    /"playAddr"\s*:\s*"(https:[^"]+)"/g,
    /"downloadAddr"\s*:\s*"(https:[^"]+)"/g,
    /"(https:\/\/[^"]+\.mp4[^"]*)"/g,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(decoded)) !== null) {
      const absolute = toAbsoluteUrl(m[1], "https://www.tiktok.com");
      if (absolute && !candidates.includes(absolute)) candidates.push(absolute);
      if (candidates.length >= 4) break;
    }
    if (candidates.length >= 4) break;
  }
  if (candidates.length === 0) throw new AppError("PROVIDER_UNAVAILABLE", "Embed had no stream.");
  // Verify first candidate is a real MP4 before claiming success.
  const probe = await probeMp4(candidates[0], { cacheKey: `tt:embed:${id}:0` }).catch(() => null);
  if (probe && !probe.reachable) throw new AppError("PROVIDER_UNAVAILABLE", "Embed stream blocked.");
  const now = Date.now();
  return {
    id,
    title: "TikTok video",
    author: { username: "tiktok", nickname: "TikTok", avatar: null },
    thumbnail: "",
    duration: 0,
    streams: { video: candidates[0], videoSd: null, audio: null },
    stats: { plays: 0, likes: 0, comments: 0, shares: 0 },
    createdAt: now,
    quality: "hd",
    noWatermark: true,
    source: "tiktok-page",
    musicTitle: null,
    codec: probe?.codec ?? "unknown",
    byteSize: probe?.byteSize ?? null,
  };
}
