import type { ToolId } from "@/lib/content/tool-seo";

/**
 * Guide → tool mapping.
 *
 * Every article points back at the one tool that satisfies the search intent
 * that brought the reader in, using the tool's exact-match anchor text. That
 * gives the four guides a real link path into the money pages instead of a
 * generic "open the downloader" that lands everyone on TikTok.
 *
 * The map used to hold fourteen entries; the guides were consolidated by intent
 * (see `lib/content/guides.ts`), so only the four hub slugs remain. The retired
 * ones redirect, which means a stale entry here can no longer silently point at
 * a 301 — `getGuide` would return null and the card would vanish.
 */
export interface GuideToolLink {
  tool: ToolId;
  href: string;
  /** Exact-match anchor text — the keyword the destination page targets. */
  anchor: string;
  /** One line of context for the inline link near the top of the article. */
  inline: string;
  /** Card heading + body at the end of the article. */
  heading: string;
  body: string;
  cta: string;
}

const TIKTOK: Omit<GuideToolLink, "anchor" | "inline" | "heading" | "body" | "cta"> = {
  tool: "tiktok",
  href: "/",
};

export const GUIDE_TOOL: Record<string, GuideToolLink> = {
  "download-tiktok-video-without-watermark": {
    ...TIKTOK,
    anchor: "TikTok video downloader without watermark",
    inline: "Paste any tiktok.com or vt.tiktok.com link and the clean MP4 is yours.",
    heading: "Download your first clean TikTok now",
    body: "The tool follows the steps above exactly: paste a link, we probe the source stream, you save the file.",
    cta: "Open the TikTok downloader",
  },
  "download-tiktok-audio-as-mp3": {
    ...TIKTOK,
    anchor: "TikTok to MP3 converter",
    inline: "Choose “Audio only (MP3)” and you get the original sound without a video file.",
    heading: "Extract the original sound as MP3",
    body: "One tap on the MP3 button pulls the audio track alone at roughly 128 kbps — no video data downloaded.",
    cta: "Convert TikTok to MP3",
  },
  "why-tiktok-video-quality-drops-after-upload": {
    ...TIKTOK,
    anchor: "check what TikTok did to your file",
    inline: "Downloading the served stream is the fastest way to see the re-encode for yourself.",
    heading: "Inspect the stream TikTok actually serves",
    body: "Save the file and compare it with your export — resolution, bitrate and frame rate are all visible before you download.",
    cta: "Download and compare",
  },
  "is-downloading-tiktok-videos-legal": {
    ...TIKTOK,
    anchor: "download your own TikTok videos",
    inline: "For your own uploads — the case that is unambiguously fine — this is the tool to use.",
    heading: "Download the videos you own",
    body: "Archiving your own uploads is the use case the tool is built for: original quality, no watermark, nothing stored.",
    cta: "Open the TikTok downloader",
  },
};

export function guideTool(slug: string): GuideToolLink {
  return GUIDE_TOOL[slug] ?? GUIDE_TOOL["download-tiktok-video-without-watermark"];
}
