import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Vertical Shorts intent: short-form reposts, /shorts/ link shapes, and the
 * 1080x1920 frame people actually need for Reels and TikTok re-uploads.
 */
export const entry: SubTool = {
  slug: "youtube-shorts-downloader",
  platform: "youtube",
  title: "YouTube Shorts Downloader - Save the MP4 You Get",
  socialTitle: "YouTube Shorts Downloader - Measured 640×360, Not 1080p",
  description:
    "Download a YouTube Short as MP4, no watermark: paste a /shorts/ or youtu.be link. The file measured 640×360 on 2026-11-13 — no 1080p label here.",
  keywords: [
    "YouTube Shorts downloader",
    "YouTube Shorts download free",
    "download YouTube Shorts 1080p",
    "YouTube Shorts download high quality",
    "YouTube Shorts download with music",
    "YouTube Shorts to MP4",
    "save Shorts video online",
    "Shorts downloader no watermark",
    "yt shorts download",
  ],
  eyebrow: "YouTube Shorts - vertical, no watermark",
  h1Lead: "YouTube Shorts.",
  h1Accent: "The frame that actually arrives.",
  lede:
    "Shorts live at a different URL shape than normal uploads, so most downloaders either miss them or hand back a squeezed copy. This tool reads the Shorts ID and saves the muxed MP4 YouTube serves — 640×360 when measured on 2026-11-13, which is what the panel shows rather than a 1080×1920 label.",
  chips: ["640×360 measured", "No watermark added", "Shorts and youtu.be links"],
  facts: [
    ["Delivered frame", "640×360 (measured 2026-11-13)"],
    ["Format", "MP4 H.264"],
    ["Audio", "AAC, muxed"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the Shorts link, not the channel link",
      body:
        "In the YouTube app open the Short, tap Share, then Copy link. The URL looks like youtube.com/shorts/VIDEO_ID or youtu.be/VIDEO_ID. Both are parsed the same way here; a channel or hashtag URL resolves to nothing because there is no single video behind it.",
    },
    {
      title: "Save the one file it returns",
      body:
        "There is no quality picker: the resolver returns YouTube's muxed progressive MP4, the stream that already carries its own audio, and the panel labels it with the height it really has. In the 2026-11-13 measurement that was 640×360 for a 4K source, so no frame is padded up to 1080×1920 to match a promise."
    },
  ],
  faqs: [
    {
      question: "Why is my downloaded Short 640×360 and not 1080×1920?",
      answer:
        "Because YouTube publishes 1080p as a separate video-only track, and this site does not merge or transcode. The file you get is the muxed MP4 the resolver returns — 640×360 in our 2026-11-13 measurement — with its own audio inside and no padding added.",
    },
    {
      question: "Do I need an app for YouTube Shorts?",
      answer:
        "No. Paste the link in this page and download immediately in any browser on Android, iPhone, Windows or Mac — there is nothing to install.",
    },
    {
      question: "Can I download someone else's Short?",
      answer:
        "You can resolve any public Short, but the file is still someone else's work. Keep it for personal use such as offline viewing or a credited reaction, and get permission before reposting it commercially.",
    },
    {
      question: "Is there a watermark on the saved Short?",
      answer:
        "No watermark is added by this tool. The file comes from YouTube's own rendition, so it carries exactly what the uploader published - nothing stamped on by us.",
    },
    {
      question: "What if the Short is longer than 60 seconds?",
      answer:
        "YouTube now allows Shorts up to three minutes, and the resolver handles the full length. Long Shorts stream in chunks with resume support, so a slow connection does not restart the file.",
    },
  ],
  appName: "LAMP TIK YouTube Shorts Downloader",
  features: [
    "Saves the Short as YouTube's muxed MP4 — 640×360 in the 2026-11-13 test",
    "Accepts /shorts/, watch and youtu.be link shapes",
    "No watermark added and no 1080×1920 label on a smaller file",
    "Shorts up to three minutes long",
    "Free with no account or sign-up",
  ],
  related: ["youtube-shorts-to-mp3", "youtube-to-mp4-1080p", "youtube-video-download-iphone"],
};
