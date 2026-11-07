import type { Metadata } from "next";

import { CreatorToolPage } from "@/components/seo/creator-tool-page";
import { ThumbnailExtractor } from "@/components/tools/thumbnail-extractor";
import { CREATOR_TOOL_MAP } from "@/lib/creator-tools";
import { pageAlternates, siteUrl } from "@/lib/site";

const tool = CREATOR_TOOL_MAP["video-thumbnail-downloader"];

export const metadata: Metadata = {
  title: { absolute: tool.title },
  description: tool.description,
  alternates: pageAlternates(`/${tool.slug}`),
  openGraph: {
    type: "website",
    url: `${siteUrl}/${tool.slug}`,
    siteName: "LAMP TIK",
    title: tool.title,
    description: tool.description,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: tool.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: tool.title,
    description: tool.description,
    images: ["/opengraph-image"],
  },
};

export default function VideoThumbnailDownloaderPage() {
  return (
    <CreatorToolPage tool={tool}>
      <ThumbnailExtractor />
    </CreatorToolPage>
  );
}
