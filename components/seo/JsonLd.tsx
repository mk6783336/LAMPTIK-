import { siteConfig, siteUrl } from "@/lib/site";
import type { ToolFaq, ToolId, ToolStep } from "@/lib/content/tool-seo";

/**
 * Structured data. One `<script type="application/ld+json">` per page,
 * rendered as an `@graph` so entities can reference each other by `@id`
 * (Google resolves those references, and it avoids duplicate top-level
 * objects fighting over the same URL).
 *
 * Every value here is generated from the same data the page renders, which
 * is what keeps us inside Google's structured-data policy: no FAQ entry,
 * step, or breadcrumb that a visitor cannot also see on the page.
 */

type Json = Record<string, unknown>;

/** Escape `<` so a content string can never terminate the script tag. */
export function JsonLd({ data }: { data: Json }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export const ORG_ID = `${siteUrl}/#organization`;
export const SITE_ID = `${siteUrl}/#website`;

export function organizationNode(): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.name,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/icon.svg`,
      width: 512,
      height: 512,
    },
  };
}

export function websiteNode(): Json {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: siteUrl,
    name: siteConfig.name,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

export function webApplicationNode(args: {
  id: string;
  name: string;
  url: string;
  description: string;
  features: string[];
}): Json {
  return {
    "@type": "WebApplication",
    "@id": args.id,
    name: args.name,
    url: args.url,
    description: args.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    inLanguage: "en",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: args.features,
    publisher: { "@id": ORG_ID },
  };
}

export function faqPageNode(id: string, faqs: ToolFaq[], url: string): Json {
  return {
    "@type": "FAQPage",
    "@id": id,
    url,
    inLanguage: "en",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function howToNode(args: {
  id: string;
  name: string;
  description: string;
  steps: readonly ToolStep[];
  url: string;
  anchor: string;
}): Json {
  return {
    "@type": "HowTo",
    "@id": args.id,
    name: args.name,
    description: args.description,
    totalTime: "PT30S",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "0",
    },
    supply: [{ "@type": "HowToSupply", name: "A public video link" }],
    tool: [{ "@type": "HowToTool", name: siteConfig.name, url: siteUrl }],
    step: args.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
      url: `${args.url}#${args.anchor}`,
    })),
  };
}

export function breadcrumbNode(id: string, trail: Array<{ name: string; url?: string }>): Json {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.url ? { item: crumb.url } : {}),
    })),
  };
}

/** Canonical URL for a tool route — used by schema and metadata alike. */
export function toolUrl(platform: ToolId): string {
  return platform === "tiktok"
    ? siteUrl
    : `${siteUrl}/${platform === "instagram" ? "instagram-reels-downloader" : "facebook-video-downloader"}`;
}
