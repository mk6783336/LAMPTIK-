/**
 * Client-safe platform registry: labels, routes, brand accents, and the
 * per-platform copy used by the switcher, the detection badge, and the tool
 * CTA. Pure data — no server imports (this module ships to the browser).
 */
export type Platform = "tiktok" | "instagram" | "facebook";

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
    switcherLabel: "TikTok Downloader",
    shortLabel: "TikTok",
    path: "/",
    detectedLabel: "TikTok Stream Detected ⚡",
    placeholder: "Paste a TikTok video link…",
    panelTag: "tiktok · hd + mp3",
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
    panelTag: "instagram reels · hd",
    pillLabel: "Instagram Reel",
    videoNoun: "Instagram Reel",
    dotHex: "#dc2743",
    blurb: "Original-quality Reels, photo-post videos, and IGTV at full 1080p — no watermark, no login.",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    switcherLabel: "Facebook HD",
    shortLabel: "Facebook",
    path: "/facebook-video-downloader",
    detectedLabel: "Facebook HD Video Detected ⚡",
    placeholder: "Paste a Facebook video link…",
    panelTag: "facebook · hd video",
    pillLabel: "Facebook HD",
    videoNoun: "Facebook video",
    dotHex: "#1877f2",
    blurb: "Long HD Watch videos (1GB+), page uploads, and instant fb.watch share-link resolution.",
  },
};

export const PLATFORM_LIST: readonly Platform[] = ["tiktok", "instagram", "facebook"];

export function isPlatform(value: unknown): value is Platform {
  return value === "tiktok" || value === "instagram" || value === "facebook";
}
