import type { ToolFaq } from "@/lib/content/tool-seo";

/**
 * The four creator micro-tools.
 *
 * These are deliberately *not* downloader pages. Every head term in this
 * category ("tiktok downloader", "instagram reels downloader") is held by a
 * DR 80+ site, and a three-week-old domain cannot outrank that on a KD 80
 * query. These four answer questions the download giants do not: what TikTok
 * pays, where a caption may safely sit in a 9:16 frame, what the cover image
 * is, and what the caption actually says. Three of them need no upload at all,
 * and all four end with a download so the visit is not a dead end.
 *
 * `CREATOR_TOOLS` is the single source for the routes, the sitemap entries,
 * /tools, the footer, `llms.txt` and the schema — a tool that exists without an
 * entry here would be an orphan page.
 */
export interface CreatorTool {
  slug: string;
  /** Schema `name` and the label used in cross-links. */
  name: string;
  title: string;
  description: string;
  /** Hero heading, split so the accent line can be gradient-filled. */
  h1Lead: string;
  h1Accent: string;
  eyebrow: string;
  lede: string;
  /** What the tool does, for SoftwareApplication.featureList. */
  features: string[];
  /** Four facts rendered under the tool (term → value). */
  facts: ReadonlyArray<readonly [string, string]>;
  /** Three steps: how to use it. */
  steps: ReadonlyArray<{ title: string; body: string }>;
  faqs: readonly ToolFaq[];
  /** Content revision date, not the build date. */
  updatedAt: string;
  /** Other creator tools linked at the bottom. */
  related: readonly string[];
}

