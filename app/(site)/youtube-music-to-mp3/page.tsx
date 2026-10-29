import type { Metadata } from "next";

import { SubToolPage } from "@/components/seo/sub-tool-page";
import { SUB_TOOL_MAP } from "@/lib/content/sub-tools";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * Programmatic page: one search intent, its own copy and schema.
 * All content lives in lib/content/sub-tools/youtube-music-to-mp3.ts.
 */
const tool = SUB_TOOL_MAP["youtube-music-to-mp3"];

export const metadata: Metadata = {
  title: { absolute: tool.title },
  description: tool.description,
  keywords: tool.keywords,
  alternates: pageAlternates("/youtube-music-to-mp3"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/youtube-music-to-mp3`,
    siteName: "LAMP TIK",
    title: tool.socialTitle,
    description: tool.description,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: tool.socialTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: tool.socialTitle,
    description: tool.description,
    images: ["/opengraph-image"],
  },
};

export default function Page() {
  return <SubToolPage tool={tool} />;
}
