import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * /tiktok-story-downloader
 *
 * Search intent: "tiktok story downloader", "save tiktok story". Stories are a
 * different object from a post: they expire after 24 hours and the profile URL
 * is not a story URL. The copy therefore explains what a story link actually
 * is, and what happens once the 24-hour window has closed.
 */
export const entry: SubTool = {
  slug: "tiktok-story-downloader",
  platform: "tiktok",
  title: "TikTok Story Downloader - Save Stories Without Watermark",
  socialTitle: "TikTok Story Downloader - Save Photo and Video Stories Before They Expire",
  description:
    "Download TikTok stories before they vanish: save photo and video slides without a watermark in original quality. Paste the story link — no app, no account.",
  keywords: [
    "tiktok story downloader",
    "save tiktok story",
    "download tiktok story video",
    "tiktok story saver",
    "tiktok story without watermark",
    "tiktok story photo download",
  ],
  eyebrow: "TikTok Stories - free, no app required",
  h1Lead: "TikTok Stories.",
  h1Accent: "Saved before the 24 hours run out.",
  lede:
    "Stories disappear a day after they are posted and never appear on the profile grid. Paste a story link here and the slide - photo or video - saves clean, in the quality it was uploaded.",
  chips: ["Photo + video slides", "No watermark", "Original quality"],
  facts: [
    ["Lifetime", "24 hours after posting"],
    ["Slides", "Photo and video"],
    ["Watermark", "None"],
    ["Account", "Not required"],
  ],
  steps: [
    {
      title: "Copy the story link, not the profile link",
      body:
        "Long-press the story bubble or open Share on the story itself and copy the link. A story URL carries an item id; a profile URL (tiktok.com/@user) carries none, which is the single most common reason a story download fails. Pasting a profile link here returns a clear message instead of guessing which slide you meant.",
    },
    {
      title: "Pick the slide and save it",
      body:
        "The resolver expands the short link, reads the story item, and returns the media for that slide. Video slides download as MP4 with their own audio; photo slides download as the original image, with no playback UI or sticker overlay burned in.",
    },
  ],
  faqs: [
    {
      question: "How is a TikTok Story different from a normal TikTok video?",
      answer:
        "A Story is only visible for 24 hours, is not listed on the creator's profile grid, and is often a photo or a multi-slide sequence rather than one video. A normal post stays on the profile until the creator deletes it and always has a permanent post id - which is why the two need different links.",
    },
    {
      question: "Why does my profile link not work?",
      answer:
        "Because a profile can hold several stories at once and the URL does not identify which one. Copy the link from the story itself: it contains an item id, and that id is what the resolver needs to return exactly the slide you are looking at.",
    },
    {
      question: "Can I download a story after it has expired?",
      answer:
        "No, and any tool that claims otherwise is guessing. Once the 24-hour window closes the media is no longer served to anyone outside the creator's own archive view. Save it while it is live.",
    },
    {
      question: "Do I need to follow the account to save its story?",
      answer:
        "No. You need a link to a story that is still live and public. Private accounts and followers-only stories cannot be resolved, because the media is not served to anonymous requests at all.",
    },
    {
      question: "Do story downloads carry the TikTok watermark?",
      answer:
        "No. The watermark is stamped onto the share-sheet copy of a post, not onto the story media we request, so story slides arrive without a logo or username overlay.",
    },
  ],
  appName: "LAMP TIK TikTok Story Downloader",
  features: [
    "Save TikTok story videos and photos",
    "No watermark on story slides",
    "Original upload quality",
    "Works with story short links",
    "No account and no app required",
  ],
  related: ["tiktok-video-download-iphone", "tiktok-mp3-downloader", "vt-tiktok-com-downloader"],
};
