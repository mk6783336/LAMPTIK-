import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform-page";
import { platformLanguageAlternates } from "@/lib/i18n/platform-landings";
import { siteConfig, siteUrl } from "@/lib/site";

/** ≤60 chars, keyword first. */
const TITLE = "Facebook Video Downloader — Private Video Links & HD MP4";
const SOCIAL_TITLE =
  "Facebook Video Downloader HD — Download FB Reels & Public Videos to MP4";
const DESCRIPTION =
  "Download Facebook videos and Reels in HD MP4 — public posts and private video links you can open. fb.watch links resolve in one paste. No app, no login.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "facebook private video download",
    "facebook private video downloader online",
    "facebook watch video download hd",
    "facebook reel downloader hd",
    "fb.watch video download",
    "Facebook private video downloader",
    "Facebook video download without watermark",
    "Facebook video downloader HD",
    "download Facebook videos MP4",
    "Facebook Reels downloader",
    "fb.watch video downloader",
    "save Facebook video online free",
    "download long Facebook video 1080p",
  ],
  // Only the languages that actually carry this page — see the Reels page.
  alternates: {
    canonical: "/facebook-video-downloader",
    languages: platformLanguageAlternates("facebook"),
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/facebook-video-downloader`,
    siteName: siteConfig.name,
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SOCIAL_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function FacebookVideoDownloaderPage() {
  return <PlatformPage platform="facebook" />;
}
