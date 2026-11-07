import type { MetadataRoute } from "next";

import { GUIDE_LIST } from "@/lib/content/guides";
import { SUB_TOOLS } from "@/lib/content/sub-tools";
import {
  LOCALIZED_PLATFORM_SLUGS,
  LOCALIZED_PLATFORMS,
  PLATFORM_LOCALES,
  platformLanguageAlternates,
} from "@/lib/i18n/platform-landings";
import { LOCALE_CODES } from "@/lib/i18n/types";
import { LANDING_LANGUAGES, siteConfig, siteUrl } from "@/lib/site";

/**
 * XML sitemap. Only routes that actually exist are listed — a sitemap full of
 * 404s is a quality signal against you, so the guide entries are generated
 * from the same `GUIDE_LIST` that produces the pages themselves.
 *
 * Priorities reflect commercial intent, not vanity: the three tools are the
 * pages we want ranked, guides are the supporting cluster, legal pages are
 * noise to a crawler and are declared as such.
 */
/**
 * Absolute hrefs for an hreflang cluster.
 *
 * Sitemap `<xhtml:link href>` must be a full URL — Google rejects a relative
 * one, and each rejected annotation counts as a sitemap error. The head
 * metadata can use relative paths because Next resolves them against
 * `metadataBase`; `sitemap.ts` writes the XML itself, so nothing does that for
 * us here.
 */
function absoluteLanguages(languages: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(languages).map(([code, path]) => [
      code,
      path === "/" ? siteUrl : `${siteUrl}${path}`,
    ]),
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(siteConfig.lastModified);

  /**
   * hreflang clusters per platform page, keyed by slug. Used on BOTH the
   * English tool page and its localized siblings: an annotation is only valid
   * when it is reciprocal, so listing the translations on one side only is the
   * same as declaring none, with extra errors.
   */
  const platformLanguages: Record<string, Record<string, string>> = Object.fromEntries(
    LOCALIZED_PLATFORMS.map((platform) => [
      LOCALIZED_PLATFORM_SLUGS[platform],
      absoluteLanguages(platformLanguageAlternates(platform)),
    ]),
  );

  const landingLanguages = absoluteLanguages(LANDING_LANGUAGES);

  const tools: MetadataRoute.Sitemap = [
    {
      // The English TikTok landing is also the `en` and `x-default` member of
      // the locale cluster, so it has to declare that cluster; without it the
      // eleven locale roots pointed at a page that never pointed back.
      url: siteUrl,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: landingLanguages },
    },
    {
      url: `${siteUrl}/instagram-reels-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: platformLanguages["instagram-reels-downloader"] },
    },
    {
      url: `${siteUrl}/facebook-video-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: platformLanguages["facebook-video-downloader"] },
    },
    {
      // X/Twitter is a fifth surface with its own resolver, not a sub-tool of
      // an existing platform page — so it is declared here, beside the four
      // platform landings it sits next to in the footer.
      url: `${siteUrl}/twitter-video-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 0.95,
      alternates: {
        languages: absoluteLanguages({
          en: "/twitter-video-downloader",
          "x-default": "/twitter-video-downloader",
        }),
      },
    },
    {
      url: `${siteUrl}/youtube-downloader`,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: platformLanguages["youtube-downloader"] },
    },
  ];

  /**
   * The tool hub. One hop from the home page, one hop to each of the fifteen
   * leaf pages below — it is the crawl path that keeps them from being found
   * only through the sitemap.
   *
   * Its own date, not `siteConfig.lastModified`: the hub did not exist when
   * that site-wide date was set, and an inaccurate lastmod is exactly what
   * Google tells publishers not to send.
   */
  const hubs: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/tools`,
      lastModified: new Date("2026-10-29"),
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
   * Creator micro-tools, written as literal URLs.
   *
   * `scripts/check-content-links.mjs` reads this file structurally: it credits
   * `...subTools` because that array is generated from the same slugs the
   * routes use, but it cannot resolve a URL built from an imported object. A
   * literal entry keeps the "route exists ⇔ sitemap lists it" assertion active
   * for these four pages, which is the check that catches a typo before a
   * crawler does.
   */
  const creatorTools: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/tiktok-money-calculator`,
      lastModified: new Date("2026-11-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/tiktok-safe-zone-checker`,
      lastModified: new Date("2026-11-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/video-thumbnail-downloader`,
      lastModified: new Date("2026-11-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/tiktok-caption-hashtag-extractor`,
      lastModified: new Date("2026-11-07"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
  ];

  /**
   * Regional landings. Each declared with its `alternates.languages` cluster,
   * which is the signal that ties /ar /es /de /pt to the English tool pages
   * instead of letting them compete as unrelated duplicates.
   *
   * The cluster is the same `LANDING_LANGUAGES` object the pages emit in their
   * <head>, only absolutised. This used to be a second, hand-written map that
   * still said `pt` after the HTML moved to `pt-BR`, so the sitemap and the
   * page disagreed about the language of /pt — exactly the mismatch the
   * Localization audit reports.
   */
  const languages: MetadataRoute.Sitemap = LOCALE_CODES.map((code) => ({
    url: `${siteUrl}/${code}`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    // 0.9, level with the programmatic sub-tools: a localized root is a
    // monetizable landing page in its own market, not a secondary mirror of
    // the English home page.
    priority: 0.9,
    alternates: { languages: landingLanguages },
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
      // The commercial page: the only route whose job is revenue rather than a
      // download, so it outranks About and Contact in the sitemap even though
      // it is a "company" page.
      url: `${siteUrl}/services`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.7,
    },
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

  /**
   * Platform landings outside English: six URLs, each the same-platform sibling
   * of the English tool page rather than a translation of the locale root. They
   * carry their own hreflang cluster so Google pairs /es/youtube-downloader with
   * /youtube-downloader and /ar/youtube-downloader — not with the TikTok
   * landing that happens to share the language.
   */
  const localizedPlatforms: MetadataRoute.Sitemap = PLATFORM_LOCALES.flatMap((code) =>
    LOCALIZED_PLATFORMS.map((platform) => ({
      url: `${siteUrl}/${code}/${LOCALIZED_PLATFORM_SLUGS[platform]}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: platformLanguages[LOCALIZED_PLATFORM_SLUGS[platform]] },
    })),
  );

  return [
    ...tools,
    ...hubs,
    ...subTools,
    ...creatorTools,
    ...languages,
    ...localizedPlatforms,
    ...guides,
    ...company,
    ...legal,
  ];
}
