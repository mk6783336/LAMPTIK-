import type { Metadata } from "next";

import { SubToolPage } from "@/components/seo/sub-tool-page";
import { SUB_TOOL_MAP } from "@/lib/content/sub-tools";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * Programmatic page: the Facebook downloader answered for Canadian readers.
 * All content lives in lib/content/sub-tools/download-videos-canada.ts.
 */
const tool = SUB_TOOL_MAP["download-videos-canada"];

export const metadata: Metadata = {
  title: { absolute: tool.title },
  description: tool.description,
  keywords: tool.keywords,
  alternates: pageAlternates("/download-videos-canada"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/download-videos-canada`,
    siteName: "LAMP TIK",
    title: tool.socialTitle,
    description: tool.description,
    locale: "en_CA",
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
