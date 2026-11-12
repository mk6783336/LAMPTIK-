import { siteUrl } from "@/lib/site";

/**
 * `sitemap-priority.xml` — a two-URL sitemap for the pages Google knows only
 * as a URL.
 *
 * `/facebook-video-downloader` and `/twitter-video-downloader` are declared in
 * `/sitemap.xml` at priority 1 next to 86 siblings, and URL Inspection still
 * answers "URL is unknown to Google … never crawled" for both while the other
 * tool pages in that same file are indexed. An 88-URL file gives a crawler no
 * reason to pick these two out; a file that contains **only** the pages we want
 * fetched is the narrowest way to say "these, first" without touching anything
 * that already works.
 *
 * It is additive on purpose. `/sitemap.xml` keeps declaring both URLs, so a
 * crawler that only ever reads the main sitemap loses nothing, and Google
 * reports each submitted sitemap separately in Search Console — which is how
 * this experiment gets measured (`contents: 2` here, `web:88` there).
 *
 * `lastmod` is whenever that page's own copy last changed (2026-11-09: the FAQ
 * block on the Facebook and X pages), never the build date. A `lastmod` that
 * moves on every deploy is exactly the signal Google documents as untrustworthy.
 */
const PRIORITY_PAGES = [
  // Ordered as they should be fetched: the Facebook page carries the larger
  // search demand and the longer crawl gap.
  { path: "/facebook-video-downloader", lastModified: "2026-11-09" },
  { path: "/twitter-video-downloader", lastModified: "2026-11-09" },
] as const;

export function GET() {
  const urls = PRIORITY_PAGES.map(
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
