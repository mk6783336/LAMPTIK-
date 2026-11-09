import type { Metadata } from "next";

import { SubToolPage } from "@/components/seo/sub-tool-page";
import { SUB_TOOL_MAP } from "@/lib/content/sub-tools";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * Programmatic page: the YouTube downloader answered for readers in Germany.
 * All content lives in lib/content/sub-tools/download-videos-germany.ts.
 */
const tool = SUB_TOOL_MAP["download-videos-germany"];

export const metadata: Metadata = {
  title: { absolute: tool.title },
  description: tool.description,
  keywords: tool.keywords,
  alternates: pageAlternates("/download-videos-germany"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/download-videos-germany`,
    siteName: "LAMP TIK",
    title: tool.socialTitle,
    description: tool.description,
    // English page for a German audience: the document language is en, so the
    // Open Graph locale has to say en too — declaring de_DE here would describe
    // a translation that does not exist on this route.
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
