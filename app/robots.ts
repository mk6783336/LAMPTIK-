import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * Robots policy.
 *
 * Every crawler we want reachable is named explicitly. The marketing pages
 * are the product, so AI answer engines are welcome — being cited is the
 * point. Only `/api/*` is closed, because those endpoints are stateful,
 * rate-limited, and would answer a crawler with an error anyway.
 */
const ALLOWED_CRAWLERS = [
  // Search
  "*",
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "DuckDuckBot",
  "Yandex",
  "Applebot",
  // AI answer engines / training
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: ALLOWED_CRAWLERS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: ["/api/"],
    })),
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
