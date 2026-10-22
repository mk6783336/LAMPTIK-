/**
 * Client-safe platform registry: labels, routes, brand accents, and the
 * per-platform copy used by the switcher, the detection badge, and the tool
 * CTA. Pure data — no server imports (this module ships to the browser).
 */
export type Platform = "tiktok" | "instagram" | "facebook" | "youtube";

export interface PlatformConfig {
  id: Platform;
  /** Human name: "TikTok" | "Instagram" | "Facebook". */
  name: string;
  /** Switcher label on desktop; mobile uses `shortLabel`. */
  switcherLabel: string;
  shortLabel: string;
  /** Route of the dedicated downloader page. */
  path: string;
  /** Detection badge copy, e.g. "Instagram Reel Detected ⚡". */
  detectedLabel: string;
  /** Input placeholder for this platform's page. */
  placeholder: string;
  /** Micro tag in the tool panel header. */
  panelTag: string;
  /** Result-card badge pill label. */
  pillLabel: string;
  /** How the platform's videos are described in toasts / status copy. */
  videoNoun: string;
  /** Small solid brand dot (decorative — contrast never matters here). */
  dotHex: string;
  /** One-line blurb used in cross-page "more downloaders" links. */
  blurb: string;
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    switcherLabel: "TikTok",
    shortLabel: "TikTok",
    path: "/",
    detectedLabel: "TikTok Stream Detected ⚡",
    placeholder: "Paste a TikTok video link…",
    panelTag: "TikTok · HD + MP3",
    pillLabel: "TikTok",
    videoNoun: "TikTok video",
    dotHex: "#00f2fe",
    blurb: "Watermark-free HD MP4 and original-sound MP3 from any TikTok or vt/vm short link.",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    switcherLabel: "Instagram Reels",
    shortLabel: "Reels",
    path: "/instagram-reels-downloader",
    detectedLabel: "Instagram Reel Detected ⚡",
    placeholder: "Paste an Instagram Reel link…",
    panelTag: "Instagram Reels · HD",
    pillLabel: "Instagram Reel",
    videoNoun: "Instagram Reel",
    dotHex: "#dc2743",
    blurb: "Original-quality Reels, photo-post videos, and IGTV at full 1080p — no watermark, no login.",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    switcherLabel: "YouTube HD",
    shortLabel: "YouTube",
    path: "/youtube-downloader",
    detectedLabel: "YouTube Video Detected ⚡",
    placeholder: "Paste a YouTube link (watch, Shorts, youtu.be)…",
    panelTag: "YouTube · 1080p + MP3 · App exclusive",
    pillLabel: "YouTube",
    videoNoun: "YouTube video",
    dotHex: "#ff0033",
    blurb: "App-exclusive 1080p/720p MP4, Shorts, and MP3 audio from any watch or youtu.be link.",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    switcherLabel: "Facebook HD",
    shortLabel: "Facebook",
    path: "/facebook-video-downloader",
    detectedLabel: "Facebook HD Video Detected ⚡",
    placeholder: "Paste a Facebook video link…",
    panelTag: "Facebook · HD video",
    pillLabel: "Facebook HD",
    videoNoun: "Facebook video",
    dotHex: "#1877f2",
    blurb: "Long HD Watch videos (1GB+), page uploads, and instant fb.watch share-link resolution.",
  },
};

export const PLATFORM_LIST: readonly Platform[] = ["tiktok", "instagram", "facebook", "youtube"];

export function isPlatform(value: unknown): value is Platform {
  return value === "tiktok" || value === "instagram" || value === "facebook" || value === "youtube";
}
