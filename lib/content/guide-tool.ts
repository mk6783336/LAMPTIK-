import type { ToolId } from "@/lib/content/tool-seo";

/**
 * Guide → tool mapping.
 *
 * Every article points back at the one tool that satisfies the search intent
 * that brought the reader in, using the tool's exact-match anchor text. That
 * gives the twelve guides a real link path into the three money pages instead
 * of a generic "open the downloader" that lands everyone on TikTok.
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
  "download-tiktok-without-logo-iphone-android": {
    ...TIKTOK,
    anchor: "download TikTok videos without a logo on iPhone and Android",
    inline: "It works in Safari and Chrome with no app, and saves straight to Files or Gallery.",
    heading: "Save a logo-free TikTok to your phone",
    body: "The same clean stream works on iOS and Android — the file lands in Files on iPhone and Downloads or Gallery on Android.",
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
  "tiktok-short-links-not-working": {
    ...TIKTOK,
    anchor: "resolve a vt.tiktok.com short link",
    inline: "If your short link is valid, the tool expands it server-side and finds the video in one request.",
    heading: "Try your short link here",
    body: "Paste the vt.tiktok.com or vm.tiktok.com link exactly as TikTok's share sheet gave it — the redirect is followed for you.",
    cta: "Resolve a short link",
  },
  "is-downloading-tiktok-videos-legal": {
    ...TIKTOK,
    anchor: "download your own TikTok videos",
    inline: "For your own uploads — the case that is unambiguously fine — this is the tool to use.",
    heading: "Download the videos you own",
    body: "Archiving your own uploads is the use case the tool is built for: original quality, no watermark, nothing stored.",
    cta: "Open the TikTok downloader",
  },
  "repurpose-tiktok-videos-for-youtube-shorts-instagram-reels": {
    ...TIKTOK,
    anchor: "download TikTok videos in original quality",
    inline: "Grab the watermark-free master first — every re-upload downstream inherits its quality.",
    heading: "Start with a clean master file",
    body: "Export from the highest-quality watermark-free source you can get, then trim and re-upload per platform.",
    cta: "Download the master MP4",
  },
  "why-tiktok-video-quality-drops-after-upload": {
    ...TIKTOK,
    anchor: "check what TikTok did to your file",
    inline: "Downloading the served stream is the fastest way to see the re-encode for yourself.",
    heading: "Inspect the stream TikTok actually serves",
    body: "Save the file and compare it with your export — resolution, bitrate and frame rate are all visible before you download.",
    cta: "Download and compare",
  },
  "tiktok-audio-bitrate-and-sound-quality": {
    ...TIKTOK,
    anchor: "extract TikTok audio as MP3",
    inline: "Hearing the served audio is the honest test of what compression cost you.",
    heading: "Listen to the source audio",
    body: "The MP3 is the video's own AAC track, repackaged — exactly what TikTok streams, with nothing added.",
    cta: "Extract the audio",
  },
  "browser-vs-app-tiktok-downloaders-safety": {
    ...TIKTOK,
    anchor: "use a browser-based TikTok downloader",
    inline: "Nothing to install, no permissions to grant — the smallest attack surface for a one-off save.",
    heading: "Nothing to install",
    body: "This runs entirely in your browser tab: no APK, no extension, no permissions, no sideloaded code.",
    cta: "Open the browser downloader",
  },
  "how-to-download-instagram-reels-in-hd": {
    tool: "instagram",
    href: "/instagram-reels-downloader",
    anchor: "download Instagram Reels in original HD",
    inline: "Paste a /reel/ or /p/ link and you get the exact MP4 Instagram's player streams.",
    heading: "Save a Reel in original quality",
    body: "The Instagram downloader reads video_versions and hands you the progressive MP4 — picture and audio together.",
    cta: "Open the Reels downloader",
  },
  "how-to-download-large-facebook-videos-in-1080p-hd": {
    tool: "facebook",
    href: "/facebook-video-downloader",
    anchor: "download large Facebook videos in HD",
    inline: "1GB+ Watch uploads stream through — no size ceiling, no restart from zero.",
    heading: "Save a long Facebook video",
    body: "Public Watch pages, page uploads and Reels resolve; long files stream straight to disk.",
    cta: "Open the Facebook downloader",
  },
  "repurpose-short-videos-across-tiktok-reels-shorts": {
    ...TIKTOK,
    anchor: "download a watermark-free master",
    inline: "Every cross-post starts with one clean source file — get that first.",
    heading: "Get the master before you re-post",
    body: "Download the original stream once, then trim and upload per platform instead of re-recording each time.",
    cta: "Download the master",
  },
};

export function guideTool(slug: string): GuideToolLink {
  return GUIDE_TOOL[slug] ?? GUIDE_TOOL["download-tiktok-video-without-watermark"];
}
