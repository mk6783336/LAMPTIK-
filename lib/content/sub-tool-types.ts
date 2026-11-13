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

export interface SubToolNote {
  title: string;
  body: string;
}

export interface SubToolFaq {
  question: string;
  answer: string;
}

/**
 * A supporting guide, linked from the bottom of the tool page. Only the slug
 * and an optional anchor live here: title and summary are read from
 * `lib/content/guides.ts`, so a guide rename can never leave a stale card.
 */
export interface SubToolGuide {
  slug: string;
  /** Card headline. Defaults to the guide's own `metaTitle`/`title`. */
  anchor?: string;
}

/**
 * Which comparison / troubleshooting silo the page renders under the tool.
 * `audio` = bitrates and M4A vs MP3, `containers` = MP4 vs WebM, `story` =
 * photo slides against video slides. The block itself lives in
 * `components/seo/DownloaderGuides.tsx`; only pages whose query asks the
 * question carry it, so three sibling URLs never show the same matrix.
 */
export type SubToolGuideVariant = "audio" | "containers" | "story";

export interface SubTool {
  /** Route segment without a leading slash. */
  slug: string;
  /** Which resolver/downloader engine the page mounts. */
  platform: SubToolPlatform;
  /**
   * Tool surface the page mounts. Defaults to the platform's video
   * downloader; `photo` and `playlist` replace it with the specialised panel
   * because neither input shape is a playable video stream.
   */
  toolKind?: "photo" | "playlist";
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
  /**
   * Instant answer for the query this page targets — rendered in a bordered
   * block directly under the H1, phrased as the question people actually type.
   * It is the snippet candidate: two sentences that answer without a scroll.
   */
  quickAnswer?: {
    query: string;
    answer: string;
  };
  /**
   * Mechanism-by-mechanism comparison against a typical online downloader.
   * Rendered as stacked cards, never a wide table: at 390px a three-column
   * table is guaranteed horizontal overflow.
   */
  comparison?: Array<{
    label: string;
    ours: string;
    theirs: string;
  }>;
  chips: [string, string, string];
  /** Four `[term, value]` pairs for the spec grid. */
  facts: [string, string][];
  /** Two how-it-works steps (unique mechanics per tool). */
  steps: [SubToolStep, SubToolStep];
  /**
   * Background the page would otherwise bury in a FAQ: the rules that apply,
   * the failure that is local to one market. Rendered under its own heading
   * between the steps and the FAQ. Used by the country pages, where the legal
   * and licensing context is the reason the page exists.
   */
  notes?: SubToolNote[];
  /**
   * Overrides the cross-link heading ("Also save from <platform>"). Only the
   * country cluster sets it, because its siblings are other countries rather
   * than more tools on the same platform — and a card grid that says "also
   * save from TikTok" above three country names is simply wrong.
   */
  relatedHeading?: string;
  /** At least four Q&A pairs, all rendered on the page. */
  faqs: SubToolFaq[];
  /** schema.org WebApplication name. */
  appName: string;
  /** schema.org featureList entries. */
  features: string[];
  /** Other sub-tool slugs to cross-link, in reading order. */
  related: string[];
  /** Opt-in format matrix + troubleshooting block (see DownloaderGuides). */
  formatGuide?: SubToolGuideVariant;
  /** Supporting guides for this query, in reading order. */
  guides?: SubToolGuide[];
}
