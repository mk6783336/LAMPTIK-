import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Device intent: "download youtube video on iphone". The search is really
 * "where does the file go on iOS", so the page answers that concretely —
 * Safari → Files → Photos — instead of repeating the generic downloader copy.
 */
export const entry: SubTool = {
  slug: "youtube-video-download-iphone",
  platform: "youtube",
  title: "Download YouTube Video on iPhone - Save MP4 to Photos",
  socialTitle: "Download a YouTube Video on iPhone - Safari, Files, Then Photos",
  description:
    "Save a YouTube video on iPhone without an app: paste the link in Safari, download the MP4, then move it from Files to Photos in two taps. iOS 16 and later.",
  keywords: [
    "download youtube video iphone",
    "youtube downloader iphone",
    "save youtube video to photos",
    "youtube video to camera roll",
    "youtube mp4 iphone",
    "download youtube on ios",
  ],
  eyebrow: "YouTube on iPhone - no app, no Shortcut",
  h1Lead: "YouTube on iPhone.",
  h1Accent: "Into Photos, without an app.",
  lede:
    "iOS downloads files to the Files app, not straight to the camera roll — that is the whole confusion behind most 'downloader won't save' complaints. This page resolves the video in Safari, hands it to Files, and the two-tap move into Photos is spelled out below.",
  chips: ["Safari on iOS 16+", "Files, then Photos", "No Shortcut"],
  facts: [
    ["Browser", "Safari"],
    ["Lands in", "Files → Downloads"],
    ["Best format", "MP4 H.264"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the link in Safari and download",
      body:
        "Copy the video in the YouTube app (Share → Copy link), open this page in Safari and paste it. Choose Download HD MP4. Safari will show its download arrow in the address bar; the file is written to On My iPhone → Downloads. Chrome and Firefox on iOS hand the file to Files the same way.",
    },
    {
      title: "Move it into Photos",
      body:
        "Open Files, long-press the MP4, choose Share, then Save Video. It appears in Recents in Photos, plays from the gallery, and can go straight into an edit or a message. Audio-only downloads stay in Files because Photos does not index audio.",
    },
  ],
  faqs: [
    {
      question: "Why does the video save to Files instead of my camera roll?",
      answer:
        "iOS gives Safari a downloads folder, not gallery access. No website can write silently into Photos — that is an Apple restriction, not a missing feature. The download lands in Files → Downloads, and Share → Save Video copies it into Photos.",
    },
    {
      question: "Do I need the Shortcuts app or a profile installed?",
      answer:
        "No. There is no shortcut, configuration profile or enterprise certificate involved. Everything happens in Safari, which is why the tool keeps working after an iOS update.",
    },
    {
      question: "Does this work on iPad and iPod touch?",
      answer:
        "Yes, on any device running a modern Safari. On iPad the file lands in the same Files location and the Share sheet offers Save Video too.",
    },
    {
      question: "Why does Safari warn that the file may be dangerous?",
      answer:
        "Safari shows that prompt for any download it did not originate from the App Store, including MP4s. The response is served with attachment headers and an MP4 content type; choose Download to continue.",
    },
    {
      question: "Can I download over cellular data?",
      answer:
        "Yes, though a 1080p file can be tens of megabytes. The result panel shows the exact size before you tap, so you can drop to 720p or grab the audio only if data is tight.",
    },
  ],
  appName: "LAMP TIK YouTube Downloader for iPhone",
  features: [
    "Saves YouTube MP4 to Files on iOS, then Photos",
    "Up to 1080p where the upload exposes it",
    "Audio-only M4A or MP3 option",
    "No app, Shortcut or profile to install",
    "Works in Safari on iPhone and iPad",
  ],
  related: ["youtube-to-mp4-1080p", "youtube-to-mp3", "youtube-shorts-downloader"],
  guides: [
    { slug: "download-tiktok-without-logo-iphone-android", anchor: "Where files land on iPhone and Android" },
    { slug: "browser-vs-app-tiktok-downloaders-safety", anchor: "Why browser downloaders are safer" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Is downloading videos legal?" },
  ],
};
