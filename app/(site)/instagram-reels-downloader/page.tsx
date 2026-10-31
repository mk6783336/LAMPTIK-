import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform-page";
import { platformLanguageAlternates } from "@/lib/i18n/platform-landings";
import { siteConfig, siteUrl } from "@/lib/site";

/** ≤60 chars, keyword first. */
const TITLE = "Instagram Reels Downloader — Save Reels & Videos in HD";
const SOCIAL_TITLE =
  "Instagram Reels Downloader — Save IG Reels & Videos in Original HD MP4";
const DESCRIPTION =
  "Save Instagram Reels, IGTV and video posts in original 1080p MP4 with audio — no watermark, no login, no app. Paste a /reel/, /p/ or /tv/ link.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "Instagram Reels downloader",
    "download Instagram Reels HD",
    "save IG Reels without watermark",
    "Instagram video downloader online free",
    "Instagram Reels MP4 1080p",
    "download Instagram video no login",
  ],
  // The languages that actually carry this page, not the whole site: declaring
  // `de` here would tell Google the Reels page is translated at /de, which is
  // a TikTok landing.
  alternates: {
    canonical: "/instagram-reels-downloader",
    languages: platformLanguageAlternates("instagram"),
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/instagram-reels-downloader`,
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

export default function InstagramReelsDownloaderPage() {
  return <PlatformPage platform="instagram" />;
}
