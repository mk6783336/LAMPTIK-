import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocalizedLanding } from "@/components/seo/localized-landing";
import {
  getPlatformLanding,
  LOCALIZED_PLATFORM_SLUGS,
  PLATFORM_LOCALES,
  platformLanguageAlternates,
} from "@/lib/i18n/platform-landings";
import { siteUrl } from "@/lib/site";

/**
 * Platform landings per language: `/es/instagram-reels-downloader`,
 * `/ar/youtube-downloader`, `/de/facebook-video-downloader` and the rest —
 * three networks across nine languages.
 *
 * The locale roots stay TikTok pages. A query that names one network deserves
 * a page about that network, in the language it was searched in — which is the
 * whole point of a second segment here rather than another paragraph on the
 * root landing.
 *
 * `dynamicParams = false` matters as much as it does one level up: without it,
 * `/de/instagram-reels-downloader` would render a German page that does not
 * exist in content, and `/es/nonsense` would return a soft 404 instead of a
 * real one.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PLATFORM_LOCALES.flatMap((lang) =>
    Object.values(LOCALIZED_PLATFORM_SLUGS).map((tool) => ({ lang, tool })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; tool: string }>;
}): Promise<Metadata> {
  const { lang, tool } = await params;
  const entry = getPlatformLanding(lang, tool);
  if (!entry) return {};

  const { copy, platform } = entry;
  const path = `/${lang}/${tool}`;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    // Only the languages that really have this page, so hreflang never points
    // a crawler at a locale root that covers a different platform.
    alternates: {
      canonical: path,
      languages: platformLanguageAlternates(platform),
    },
    openGraph: {
      type: "website",
      url: `${siteUrl}${path}`,
      siteName: "LAMP TIK",
      title: copy.title,
      description: copy.description,
      locale: copy.htmlLang,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: copy.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/opengraph-image"],
    },
    other: { "content-language": copy.htmlLang },
  };
}

export default async function LocalizedPlatformPage({
  params,
}: {
  params: Promise<{ lang: string; tool: string }>;
}) {
  const { lang, tool } = await params;
  const entry = getPlatformLanding(lang, tool);
  if (!entry) notFound();

  return (
    <LocalizedLanding
      copy={entry.copy}
      platform={entry.platform}
      path={`/${lang}/${tool}`}
    />
  );
}