export const CREATOR_TOOLS: readonly CreatorTool[] = [
  {
    slug: "tiktok-money-calculator",
    name: "TikTok Money & Creator Rewards Calculator",
    title: "TikTok Money Calculator 2026 — Creator RPM by Country",
    description:
      "Estimate what TikTok pays per 1,000 qualified views: Creator Rewards RPM by country and niche, brand deal rates, and the views behind $1,000 a month.",
    h1Lead: "What TikTok pays,",
    h1Accent: "per thousand views.",
    eyebrow: "Creator Rewards · 2026 rates",
    lede:
      "The Creator Rewards Program pays on qualified views — not on every play — and the rate swings by country and niche. Enter your numbers to see the realistic monthly range, the brand-deal value of the same audience, and how many views $1,000 a month needs.",
    features: [
      "Creator Rewards RPM estimate by country and niche",
      "Brand sponsorship rate estimate for the same view count",
      "Reverse calculator: views needed for a monthly income target",
      "No login, no account, nothing sent to a server",
    ],
    facts: [
      ["Program", "Creator Rewards (2026)"],
      ["Payout basis", "Qualified views only"],
      ["Typical RPM", "$0.20 – $1.80 / 1k"],
      ["Data", "Public creator reports"],
    ],
    steps: [
      {
        title: "Enter the views on one video",
        body: "Use a single video's play count, not the account total. Creator Rewards is paid per video, and a 3-second skip is not a qualified view.",
      },
      {
        title: "Pick the audience country and niche",
        body: "RPM is set by where the viewers are, not where you are. A US finance audience can pay five times what a global entertainment audience does for the same plays.",
      },
      {
        title: "Read the range, not a single number",
        body: "The result is a low-to-high band because TikTok does not publish a fixed RPM. Treat the low end as the conservative case and the high end as a good month.",
      },
    ],
    faqs: [
      {
        question: "How much does TikTok pay per 1,000 views in 2026?",
        answer:
          "Creator Rewards pays somewhere between $0.20 and $1.80 per 1,000 qualified views depending on the audience country and the niche. A United States finance audience sits at the top of that range; a global entertainment audience sits near the bottom. Views that scroll past in under a few seconds, or come from ineligible regions, are not paid at all.",
      },
      {
        question: "What is a qualified view in the Creator Rewards Program?",
        answer:
          "A qualified view is a play that meets TikTok's minimum watch-time and eligibility rules — roughly a full watch of a short video, from an eligible country, on a video over one minute long. It is always lower than the public play count, which is why this calculator asks for an engagement rate and discounts the raw views before applying an RPM.",
      },
      {
        question: "Do brand deals pay more than Creator Rewards?",
        answer:
          "Usually yes, by a wide margin. A sponsored post is priced on reach and audience quality rather than on a platform-set RPM, so the same 100,000 views can be worth a few dollars in Creator Rewards and several hundred in a brand deal. The calculator shows both numbers side by side so the gap is visible.",
      },
      {
        question: "Why does the calculator show a range instead of one figure?",
        answer:
          "Because TikTok does not publish a rate card. The range comes from creator-reported earnings across countries and niches, and the true number for any single video depends on watch time, audience location, and the month's pool. A single precise number would be invented.",
      },
      {
        // LOW-KD GAP: "how is tiktok money calculator", "how do you calculate
        // money on a calculator" — the SERP answers "what is RPM", not the
        // arithmetic, so this states the arithmetic.
        question: "How does a TikTok money calculator get from views to dollars?",
        answer:
          "By multiplying, never by looking anything up: (views ÷ 1000) × the RPM you supply for your country and niche, then the engagement and qualification discounts. Creator Rewards pays on qualified views over one second, so 100,000 raw views are not 100,000 paid views — a step most earnings estimates skip. That is also why two calculators disagree about the same video: one is quoting a US average, the other your own inputs.",
      },
      {
        question: "How many views do I need to make $1,000 a month?",
        answer:
          "At a $1.00 RPM and a 60% qualification rate you need roughly 1.7 million qualified views a month. The reverse calculator on this page does that arithmetic for your own country and niche, including the engagement discount.",
      },
    ],
    updatedAt: "2026-11-07",
    related: [
      "tiktok-safe-zone-checker",
      "tiktok-caption-hashtag-extractor",
      "video-thumbnail-downloader",
    ],
  },
  {
    slug: "tiktok-safe-zone-checker",
    name: "9:16 Safe Zone Checker for TikTok, Reels & Shorts",
    title: "TikTok, Reels & Shorts Safe Zone Checker — 1080×1920 Overlay",
    description:
      "See exactly where TikTok, Reels and Shorts hide your text: a pixel-accurate 9:16 overlay for captions, the right-side action rail and the top bar.",
    h1Lead: "Where the interface",
    h1Accent: "eats your caption.",
    eyebrow: "9:16 · 1080 × 1920",
    lede:
      "TikTok, Reels and Shorts each cover a different part of a vertical frame with buttons, captions and search bars. Load a frame, switch the platform overlay, and place your text where the app cannot hide it.",
    features: [
      "Pixel-accurate 9:16 overlays for three platforms",
      "Local image preview — the file never leaves the browser",
      "Toggle each danger zone independently",
      "Exact 1080×1920 coordinates for editors",
    ],
    facts: [
      ["Frame", "1080 × 1920 (9:16)"],
      ["Platforms", "TikTok · Reels · Shorts"],
      ["Upload", "Stays in the browser"],
      ["Cost", "Free, no account"],
    ],
    steps: [
      {
        title: "Load a frame from your edit",
        body: "Export a still from the timeline, or paste a direct image URL. The image is drawn locally — nothing is uploaded, so an unreleased client video stays private.",
      },
      {
        title: "Switch between TikTok, Reels and Shorts",
        body: "The interface chrome is not the same on the three apps. TikTok reserves a taller right rail; Shorts reserves more at the bottom for the title and channel row.",
      },
      {
        title: "Keep text out of the red bands",
        body: "Anything under a red band is covered on a real phone. Move the caption up, or shorten it until it clears the bottom band at the pixel values printed on each zone.",
      },
    ],
    faqs: [
      {
        // LOW-KD GAP: "capcut tiktok safe zone", "tiktok safe zone template",
        // "tiktok safe zone png". Editors search for the template before they
        // know what the numbers are, so the answer gives them the numbers.
        question: "Can I check the TikTok safe zone in CapCut before exporting?",
        answer:
          "Yes, and it is the cheapest place to catch a caption that will be covered. CapCut's 9:16 canvas is 1080×1920 — the same frame this checker measures — so export a still at the frame you care about and drop it here with the TikTok overlay on. Keep the text inside the central 1080×1420 and it clears both the right-hand action rail and the bottom caption block. The overlay coordinates are printed in pixels, which is what you need to build a reusable CapCut template or a PNG guide layer for Premiere and Resolve.",
      },
      {
        question: "What is a safe zone in a 9:16 video?",
        answer:
          "The safe zone is the part of a 1080×1920 frame that the app's own interface never covers. Everything outside it can be hidden by the right-side action buttons, the bottom caption and music row, or the top search bar, so text and logos belong inside the middle area.",
      },
      {
        question: "Is the TikTok safe zone the same as Reels and Shorts?",
        answer:
          "No. TikTok reserves the widest right-hand rail; Instagram Reels keeps a similar rail but a taller bottom caption block; YouTube Shorts uses a shorter right rail and a bottom band that includes the channel row. A frame laid out for one app can lose text on another, which is why this checker draws each overlay separately.",
      },
      {
        question: "Does the checker upload my video?",
        answer:
          "No. The file is read with the browser's own file API and drawn as an image element in the page. There is no upload request, no server copy and no storage — closing the tab discards it.",
      },
      {
        question: "What pixel sizes do the overlays use?",
        answer:
          "Every band is defined in percentages of a 1080×1920 frame and printed in pixels, so the same numbers work in Premiere, CapCut, DaVinci Resolve or After Effects. The right rail is about 216px wide on TikTok, the bottom caption band about 346px tall.",
      },
    ],
    updatedAt: "2026-11-07",
    related: [
      "tiktok-money-calculator",
      "tiktok-caption-hashtag-extractor",
      "video-thumbnail-downloader",
    ],
  },
  {
    slug: "video-thumbnail-downloader",
    name: "HD Video Thumbnail & Cover Downloader",
    title: "Video Thumbnail Downloader — TikTok, Reels, YouTube, X",
    description:
      "Paste a TikTok, Instagram, YouTube or X link and save its cover image at the highest resolution the platform serves — plus the video, watermark-free.",
    h1Lead: "The cover image,",
    h1Accent: "at full resolution.",
    eyebrow: "TikTok · Reels · YouTube · X",
    lede:
      "A thumbnail is a separate image on every platform, and the one in the share preview is usually a downscaled copy. Paste a link and this page returns the largest cover it can find, ready to save as a poster or a reference frame.",
    features: [
      "Highest-resolution cover for five platforms",
      "One-click image download",
      "Watermark-free video and audio links on the same card",
      "Works with share-sheet short links",
    ],
    facts: [
      ["Platforms", "TikTok · IG · FB · YT · X"],
      ["Output", "JPG / WebP cover"],
      ["Max size", "Platform maximum"],
      ["Account", "Not required"],
    ],
    steps: [
      {
        title: "Paste the post link",
        body: "Any shape works: a full tiktok.com URL, a vt.tiktok.com short link, an /reel/ link, a youtu.be link or an x.com status URL.",
      },
      {
        title: "Wait for the cover to resolve",
        body: "The server reads the post's own metadata and returns the largest image it publishes. No screenshot and no upscaling is involved.",
      },
      {
        title: "Download the image or the video",
        body: "The image saves as a normal download. The same card also offers the video and its audio, so one paste covers both jobs.",
      },
    ],
    faqs: [
      {
        // LOW-KD GAP: "youtube thumbnail downloader online / 4k / hd". YouTube
        // tops out at 1280×720 for covers, so the honest answer is a ceiling,
        // not a promise of 4K.
        question: "Is this a YouTube thumbnail downloader that returns 4K, or only HD?",
        answer:
          "It returns the largest file YouTube actually publishes: maxresdefault (1280×720) when that rendition exists, then sddefault, then hqdefault. YouTube does not expose a 4K cover as a separate asset, so a page selling a \"4K thumbnail downloader\" is either upscaling a 1280-wide JPEG or screenshotting the player. The card here names the rendition you received — SD 640×480 included — instead of calling an upscale 4K.",
      },
      {
        question: "Is the downloaded thumbnail the original quality?",
        answer:
          "It is the largest copy the platform publishes for that post, which is usually 1080 pixels wide on TikTok and up to 1280 on YouTube. If the platform only exposes a smaller preview, that is the ceiling — this tool never upscales an image and calls it HD.",
      },
      {
        question: "Can I use a creator's thumbnail in my own video?",
        answer:
          "Only with permission or under a licence that allows it. The image belongs to the creator and the platform's terms still apply. Downloading your own cover, or a frame for commentary and review, is the normal use.",
      },
      {
        question: "Why does a YouTube link return a different size than TikTok?",
        answer:
          "Each platform stores covers differently. YouTube exposes several fixed renditions (maxresdefault, sddefault, hqdefault) and the largest one is not always generated; TikTok returns the cover embedded in the post metadata.",
      },
      {
        question: "Does this work for private or deleted posts?",
        answer:
          "No. The resolver only reads public metadata, so a private, region-locked or deleted post returns an error instead of an image.",
      },
    ],
    updatedAt: "2026-11-07",
    related: [
      "tiktok-caption-hashtag-extractor",
      "tiktok-safe-zone-checker",
      "tiktok-money-calculator",
    ],
  },
  {
    slug: "tiktok-caption-hashtag-extractor",
    name: "TikTok & Reels Caption and Hashtag Extractor",
    title: "TikTok Caption & Hashtag Extractor — Copy Post Metadata",
    description:
      "Paste a TikTok, Reel or Short and get the full caption, author handle, every hashtag, the audio track and clean MP4/MP3 downloads — with one-click copy.",
    h1Lead: "The caption, the tags,",
    h1Accent: "and the audio track.",
    eyebrow: "Captions · Hashtags · Audio",
    lede:
      "Researching a niche means reading what already works. Paste a post and this page returns its caption, its hashtags as a clean list, the sound it used and a download of the video — without screenshots or copy-paste gymnastics.",
    features: [
      "Full caption and title text",
      "Every hashtag extracted and de-duplicated",
      "Author handle and audio track name",
      "Copy buttons for caption and hashtag list",
    ],
    facts: [
      ["Platforms", "TikTok · Reels · Shorts"],
      ["Output", "Captions + hashtags"],
      ["Copy", "One click"],
      ["Storage", "Nothing saved"],
    ],
    steps: [
      {
        title: "Paste the post link",
        body: "A full URL or a short share link both work — the short link is expanded on the server before the metadata is read.",
      },
      {
        title: "Read the caption and the tag list",
        body: "Hashtags are pulled out of the caption into a separate list, de-duplicated, and kept in the order they were written.",
      },
      {
        title: "Copy, or download the source",
        body: "Copy the whole caption, copy only the tags, or take the MP4 and MP3 to study the edit. Nothing is stored on the server.",
      },
    ],
    faqs: [
      {
        // LOW-KD GAP: "tiktok hashtag generator", "... tools", "... to go viral".
        // Generators invent tags; extracting the tags a real audience was served
        // is the defensible version of the same search intent.
        question: "Can this extractor work as a TikTok hashtag generator?",
        answer:
          "It is the research half of one, and the better half. Paste ten posts that over-performed in your niche and each card returns the caption with its hashtags split out, de-duplicated and in the order they were written, so the tags that repeat across winners stand out from the noise. A generator invents combinations nobody searched for; this gives you the tags a real audience was already served, and you still write the caption yourself.",
      },
      {
        question: "Can I copy a caption and reuse it on my own post?",
        answer:
          "You can copy the text, but reusing another creator's caption verbatim is a bad idea for reach and for originality rules. The usual workflow is to read ten captions in a niche, note the hooks and structures, and write your own.",
      },
      {
        question: "Does the extractor find hashtags hidden in the caption?",
        answer:
          "Yes. TikTok keeps hashtags inside the caption string rather than a separate field, so the tool parses the text, pulls every #token out, de-duplicates the list and shows the remaining caption without them stripped away.",
      },
      {
        question: "Why is the caption sometimes empty?",
        answer:
          "A post can genuinely have no caption, and some reposted or photo-mode posts return only a title. If the API returns an error instead, the post is private, deleted or region-locked.",
      },
      {
        question: "Does this show the audio track name?",
        answer:
          "Yes, when the platform exposes it — TikTok returns the sound's title, which is what you need to find the original track or credit the sound.",
      },
    ],
    updatedAt: "2026-11-07",
    related: [
      "video-thumbnail-downloader",
      "tiktok-safe-zone-checker",
      "tiktok-money-calculator",
    ],
  },
];

export const CREATOR_TOOL_MAP: Readonly<Record<string, CreatorTool>> = Object.fromEntries(
  CREATOR_TOOLS.map((tool) => [tool.slug, tool]),
);

export function getCreatorTool(slug: string): CreatorTool | undefined {
  return CREATOR_TOOL_MAP[slug];
}
