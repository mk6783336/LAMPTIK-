import type { MetadataRoute } from "next";

import { GUIDE_LIST } from "@/lib/content/guides";
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
  ];

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

  return [...tools, ...guides, ...company, ...legal];
}
