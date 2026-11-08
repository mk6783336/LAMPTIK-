import type { Metadata } from "next";

import { CreatorToolPage } from "@/components/seo/creator-tool-page";
import { SafeZoneChecker } from "@/components/tools/safe-zone-checker";
import { CREATOR_TOOL_MAP } from "@/lib/creator-tools";
import { pageAlternates, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const tool = CREATOR_TOOL_MAP["tiktok-safe-zone-checker"];

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

export default function TiktokSafeZoneCheckerPage() {
  return (
    <CreatorToolPage tool={tool}>
      <SafeZoneChecker />
    </CreatorToolPage>
  );
}
