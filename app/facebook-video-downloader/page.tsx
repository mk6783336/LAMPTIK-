import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform-page";
import { pageAlternates, siteConfig, siteUrl } from "@/lib/site";

/** ≤60 chars, keyword first. */
const TITLE = "Facebook Video Downloader HD — Download Videos to MP4";
const SOCIAL_TITLE =
  "Facebook Video Downloader HD — Download FB Reels & Public Videos to MP4";
const DESCRIPTION =
  "Download Facebook videos in HD MP4 — Watch uploads, page videos, Reels and 1GB+ long files. fb.watch and share links resolve instantly. Free, no app, no login, no watermark.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "Facebook video downloader HD",
    "download Facebook videos MP4",
    "Facebook Reels downloader",
    "fb.watch video downloader",
    "save Facebook video online free",
    "download long Facebook video 1080p",
  ],
  alternates: pageAlternates("/facebook-video-downloader"),
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
