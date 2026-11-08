import type { Metadata } from "next";

import { CreatorToolPage } from "@/components/seo/creator-tool-page";
import { CaptionExtractor } from "@/components/tools/caption-extractor";
import { CREATOR_TOOL_MAP } from "@/lib/creator-tools";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * Static by construction: the route reads no request data (no `searchParams`,
 * no cookies, no headers), so its HTML is prerendered at build time and served
 * from the CDN edge. `force-static` states that explicitly — an import that
 * starts touching request state then fails the build instead of quietly
 * turning the page into a per-request render.
 */
export const dynamic = "force-static";

const tool = CREATOR_TOOL_MAP["tiktok-caption-hashtag-extractor"];

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

export default function TiktokCaptionHashtagExtractorPage() {
  return (
    <CreatorToolPage tool={tool}>
      <CaptionExtractor />
    </CreatorToolPage>
  );
}
