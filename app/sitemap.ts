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
import { LANDING_LANGUAGES, siteUrl } from "@/lib/site";

/**
 * XML sitemap. Only routes that actually exist are listed — a sitemap full of
 * 404s is a quality signal against you, so the guide entries are generated
 * from the same `GUIDE_LIST` that produces the pages themselves.
 *
 * Priorities reflect commercial intent, not vanity: the tools are the pages we
 * want ranked, guides are the supporting cluster, and the legal pages are
 * deliberately absent. They used to be listed at priority 0.2, which was enough
 * for `/privacy` to take the brand query at position 3.3 while `/` sat at 34.8:
 * four near-identical legal documents naming "LAMP TIK" competed with the tool
 * for its own entity. They stay reachable (200, footer-linked, honest for ad
 * reviewers) but are `noindex, follow` and no longer declared here.
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

/**
 * `lastmod` per page group: the date of the last commit that actually changed
 * that group's rendered content, not the build date and not one shared number.
 *
 * 75 of the 94 URLs used to carry a single constant (`siteConfig.lastModified`,
 * 2026-10-20). Every page edited after it then shipped a `lastmod` up to 19 days
 * older than the change, and `lastmod` is the signal Google uses to decide what
 * to recrawl — so the pages that were edited and still not in the index were
 * described to Google as unchanged. Grouping by the file that renders each
 * page keeps the date honest and still leaves one place to update.
 */
const REVISED = {
  home: "2026-11-08",
  // 2026-11-09: the FAQ copy these three pages render changed (LOW-KD phrases
  // answered on facebook, instagram and twitter). An older `lastmod` tells
  // Google the page it should recrawl is unchanged, which is the opposite of
  // what two not-yet-indexed URLs need.
  instagram: "2026-11-09",
  facebook: "2026-11-09",
  twitter: "2026-11-09",
  youtube: "2026-11-08",
  toolsHub: "2026-11-08",
  subTools: "2026-11-09",
  // 2026-11-09: the Spanish root now answers the Telegram and HD wording it
  // was already getting impressions for.
  // 2026-11-12: /es gained the cluster hub section that links the Facebook, X
  // and Reels-audio pages. All locale roots render the same component, so the
  // group moves together rather than pretending only /es changed.
  localized: "2026-11-12",
  // 2026-11-12: fourteen guides became four hubs that absorb their copy.
  guidesHub: "2026-11-12",
  services: "2026-11-03",
  apps: "2026-11-03",
  about: "2026-10-30",
  contact: "2026-10-30",
} as const;

const revised = (date: string) => new Date(date);

export default function sitemap(): MetadataRoute.Sitemap {

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
      lastModified: revised(REVISED.home),
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: landingLanguages },
    },
    {
      url: `${siteUrl}/instagram-reels-downloader`,
      lastModified: revised(REVISED.instagram),
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: platformLanguages["instagram-reels-downloader"] },
    },
    {
      url: `${siteUrl}/facebook-video-downloader`,
      lastModified: revised(REVISED.facebook),
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: platformLanguages["facebook-video-downloader"] },
    },
    {
      // X/Twitter is a fifth surface with its own resolver, not a sub-tool of
      // an existing platform page — so it is declared here, beside the four
      // platform landings it sits next to in the footer.
      url: `${siteUrl}/twitter-video-downloader`,
      lastModified: revised(REVISED.twitter),
      changeFrequency: "daily",
      priority: 0.95,
      alternates: {
        languages: absoluteLanguages({
          en: "/twitter-video-downloader",
          es: "/es/twitter-video-downloader",
          "x-default": "/twitter-video-downloader",
        }),
      },
    },
    {
      url: `${siteUrl}/youtube-downloader`,
      lastModified: revised(REVISED.youtube),
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages: platformLanguages["youtube-downloader"] },
    },
    // The two Spanish twins. Written as literal URLs, like the creator tools:
    // `scripts/check-content-links.mjs` reads this file structurally and can
    // assert "route exists ⇔ sitemap lists it" only for literals.
    {
      url: `${siteUrl}/es/twitter-video-downloader`,
      lastModified: new Date("2026-11-12"),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: absoluteLanguages({
          en: "/twitter-video-downloader",
          es: "/es/twitter-video-downloader",
          "x-default": "/twitter-video-downloader",
        }),
      },
    },
    {
      url: `${siteUrl}/es/instagram-reels-audio`,
      lastModified: new Date("2026-11-12"),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: absoluteLanguages({
          en: "/instagram-reels-audio",
          es: "/es/instagram-reels-audio",
          "x-default": "/instagram-reels-audio",
        }),
      },
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
      lastModified: revised(REVISED.toolsHub),
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
    lastModified: revised(REVISED.subTools),
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
      lastModified: new Date("2026-11-09"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/tiktok-safe-zone-checker`,
      lastModified: new Date("2026-11-09"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/video-thumbnail-downloader`,
      lastModified: new Date("2026-11-09"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/tiktok-caption-hashtag-extractor`,
      lastModified: new Date("2026-11-09"),
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
    lastModified: revised(REVISED.localized),
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
      lastModified: revised(REVISED.guidesHub),
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
      lastModified: revised(REVISED.services),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      // Distribution hub for the off-store clients — a real page with its own
      // install steps, so it belongs in the index next to About and Contact.
      url: `${siteUrl}/apps`,
      lastModified: revised(REVISED.apps),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: revised(REVISED.about),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: revised(REVISED.contact),
      changeFrequency: "monthly",
      priority: 0.4,
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
      lastModified: revised(REVISED.localized),
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
  ];
}
