import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Device intent: "download tiktok video iphone". The differentiator from the
 * home page is the iOS save path (Files, then Photos) and the watermark-free
 * source, which is exactly what someone searching this phrase is unsure about.
 */
export const entry: SubTool = {
  slug: "tiktok-video-download-iphone",
  platform: "tiktok",
  title: "Download TikTok Video on iPhone - HD, No Watermark",
  socialTitle: "Download a TikTok Video on iPhone - Clean MP4, No Watermark, No App",
  description:
    "Save a TikTok video on iPhone without the watermark: paste the link in Safari, download the MP4, then add it to Photos. No app, no Shortcut, no sign-in.",
  keywords: [
    "download tiktok video iphone",
    "tiktok downloader iphone",
    "save tiktok to camera roll",
    "tiktok video to photos",
    "tiktok no watermark iphone",
    "tiktok mp4 iphone",
  ],
  eyebrow: "TikTok on iPhone - watermark-free, no app",
  h1Lead: "TikTok on iPhone.",
  h1Accent: "HD MP4, watermark-free.",
  lede:
    "TikTok's share sheet hands out a stamped copy; Safari can still save the clean one. Paste the link here, download the source MP4, and the file lands in Files ready for the two-tap move into Photos.",
  chips: ["No watermark", "Safari on iOS", "MP4 + MP3"],
  facts: [
    ["Best quality", "1080p where offered"],
    ["Lands in", "Files → Downloads"],
    ["Audio option", "MP3 / M4A"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the link in TikTok, paste it in Safari",
      body:
        "In TikTok tap Share, then Copy link — a full tiktok.com/@user/video/ID URL or a vt.tiktok.com short link both work. Paste it into the field above in Safari and choose Download HD MP4. Avoid using TikTok's own Save video button: that is the copy with the bouncing username stamped on it.",
    },
    {
      title: "Move the file from Files into Photos",
      body:
        "Safari writes the MP4 to On My iPhone → Downloads. Open Files, long-press the video, tap Share, then Save Video. It now plays from the Photos gallery and can be sent, trimmed or edited like any camera-roll clip. Need just the sound? The MP3 button saves audio to Files instead.",
    },
  ],
  faqs: [
    {
      question: "Where does the TikTok video go on iPhone?",
      answer:
        "Into Files → On My iPhone → Downloads, because Safari cannot write directly to the camera roll. From there, Share → Save Video copies it into Photos in two taps.",
    },
    {
      question: "Will it have the TikTok watermark?",
      answer:
        "No. The tool requests the source stream TikTok's player uses, not the stamped copy the share menu produces. Nothing is cropped or blurred out — the watermark was simply never in the file.",
    },
    {
      question: "Do I need an app or a Shortcut?",
      answer:
        "No. Everything happens in Safari. There is no profile to trust, no shortcut to install, and no app that needs broad photo-library permissions.",
    },
    {
      question: "Can I save just the sound as MP3?",
      answer:
        "Yes. The MP3 button extracts the post's audio track and saves it to Files. On iPhone, audio files stay in Files because Photos does not index music.",
    },
    {
      question: "Why did the download fail on a private or deleted video?",
      answer:
        "Private, friends-only and deleted posts expose no public stream. The page detects that case and says so instead of handing you an empty file.",
    },
  ],
  appName: "LAMP TIK TikTok Downloader for iPhone",
  features: [
    "Watermark-free HD MP4 from the source stream",
    "MP3 audio extraction in the same page",
    "Accepts full and vt.tiktok.com short links",
    "Saves through Safari with no app or Shortcut",
    "Free, unlimited, no account",
  ],
  related: ["tiktok-mp3-downloader", "vt-tiktok-com-downloader", "tiktok-story-downloader"],
  guides: [
    { slug: "download-tiktok-without-logo-iphone-android", anchor: "TikTok without the logo on iPhone and Android" },
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "browser-vs-app-tiktok-downloaders-safety", anchor: "Browser downloaders vs APK apps" },
  ],
};
