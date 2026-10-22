import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Vertical Shorts intent: short-form reposts, /shorts/ link shapes, and the
 * 1080x1920 frame people actually need for Reels and TikTok re-uploads.
 */
export const entry: SubTool = {
  slug: "youtube-shorts-downloader",
  platform: "youtube",
  title: "YouTube Shorts Downloader 1080p - Save Shorts as MP4",
  socialTitle: "YouTube Shorts Downloader - Save Any Short in 1080p Vertical MP4",
  description:
    "Download YouTube Shorts in full 1080x1920 MP4 with no watermark. Paste a /shorts/ link or a youtu.be share link and save the vertical video in one tap, free.",
  keywords: [
    "YouTube Shorts downloader",
    "download YouTube Shorts 1080p",
    "YouTube Shorts to MP4",
    "save Shorts video online",
    "Shorts downloader no watermark",
    "yt shorts download",
  ],
  eyebrow: "YouTube Shorts - vertical, no watermark",
  h1Lead: "YouTube Shorts.",
  h1Accent: "Full-frame 1080x1920.",
  lede:
    "Shorts live at a different URL shape than normal uploads, which is why most downloaders hand back a squeezed or cropped file. This tool reads the Shorts ID, picks the tallest rendition YouTube published, and saves the vertical frame exactly as it was uploaded.",
  chips: ["1080x1920 vertical", "No watermark added", "Shorts, watch and youtu.be links"],
  facts: [
    ["Best frame", "1080x1920"],
    ["Format", "MP4 H.264"],
    ["Length", "Up to 3 minutes"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the Shorts link, not the channel link",
      body:
        "In the YouTube app open the Short, tap Share, then Copy link. The URL looks like youtube.com/shorts/VIDEO_ID or youtu.be/VIDEO_ID. Both are parsed the same way here; a channel or hashtag URL resolves to nothing because there is no single video behind it.",
    },
    {
      title: "Save the tallest published rendition",
      body:
        "The resolver asks for the video's available streams and keeps the vertical one closest to 1080x1920 instead of the first MP4 in the list, which is where crop bars and soft 480p copies come from. The file then streams to your device under the Short's own title.",
    },
  ],
  faqs: [
    {
      question: "Why does my downloaded Short have black bars or a cropped face?",
      answer:
        "That happens when a downloader grabs a landscape rendition of a vertical upload and pads or crops it to fit. Shorts are stored as 1080x1920 vertical video, and this page keeps that frame, so a face centred in the Short stays centred in the saved MP4.",
    },
    {
      question: "Do I need the Android app for YouTube Shorts?",
      answer:
        "No. Paste the link in this page and download immediately in any browser on Android, iPhone, Windows or Mac. The optional Android app only adds a share-sheet shortcut and background saving to your gallery.",
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
    "Download YouTube Shorts in 1080x1920 vertical MP4",
    "Accepts /shorts/, watch and youtu.be link shapes",
    "No watermark, no crop, no re-encode",
    "Shorts up to three minutes long",
    "Free with no account or sign-up",
  ],
  related: ["youtube-to-mp3", "tiktok-story-downloader", "facebook-reels-downloader"],
};
