import { asRecord, asString, timedFetch } from "@/lib/http";

export interface OEmbedProbe {
  title: string;
  authorName: string;
  authorUsername: string | null;
  thumbnail: string | null;
}

/**
 * TikTok's official oEmbed endpoint is used only to distinguish "the video
 * exists but TikTok blocked media extraction" from "the video is gone".
 */
export async function probeOEmbed(url: string): Promise<OEmbedProbe | null> {
  try {
    const endpoint = new URL("https://www.tiktok.com/oembed");
    endpoint.searchParams.set("url", url);

    const response = await timedFetch(
      endpoint,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      },
      7_000,
    );

    if (!response.ok) return null;

    const data = asRecord(await response.json());
    if (!data) return null;

    return {
      title: asString(data.title) ?? "",
      authorName: asString(data.author_name) ?? "",
      authorUsername: asString(data.author_unique_id),
      thumbnail: asString(data.thumbnail_url),
    };
  } catch {
    return null;
  }
}
