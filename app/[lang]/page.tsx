import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocalizedLanding } from "@/components/seo/localized-landing";
import { getLanding, isLocaleCode, LOCALE_CODES } from "@/lib/i18n";
import { LANDING_LANGUAGES, siteUrl } from "@/lib/site";

/**
 * Regional landing pages: /ar, /es, /de, /pt.
 *
 * `generateStaticParams` + `dynamicParams = false` keeps this segment from
 * behaving like a catch-all: an unknown first path segment (`/random`) returns
 * a real 404 instead of a soft-404 English page, which is what an open
 * `[lang]` route would otherwise ship to Google.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocaleCode(lang)) return {};

  const copy = getLanding(lang);
  const path = `/${copy.code}`;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    // Each landing declares the same cluster as its siblings, so Google reads
    // them as translations of the home tool instead of duplicates.
    alternates: { canonical: path, languages: LANDING_LANGUAGES },
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

export default async function LocaleLandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocaleCode(lang)) notFound();

  return <LocalizedLanding copy={getLanding(lang)} />;
}
