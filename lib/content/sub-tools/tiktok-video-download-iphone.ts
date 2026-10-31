import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Device intent, written for the question people actually type — "how do I
 * download a TikTok video on my iPhone" — rather than for the bare keyword.
 *
 * Two facts decide this page: iOS will not let Safari write into the camera
 * roll, and TikTok's own Save button stamps the username onto the file. Both
 * are answered in the first sentence and again as their own FAQ, because they
 * are the two things a visitor arrives already stuck on.
 */
export const entry: SubTool = {
  slug: "tiktok-video-download-iphone",
  platform: "tiktok",
  title: "How to Download a TikTok Video on iPhone - No Watermark",
  socialTitle: "How to Download a TikTok Video on iPhone - Clean MP4, Straight to Photos",
  description:
    "Save a TikTok video on iPhone without the watermark: copy the link, paste it in Safari, tap Download, then Save Video from Files into Photos. No app, no Shortcut, no login.",
  keywords: [
    "how to download tiktok video on iphone",
    "download tiktok video iphone",
    "tiktok downloader iphone",
    "save tiktok to camera roll",
    "tiktok video to photos",
    "tiktok no watermark iphone",
    "download tiktok video on iphone without app",
    "why can't i save tiktok videos on my iphone",
  ],
  eyebrow: "TikTok on iPhone — watermark-free, nothing to install",
  h1Lead: "How to save a TikTok",
  h1Accent: "to your iPhone.",
  lede:
    "Copy the link in TikTok, paste it into Safari on this page, and tap Download HD MP4. The file lands in Files → Downloads, because iOS does not let a browser write to the camera roll directly; Share → Save Video moves it into Photos in two taps. TikTok's own Save button is not part of this: that copy has your username stamped on it.",
  chips: ["Safari on iOS", "No watermark", "MP4 + MP3"],
  facts: [
    ["Best quality", "1080p where offered"],
    ["Lands in", "Files → Downloads"],
    ["To Photos", "Share → Save Video"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the link in TikTok, paste it in Safari",
      body:
        "In TikTok tap Share, then Copy link — a full tiktok.com/@user/video/ID URL or a vt.tiktok.com short link both work. Paste it into the field above in Safari and choose Download HD MP4. Avoid TikTok's own Save video button: that is the copy with the bouncing username stamped on it, and no amount of cropping gets it clean again.",
    },
    {
      title: "Move the file from Files into Photos",
      body:
        "Safari writes the MP4 to On My iPhone → Downloads, and shows a download arrow while it runs. Open Files, long-press the video, tap Share, then Save Video. It now plays from the Photos gallery and can be sent, trimmed or edited like any camera-roll clip. Need just the sound? The MP3 button saves the audio track to Files instead.",
    },
  ],
  faqs: [
    {
      question: "How do I download a TikTok video on my iPhone?",
      answer:
        "Open the video in TikTok, tap Share → Copy link, then paste that link into the field on this page in Safari and tap Download HD MP4. The MP4 saves to Files → Downloads; long-press it there and choose Share → Save Video to put it in Photos.",
    },
    {
      question: "Why is there no Save video option in TikTok?",
      answer:
        "TikTok removes the Save button on sounds the creator has restricted, on some sponsored posts, and on videos whose rights holder opted out. The link still resolves here because the public stream is served regardless — the missing button is a client-side restriction, not a missing file.",
    },
    {
      question: "Where does the TikTok video go on iPhone?",
      answer:
        "Into Files → On My iPhone → Downloads, because Safari cannot write directly to the camera roll. From there, Share → Save Video copies it into Photos in two taps. If you cannot find Files, search for it in the App Store — it is free and made by Apple.",
    },
    {
      question: "Will it have the TikTok watermark?",
      answer:
        "No. The tool requests the source stream TikTok's player uses, not the stamped copy the share menu produces. Nothing is cropped or blurred out — the watermark was simply never in the file.",
    },
    {
      question: "Do I need an app or a Shortcut?",
      answer:
        "No. Everything happens in Safari. There is no profile to trust, no shortcut to install, and no app that needs broad photo-library permissions — which is the main reason people go looking for one and regret it.",
    },
    {
      question: "Can I save just the sound as MP3?",
      answer:
        "Yes. The MP3 button extracts the post's audio track and saves it to Files. On iPhone, audio stays in Files because Photos does not index music — that is iOS behaviour, not a failed download.",
    },
    {
      question: "Why did the download fail on a private or deleted video?",
      answer:
        "Private, friends-only and deleted posts expose no public stream. The page detects that case and says so instead of handing you an empty file. If the video plays in TikTok but fails here, wait a minute and retry — TikTok rate-limits anonymous requests during traffic spikes.",
    },
  ],
  appName: "LAMP TIK TikTok Downloader for iPhone",
  features: [
    "Watermark-free HD MP4 from the source stream",
    "MP3 audio extraction in the same page",
    "Accepts full and vt.tiktok.com short links",
    "Saves through Safari with no app or Shortcut",
    "Works when TikTok has hidden the Save button",
    "Free, unlimited, no account",
  ],
  related: ["tiktok-mp3-downloader", "vt-tiktok-com-downloader", "tiktok-story-downloader"],
  guides: [
    { slug: "download-tiktok-without-logo-iphone-android", anchor: "TikTok without the logo on iPhone and Android" },
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "browser-vs-app-tiktok-downloaders-safety", anchor: "Browser downloaders vs APK apps" },
  ],
};
