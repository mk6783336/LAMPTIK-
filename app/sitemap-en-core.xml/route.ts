import { siteUrl } from "@/lib/site";

/**
 * `sitemap-en-core.xml` — the English money pages, and nothing else.
 *
 * `/sitemap.xml` is the honest inventory: every tool, every translated landing,
 * every guide. That is the right shape for coverage and the wrong shape for
 * priority — 88 URLs in one file give a crawler no reason to fetch the five
 * pages that carry the commercial queries.
 *
 * This chunk is deliberately small: the five English tool pages plus the tools
 * hub, each at priority 1.0 with `changefreq daily`. It does not replace
 * `/sitemap.xml`, and it never lists a translated URL — a localized page ranks
 * for its own language, and mixing the two in one file is how a crawler decides
 * the English page is one of thirteen duplicates.
 *
 * `lastmod` is the last content edit of each page, not the build date: a
 * `lastmod` that moves on every deploy is the signal Google documents as
 * untrustworthy, and it is what makes a sitemap ignored.
 */
const EN_CORE = [
  // Search demand order, not alphabetical: the TikTok home tool carries the
  // brand query, the three network pages carry the money queries.
  { path: "/", lastModified: "2026-11-13" },
  { path: "/facebook-video-downloader", lastModified: "2026-11-13" },
  { path: "/instagram-reels-downloader", lastModified: "2026-11-12" },
  { path: "/youtube-downloader", lastModified: "2026-11-13" },
  { path: "/twitter-video-downloader", lastModified: "2026-11-12" },
  { path: "/tools", lastModified: "2026-11-12" },
] as const;

export function GET() {
  const urls = EN_CORE.map(
    (page) =>
      "  <url>\n" +
      `    <loc>${siteUrl}${page.path}</loc>\n` +
      `    <lastmod>${page.lastModified}</lastmod>\n` +
      "    <changefreq>daily</changefreq>\n" +
      "    <priority>1.0</priority>\n" +
      "  </url>",
  ).join("\n");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // A sitemap may be re-read at any time; a long CDN TTL would keep serving
      // a stale URL list hours after a deploy that changed it.
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
