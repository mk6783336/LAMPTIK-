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
  // Added for Generative Engine Optimization: the assistants that actually
  // cite tool pages. Every one of them is named explicitly rather than left
  // to the wildcard, because a crawler that is only matched by `*` is the
  // first thing a future policy change breaks silently.
  "DeepSeekBot",
  "MistralAI-User",
  "cohere-ai",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: ALLOWED_CRAWLERS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: ["/api/"],
    })),
    // Two sitemaps, announced to every crawler that honours robots.txt.
    // `/sitemap.xml` is the full 88-URL inventory; `/sitemap-priority.xml`
    // holds only the two tool pages Google has never crawled, so a crawler that
    // reads it first spends its next fetch on them instead of on the 86 pages
    // that are already indexed. Both are also submitted through the Search
    // Console API, but the robots.txt entry is what Bing, Yandex, DuckDuckBot
    // and the AI crawlers above actually read.
    // Three files, three jobs: the full inventory, the two never-crawled tool
    // pages, and the English commercial core at priority 1.0. A crawler that
    // reads only the first still sees everything; one that reads all three
    // knows which six URLs to fetch first.
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/sitemap-priority.xml`,
      `${siteUrl}/sitemap-en-core.xml`,
    ],
    // No `Host:` directive. It is a Yandex-only hint, and naming the host in
    // robots.txt is one more place a crawler can read the apex domain as the
    // canonical site — Ahrefs already lists the bare-apex root as an internal
    // URL that 308s, because the project target there is the apex. The
    // canonical origin is declared where it matters: the `<link
    // rel="canonical">` tag and every absolute URL in the sitemap and schema.
  };
}
