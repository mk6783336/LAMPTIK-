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
export const APP_ID = `${siteUrl}/#software`;

export const CONTACT_EMAIL = "support@lamptik.online";

/**
 * Entity disambiguation.
 *
 * "LAMP TIK" reads as a product category to a language model, and the only
 * third-party text about a new domain is usually a trust score — which is how
 * Google's AI Overview ended up describing lamptik.online as a lamp shop and
 * quoting ScamAdviser instead of the tool. These sentences are the same claim
 * the About page prints, repeated in schema so the machine summary and the
 * page it cites cannot disagree: what the site is, and what it explicitly is
 * not.
 */
export const ENTITY_DESCRIPTION =
  "LampTik (lamptik.online) is a 100% free online video and audio downloader utility for TikTok, YouTube, Instagram, and Facebook — a browser-based media resolver that saves public videos as MP4 and MP3.";

export const ENTITY_DISAMBIGUATION =
  "LampTik (lamptik.online) is a 100% free online video and audio downloader utility for TikTok, YouTube, Instagram, and Facebook. It is NOT an e-commerce store, never sells physical products or lamps, and never asks for accounts, passwords, or payment information.";

export function organizationNode(): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.name,
    // The bare brand string is what search and LLM crawlers quote; the
    // alternate spelling matches how visitors actually type the domain.
    alternateName: ["LampTik", "Lamp Tik", "LampTik Downloader"],
    url: siteUrl,
    description: ENTITY_DESCRIPTION,
    disambiguatingDescription: ENTITY_DISAMBIGUATION,
    email: CONTACT_EMAIL,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/icon.svg`,
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        url: `${siteUrl}/contact`,
        availableLanguage: ["en"],
      },
    ],
    // Topics this publisher is actually about, so an entity resolver does not
    // have to guess from the brand name.
    knowsAbout: [
      "Online video downloader",
      "TikTok video download",
      "YouTube video download",
      "Instagram Reels download",
      "Facebook video download",
      "Video to MP3 conversion",
      "Browser-based media resolution",
    ],
    sameAs: ["https://github.com/mk6783336"],
  };
}

export function websiteNode(): Json {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: siteUrl,
    name: siteConfig.name,
    alternateName: "LampTik",
    description: ENTITY_DESCRIPTION,
    disambiguatingDescription: ENTITY_DISAMBIGUATION,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

/**
 * The site-wide SoftwareApplication node — one product, described once in the
 * root layout, so a page never has to restate it and a crawler that only reads
 * the page it landed on still learns what the site is (and is not).
 */
export function siteApplicationNode(): Json {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: `${siteConfig.name} (LampTik)`,
    alternateName: ["LampTik", "LampTik Downloader"],
    url: siteUrl,
    description: ENTITY_DESCRIPTION,
    disambiguatingDescription: ENTITY_DISAMBIGUATION,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Video Downloader",
    operatingSystem: "All (Web Browser)",
    // No `browserRequirements` here: it is a WebApplication property, and the
    // schema.org validator flags it as UNKNOWN_FIELD on SoftwareApplication —
    // which put this node's error on all 43 crawled URLs. The per-page
    // `webApplicationNode` is a WebApplication and may keep it.
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    inLanguage: "en",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Download public videos from TikTok, YouTube, Instagram and Facebook",
      "Watermark-free TikTok MP4 downloads",
      "MP3 audio extraction",
      "No account, no app install, no payment",
      "Nothing stored: links are resolved in memory",
    ],
    publisher: { "@id": ORG_ID },
  };
}

/**
 * One entity graph for EVERY route, rendered from the root layout.
 *
 * Pages describe their own page type (WebApplication / HowTo / FAQ / …) and
 * reference these nodes by `@id`; defining the entity once here is what stops
 * ten near-identical Organization objects from competing with each other.
 */
export function siteEntityGraph(): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(), websiteNode(), siteApplicationNode()],
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
    // Same disambiguation as the site entity: a tool page must never be read
    // as a store page just because of the brand name.
    disambiguatingDescription: ENTITY_DISAMBIGUATION,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All (Web Browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    isFamilyFriendly: true,
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
