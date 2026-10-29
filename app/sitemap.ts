import type { MetadataRoute } from "next";

import { GUIDE_LIST } from "@/lib/content/guides";
import { SUB_TOOLS } from "@/lib/content/sub-tools";
import { LOCALE_CODES } from "@/lib/i18n/types";
import { siteConfig, siteUrl } from "@/lib/site";

/**
 * XML sitemap. Only routes that actually exist are listed — a sitemap full of
 * 404s is a quality signal against you, so the guide entries are generated
 * from the same `GUIDE_LIST` that produces the pages themselves.
 *
 * Priorities reflect commercial intent, not vanity: the three tools are the
 * pages we want ranked, guides are the supporting cluster, legal pages are
 * noise to a crawler and are declared as such.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(siteConfig.lastModified);

  const tools: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/instagram-reels-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/facebook-video-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/youtube-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  /**
   * The tool hub. One hop from the home page, one hop to each of the sixteen
   * leaf pages below — it is the crawl path that keeps them from being found
   * only through the sitemap.
   */
  const hubs: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/tools`,
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  /**
   * Programmatic sub-tools. Generated from the same array the pages render,
   * so a page can never exist without being listed (or vice versa).
   */
  const subTools: MetadataRoute.Sitemap = SUB_TOOLS.map((tool) => ({
    url: `${siteUrl}/${tool.slug}`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  /**
   * Regional landings. Each declared with its `alternates.languages` cluster,
   * which is the signal that ties /ar /es /de /pt to the English tool pages
   * instead of letting them compete as unrelated duplicates.
   */
  const languages: MetadataRoute.Sitemap = LOCALE_CODES.map((code) => ({
    url: `${siteUrl}/${code}`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    alternates: {
      languages: {
        en: siteUrl,
        ar: `${siteUrl}/ar`,
        es: `${siteUrl}/es`,
        de: `${siteUrl}/de`,
        pt: `${siteUrl}/pt`,
        "x-default": siteUrl,
      },
    },
  }));

  const guides: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/guides`,
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...GUIDE_LIST.map((guide) => ({
      url: `${siteUrl}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  const company: MetadataRoute.Sitemap = [
    {
      // Distribution hub for the off-store clients — a real page with its own
      // install steps, so it belongs in the index next to About and Contact.
      url: `${siteUrl}/apps`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const legal: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/privacy`,
      lastModified: updated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: updated,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  return [
    ...tools,
    ...hubs,
    ...subTools,
    ...languages,
    ...guides,
    ...company,
    ...legal,
  ];
}
