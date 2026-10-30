import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * iOS intent. Reels are the most re-compressed video Instagram serves, so the
 * page pairs the device save path with a quality answer: take Instagram's
 * published master instead of a screen recording of the player.
 */
export const entry: SubTool = {
  slug: "instagram-reels-download-iphone",
  platform: "instagram",
  title: "Download Instagram Reels on iPhone - Save to Photos",
  socialTitle: "Download Instagram Reels on iPhone - Original Quality, Into Photos",
  description:
    "Save an Instagram Reel on iPhone in original quality: copy the link, paste it in Safari, download the MP4, then add it to Photos. No app, no Instagram login.",
  keywords: [
    "download instagram reels iphone",
    "save reels to camera roll",
    "instagram reel downloader ios",
    "ig reels to photos",
    "download reels on iphone",
    "instagram video iphone",
  ],
  eyebrow: "Instagram Reels on iPhone - original MP4, no login",
  h1Lead: "Reels on iPhone.",
  h1Accent: "Into Photos, in original quality.",
  lede:
    "Saving a Reel on iOS is a two-stage move: Safari downloads the MP4, then Photos imports it. This page handles the first stage with Instagram's own highest-bitrate file — not a screen recording — and walks through the second.",
  chips: ["Original MP4", "Safari on iOS", "No login"],
  facts: [
    ["Best quality", "1080x1920"],
    ["Lands in", "Files → Downloads"],
    ["Audio", "Included, muxed"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the Reel and download it in Safari",
      body:
        "Tap the three dots on the Reel, choose Copy link, then open this page in Safari and paste it. Choose Download HD MP4. Safari writes the file to Files → On My iPhone → Downloads and shows a download arrow while it runs.",
    },
    {
      title: "Import it into Photos",
      body:
        "Open Files, long-press the MP4, tap Share, then Save Video. The Reel now lives in Recents in Photos with its original audio. If you only need the sound, download the MP3 from the same page and keep it in Files, where iOS stores audio.",
    },
  ],
  faqs: [
    {
      question: "Where do Reels download to on iPhone?",
      answer:
        "To Files → On My iPhone → Downloads. Safari does not have permission to write into the camera roll silently, so Share → Save Video is the standard second step for any browser download on iOS.",
    },
    {
      question: "Will the Reel have a watermark or Instagram logo?",
      answer:
        "No. Reels are served without an overlay; what you see on screen is interface, not part of the file. The MP4 is Instagram's published video, so there is nothing to crop or remove.",
    },
    {
      question: "Does the audio come with the video?",
      answer:
        "Yes. The progressive MP4 carries both picture and sound, so lip-sync and music survive. That is also why the file opens cleanly in Photos, iMovie and CapCut without an extra audio track.",
    },
    {
      question: "Do I need to log in to Instagram?",
      answer:
        "No. Public Reels resolve without a session. Private accounts cannot be downloaded, and no Instagram credentials are ever requested or stored.",
    },
    {
      question: "Can I download an Instagram Story the same way?",
      answer:
        "Yes, through the Instagram Story downloader. Stories use a different link shape and expire after 24 hours, so copy the link while the story is still live.",
    },
  ],
  appName: "LAMP TIK Instagram Reels Downloader for iPhone",
  features: [
    "Original-quality 1080x1920 MP4",
    "Audio track included, no merge needed",
    "Saves to Files, then Photos on iOS",
    "No login, app or Shortcut",
    "Free and unlimited",
  ],
  related: [
    "instagram-reels-download-without-login",
    "instagram-reels-audio",
    "instagram-story-downloader",
  ],
  guides: [
    { slug: "how-to-download-instagram-reels-in-hd", anchor: "Instagram Reels in full HD" },
    { slug: "repurpose-tiktok-videos-for-youtube-shorts-instagram-reels" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Is downloading videos legal?" },
  ],
};
