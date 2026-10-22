/**
 * Shared shape for the programmatic sub-tool pages.
 *
 * Each page is one high-intent query (e.g. "tiktok mp3 downloader") that
 * reuses the platform's resolver but needs its own title, headings, steps,
 * FAQ set and schema — Google treats sibling URLs with recycled copy as thin
 * content, so every entry below is written for its own search intent.
 *
 * Pure data: `SubToolPage` renders it, `app/sitemap.ts` lists it, and the
 * JSON-LD on the page is generated from the very same object (so a visible
 * FAQ can never drift from the structured data).
 */
export type SubToolPlatform = "tiktok" | "instagram" | "facebook" | "youtube";

export interface SubToolStep {
  title: string;
  body: string;
}

export interface SubToolFaq {
  question: string;
  answer: string;
}

export interface SubTool {
  /** Route segment without a leading slash. */
  slug: string;
  /** Which resolver/downloader engine the page mounts. */
  platform: SubToolPlatform;
  /** `<title>` — keyword first, ≤ 60 characters. */
  title: string;
  /** Social-card title, may be longer than `title`. */
  socialTitle: string;
  /** Meta description, ~155 characters, written per query. */
  description: string;
  keywords: string[];
  /** Small kicker above the H1. */
  eyebrow: string;
  /** First H1 line, plain text. */
  h1Lead: string;
  /** Second H1 line, rendered with the gradient. */
  h1Accent: string;
  /** Paragraph under the H1. */
  lede: string;
  chips: [string, string, string];
  /** Four `[term, value]` pairs for the spec grid. */
  facts: [string, string][];
  /** Two how-it-works steps (unique mechanics per tool). */
  steps: [SubToolStep, SubToolStep];
  /** At least four Q&A pairs, all rendered on the page. */
  faqs: SubToolFaq[];
  /** schema.org WebApplication name. */
  appName: string;
  /** schema.org featureList entries. */
  features: string[];
  /** Other sub-tool slugs to cross-link, in reading order. */
  related: string[];
}
